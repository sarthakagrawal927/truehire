import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __libsql__: Client | undefined;
}

function makeClient(): Client {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  return createClient({ url, authToken });
}

const client = globalThis.__libsql__ ?? makeClient();
if (process.env.NODE_ENV !== "production") globalThis.__libsql__ = client;

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
