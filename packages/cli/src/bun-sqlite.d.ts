// Minimal ambient types for Bun's built-in SQLite. Only the surface the Cursor
// adapter uses; the import is guarded by a `typeof Bun` check and never runs
// under Node. Avoids depending on the full @types/bun package.
declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string, options?: { readonly?: boolean });
    prepare(sql: string): { get: (...params: unknown[]) => Record<string, unknown> | undefined };
    close(): void;
  }
}
