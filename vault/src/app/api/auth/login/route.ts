import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getUsersCollection } from "@/lib/mongo";
import { createSession } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const users = await getUsersCollection();
  const user = await users.findOne({ email });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  await createSession({ userId: String(user._id), email });
  return NextResponse.json({ ok: true });
}
