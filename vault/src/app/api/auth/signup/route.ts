import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsersCollection } from "@/lib/mongo";
import type { UserDoc } from "@/lib/mongo";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { randomBytes } from "crypto";
import type { OptionalUnlessRequiredId } from "mongodb";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const users = await getUsersCollection();
  const existing = await users.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const kdfSaltB64 = randomBytes(16).toString("base64");
  const now = new Date();
  const doc: OptionalUnlessRequiredId<UserDoc> = { email, passwordHash, kdfSaltB64, createdAt: now, updatedAt: now };
  const { insertedId } = await users.insertOne(doc);
  await createSession({ userId: String(insertedId), email });
  return NextResponse.json({ ok: true });
}
