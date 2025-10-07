import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getVaultCollection } from "@/lib/mongo";
import type { VaultItemDoc } from "@/lib/mongo";
import { ObjectId } from "mongodb";

const itemSchema = z.object({
  titleEncrypted: z.string(),
  titleIv: z.string(),
  usernameEncrypted: z.string(),
  usernameIv: z.string(),
  passwordEncrypted: z.string(),
  passwordIv: z.string(),
  urlEncrypted: z.string().optional(),
  urlIv: z.string().optional(),
  notesEncrypted: z.string().optional(),
  notesIv: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const col = await getVaultCollection();
  const docs = await col
    .find({ userId: new ObjectId(session.userId) })
    .project({ userId: 0 })
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const col = await getVaultCollection();
  const now = new Date();
  const doc: Omit<VaultItemDoc, "_id"> = {
    userId: new ObjectId(session.userId),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return NextResponse.json({ _id: String(insertedId) }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = itemSchema.extend({ _id: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { _id, ...rest } = parsed.data;
  const col = await getVaultCollection();
  await col.updateOne(
    { _id: new ObjectId(_id), userId: new ObjectId(session.userId) },
    { $set: { ...rest, updatedAt: new Date() } }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const col = await getVaultCollection();
  await col.deleteOne({ _id: new ObjectId(id), userId: new ObjectId(session.userId) });
  return NextResponse.json({ ok: true });
}
