## Vault: Password Generator + Secure Vault (MVP)

Fast, privacy-first vault with client-side encryption and a password generator.

### Tech
- Next.js App Router (TypeScript)
- MongoDB
- Web Crypto API (PBKDF2 + AES-GCM)

### Quick start
1. Copy env and set values:
```bash
cp .env.example .env
```
2. Install and run:
```bash
npm install
npm run dev
```
3. Open http://localhost:3000

### Flow
- Sign up → Unlock (derive key locally) → Add/list items.
- All vault fields are encrypted client-side; server stores ciphertext only.

### Crypto
- Derivation: PBKDF2(SHA-256, 210k iters) → AES-GCM-256 key (Web Crypto).
- Why: Web Crypto is native, audited, constant-time; AES-GCM gives integrity.

### Must-haves covered
- Generator with options and exclude look-alikes.
- Email/password auth with HTTP-only cookie.
- Vault items: title, username, password, URL, notes.
- Client-side encryption; DB/network never see plaintext.
- Copy-to-clipboard auto-clears after ~12s.
- Basic client-side search field (filtering UI-ready).

### Scripts
- `npm run dev` – start dev server
- `npm run build` – build
- `npm start` – serve production

### Deploy
Any Node host. Vercel works well. Ensure `MONGODB_URI` and `JWT_SECRET` are set.

### Notes
- Keep your master password safe; it is not recoverable.
- This is an MVP; for production, prefer per-field IVs and search via deterministic encryption or local index.
