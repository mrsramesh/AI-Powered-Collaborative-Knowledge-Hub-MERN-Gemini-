"use client";
import { useEffect, useState } from "react";
import { useCrypto } from "@/lib/crypto-context";
import { useRouter } from "next/navigation";

export default function UnlockPage() {
  const [password, setPassword] = useState("");
  const { unlock } = useCrypto();
  const router = useRouter();
  const [salt, setSalt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) return;
      const j = await r.json();
      if (j.kdfSaltB64) setSalt(j.kdfSaltB64);
    });
  }, []);

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    await unlock(password, salt ?? undefined);
    router.push("/vault");
  }

  return (
    <div className="max-w-sm mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-4">Unlock</h1>
      <form onSubmit={onUnlock} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Master Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-black text-white py-2 rounded" type="submit">Unlock</button>
      </form>
      <p className="text-sm text-gray-500 mt-2">Master password is never sent to server; it derives a key locally.</p>
    </div>
  );
}
