import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

type D1Binding = Parameters<typeof drizzle>[0];

export function createDb(binding: D1Binding) {
  return drizzle(binding, { schema });
}

function getBinding(): D1Binding {
  const env = getCloudflareContext().env as CloudflareEnv & { DB?: D1Binding };
  if (!env.DB) throw new Error('D1 database binding DB is unavailable.');
  return env.DB;
}

const binding = new Proxy({} as D1Binding, {
  get(_target, prop, receiver) {
    return Reflect.get(getBinding() as object, prop, receiver);
  },
});

export const db = createDb(binding);
export { schema };
export type DB = typeof db;
