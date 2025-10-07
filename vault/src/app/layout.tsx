import type { Metadata } from "next";
import "./globals.css";
import { CryptoProvider } from "@/lib/crypto-context";

export const metadata: Metadata = {
  title: "Vault",
  description: "Password generator + secure vault",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CryptoProvider>{children}</CryptoProvider>
      </body>
    </html>
  );
}
