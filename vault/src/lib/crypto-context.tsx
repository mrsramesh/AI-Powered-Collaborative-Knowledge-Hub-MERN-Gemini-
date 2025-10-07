"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { deriveKeyFromPassword } from "./crypto-client";

interface CryptoContextValue {
  key: CryptoKey | null;
  saltB64: string | null;
  locked: boolean;
  unlock: (password: string, saltB64?: string) => Promise<void>;
  lock: () => void;
}

const CryptoContext = createContext<CryptoContextValue | undefined>(undefined);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [saltB64, setSaltB64] = useState<string | null>(null);

  const value = useMemo<CryptoContextValue>(() => ({
    key,
    saltB64,
    locked: !key,
    unlock: async (password: string, existingSaltB64?: string) => {
      const derived = await deriveKeyFromPassword(password, existingSaltB64);
      setKey(derived.key);
      setSaltB64(derived.saltB64);
    },
    lock: () => {
      setKey(null);
      setSaltB64(null);
    }
  }), [key, saltB64]);

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
}

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
}
