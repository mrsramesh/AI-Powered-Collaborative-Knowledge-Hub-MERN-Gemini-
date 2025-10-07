import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsersCollection } from "@/lib/mongo";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false });
  const users = await getUsersCollection();
  const user = await users.findOne({ email: session.email });
  return NextResponse.json({ authenticated: true, user: session, kdfSaltB64: user?.kdfSaltB64 });
}
