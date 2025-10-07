"use client";
import { useEffect, useMemo, useState } from "react";
import { useCrypto } from "@/lib/crypto-context";
import { encryptJson, decryptJson } from "@/lib/crypto-client";
import { generatePassword } from "@/lib/password-generator";

interface VaultPlainItem {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
}

interface VaultDbItem {
  _id: string;
  titleEncrypted: string;
  titleIv: string;
  usernameEncrypted: string;
  usernameIv: string;
  passwordEncrypted: string;
  passwordIv: string;
  urlEncrypted?: string;
  urlIv?: string;
  notesEncrypted?: string;
  notesIv?: string;
}

export default function VaultPage() {
  const { key } = useCrypto();
  const [items, setItems] = useState<VaultDbItem[]>([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<VaultPlainItem>({ title: "", username: "", password: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, { title?: string; username?: string }>>({});

  // generator options
  const [length, setLength] = useState<number>(16);
  const [optUpper, setOptUpper] = useState(true);
  const [optLower, setOptLower] = useState(true);
  const [optNumbers, setOptNumbers] = useState(true);
  const [optSymbols, setOptSymbols] = useState(true);
  const [optExcludeSimilar, setOptExcludeSimilar] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/vault");
      if (res.ok) setItems(await res.json());
    })();
  }, []);

  useEffect(() => {
    if (!key) {
      setPreview({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        items.map(async (it) => {
          try {
            const t = await decryptJson<{ title: string }>(it.titleEncrypted, it.titleIv, key);
            const u = await decryptJson<{ username: string }>(it.usernameEncrypted, it.usernameIv, key);
            return [it._id, { title: t.title, username: u.username }] as const;
          } catch {
            return [it._id, {}] as const;
          }
        })
      );
      if (!cancelled) {
        setPreview(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, key]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return items;
    const f = filter.toLowerCase();
    if (!key) return items.filter((it) => it._id.toLowerCase().includes(f));
    return items.filter((it) => {
      const p = preview[it._id];
      const title = p?.title?.toLowerCase() || "";
      const username = p?.username?.toLowerCase() || "";
      return title.includes(f) || username.includes(f);
    });
  }, [items, filter, key, preview]);

  async function upsertItem() {
    if (!key) return alert("Unlock first");
    const payload = await toEncryptedPayload(form, key);
    if (editingId) {
      const res = await fetch("/api/vault", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _id: editingId, ...payload }) });
      if (res.ok) {
        setItems((prev) => prev.map((it) => (it._id === editingId ? ({ ...it, ...payload } as VaultDbItem) : it)));
        resetForm();
      }
    } else {
      const res = await fetch("/api/vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const j: { _id: string } = await res.json();
        const newItem: VaultDbItem = {
          _id: j._id,
          titleEncrypted: payload.titleEncrypted,
          titleIv: payload.titleIv,
          usernameEncrypted: payload.usernameEncrypted,
          usernameIv: payload.usernameIv,
          passwordEncrypted: payload.passwordEncrypted,
          passwordIv: payload.passwordIv,
          urlEncrypted: payload.urlEncrypted,
          urlIv: payload.urlIv,
          notesEncrypted: payload.notesEncrypted,
          notesIv: payload.notesIv,
        };
        setItems((prev) => [newItem, ...prev]);
        resetForm();
      }
    }
  }

  function resetForm() {
    setForm({ title: "", username: "", password: "", url: "", notes: "" });
    setEditingId(null);
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/vault?id=${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i._id !== id));
  }

  async function copyPassword(it: VaultDbItem) {
    if (!key) return alert("Unlock first");
    const { password } = await decryptJson<VaultPlainItem> (it.passwordEncrypted, it.passwordIv, key);
    await navigator.clipboard.writeText(password);
    setCopiedId(it._id);
    setTimeout(async () => {
      const cur = await navigator.clipboard.readText();
      if (cur === password) await navigator.clipboard.writeText("");
      setCopiedId(null);
    }, 12000);
  }

  async function startEdit(it: VaultDbItem) {
    setEditingId(it._id);
    if (!key) return;
    try {
      const [t, u, p, url, notes] = await Promise.all([
        decryptJson<{ title: string }>(it.titleEncrypted, it.titleIv, key),
        decryptJson<{ username: string }>(it.usernameEncrypted, it.usernameIv, key),
        decryptJson<{ password: string }>(it.passwordEncrypted, it.passwordIv, key),
        it.urlEncrypted && it.urlIv ? decryptJson<{ url: string }>(it.urlEncrypted, it.urlIv, key) : Promise.resolve(null),
        it.notesEncrypted && it.notesIv ? decryptJson<{ notes: string }>(it.notesEncrypted, it.notesIv, key) : Promise.resolve(null),
      ]);
      setForm({
        title: t.title,
        username: u.username,
        password: p.password,
        url: url?.url,
        notes: notes?.notes,
      });
    } catch {}
  }

  function gen() {
    const pwd = generatePassword({
      length,
      upper: optUpper,
      lower: optLower,
      numbers: optNumbers,
      symbols: optSymbols,
      excludeSimilar: optExcludeSimilar,
    });
    setForm((f) => ({ ...f, password: pwd }));
  }

  return (
    <div className="max-w-5xl mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your Vault</h1>
        <div className="flex gap-2 items-center">
          <input className="border p-2 rounded" placeholder="Search (client-side)" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <a className="underline" href="/unlock">Unlock</a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded p-4 space-y-3">
          <h2 className="font-medium">Add / Edit Item</h2>
          <div className="grid gap-2">
            <input className="border p-2 rounded" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="border p-2 rounded" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <div className="flex gap-2">
              <input className="border p-2 rounded w-full" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button className="px-3 border rounded" onClick={gen} type="button">Generate</button>
            </div>
            <div className="border rounded p-2 space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <label className="w-24">Length</label>
                <input type="range" min={8} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="flex-1" />
                <span className="w-8 text-right">{length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={optUpper} onChange={(e) => setOptUpper(e.target.checked)} /> Uppercase</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={optLower} onChange={(e) => setOptLower(e.target.checked)} /> Lowercase</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={optNumbers} onChange={(e) => setOptNumbers(e.target.checked)} /> Numbers</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={optSymbols} onChange={(e) => setOptSymbols(e.target.checked)} /> Symbols</label>
                <label className="flex items-center gap-2 col-span-2"><input type="checkbox" checked={optExcludeSimilar} onChange={(e) => setOptExcludeSimilar(e.target.checked)} /> Exclude look-alikes (0/O, 1/l/I)</label>
              </div>
            </div>
            <input className="border p-2 rounded" placeholder="URL" value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <textarea className="border p-2 rounded" placeholder="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2">
              <button className="bg-black text-white px-4 py-2 rounded" onClick={upsertItem} type="button">{editingId ? "Save" : "Add"}</button>
              {editingId && <button className="border px-4 py-2 rounded" type="button" onClick={resetForm}>Cancel</button>}
            </div>
          </div>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-medium mb-3">Items</h2>
          <ul className="divide-y">
            {filtered.map((it) => (
              <li key={it._id} className="py-3 flex items-center justify-between">
                <span className="truncate text-sm">{preview[it._id]?.title || it._id}</span>
                <div className="flex gap-2">
                  <button className="border px-2 py-1 rounded" onClick={() => copyPassword(it)}>{copiedId === it._id ? "Copied" : "Copy"}</button>
                  <button className="border px-2 py-1 rounded" onClick={() => setEditingId(it._id)}>Edit</button>
                  <button className="border px-2 py-1 rounded" onClick={() => deleteItem(it._id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

async function toEncryptedPayload(plain: VaultPlainItem, key: CryptoKey) {
  const [title, username, password, url, notes] = await Promise.all([
    encryptJson({ title: plain.title }, key),
    encryptJson({ username: plain.username }, key),
    encryptJson({ password: plain.password }, key),
    plain.url ? encryptJson({ url: plain.url }, key) : null,
    plain.notes ? encryptJson({ notes: plain.notes }, key) : null,
  ]);
  return {
    titleEncrypted: title.ciphertextB64,
    titleIv: title.ivB64,
    usernameEncrypted: username.ciphertextB64,
    usernameIv: username.ivB64,
    passwordEncrypted: password.ciphertextB64,
    passwordIv: password.ivB64,
    urlEncrypted: url?.ciphertextB64,
    urlIv: url?.ivB64,
    notesEncrypted: notes?.ciphertextB64,
    notesIv: notes?.ivB64,
  };
}
