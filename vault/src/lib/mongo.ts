import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { getEnv } from "./env";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const { MONGODB_URI } = getEnv();
  const client = cachedClient ?? new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
  });
  if (!cachedClient) {
    await client.connect();
    cachedClient = client;
  }
  cachedDb = client.db();
  return cachedDb;
}

export interface UserDoc {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  kdfSaltB64: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultItemDoc {
  _id?: ObjectId;
  userId: ObjectId;
  titleEncrypted: string;
  titleIv: string;
  usernameEncrypted: string;
  usernameIv: string;
  passwordEncrypted: string;
  passwordIv: string;
  urlEncrypted?: string;
  urlIv?: string;
  notesEncrypted?: string;
  notesIv?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await getDb();
  const col = db.collection<UserDoc>("users");
  await col.createIndex({ email: 1 }, { unique: true });
  return col;
}

export async function getVaultCollection(): Promise<Collection<VaultItemDoc>> {
  const db = await getDb();
  const col = db.collection<VaultItemDoc>("vault_items");
  await col.createIndex({ userId: 1, createdAt: 1 });
  return col;
}
