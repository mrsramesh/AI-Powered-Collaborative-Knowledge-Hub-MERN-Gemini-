// Client-side crypto helpers using Web Crypto API
// Derivation: PBKDF2 from master password -> base key; then HKDF to derive encryption/auth keys if needed.

export interface DerivedKey {
  key: CryptoKey; // AES-GCM key
  saltB64: string; // salt for PBKDF2
}

export async function deriveKeyFromPassword(password: string, saltB64?: string): Promise<DerivedKey> {
  const salt = saltB64 ? base64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      // Explicitly pass ArrayBuffer to satisfy TS BufferSource
      salt: salt.buffer as ArrayBuffer,
      iterations: 210_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return { key: aesKey, saltB64: bytesToBase64(salt) };
}

export interface CipherResult {
  ciphertextB64: string;
  ivB64: string;
}

export async function encryptJson(obj: unknown, key: CryptoKey): Promise<CipherResult> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { ciphertextB64: bytesToBase64(new Uint8Array(ct)), ivB64: bytesToBase64(iv) };
}

export async function decryptJson<T>(ciphertextB64: string, ivB64: string, key: CryptoKey): Promise<T> {
  const iv = base64ToBytes(ivB64);
  const ct = base64ToBytes(ciphertextB64);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, ct.buffer as ArrayBuffer);
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
