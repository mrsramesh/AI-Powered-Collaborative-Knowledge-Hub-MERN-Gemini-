export interface GeneratorOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean; // exclude 0O1lI
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude I O
const LOWER = "abcdefghijkmnopqrstuvwxyz"; // exclude l
const NUM = "23456789"; // exclude 0 1
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";

export function generatePassword(opts: GeneratorOptions): string {
  let alphabet = "";
  if (opts.upper) alphabet += UPPER;
  if (opts.lower) alphabet += LOWER;
  if (opts.numbers) alphabet += opts.excludeSimilar ? NUM : "0123456789";
  if (opts.symbols) alphabet += SYMBOLS;
  if (!alphabet) throw new Error("No character sets selected");
  if (opts.excludeSimilar) {
    alphabet = alphabet.replace(/[OIl10]/g, "");
  }
  const bytes = new Uint8Array(opts.length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
