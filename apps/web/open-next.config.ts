import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Minimal OpenNext config — ships Next as a Worker using the built-in
 * in-memory incremental cache. Swap in KV / R2 cache adapters once we
 * have ISR content worth persisting.
 */
export default defineCloudflareConfig({});
