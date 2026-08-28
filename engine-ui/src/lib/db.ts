import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Lazy singleton — constructing the client at module scope runs it before
// React mounts, which crashes the page on Cloudflare Pages if env vars
// aren't ready yet. Call getDb() from inside an effect/handler instead.
export function getDb(): SupabaseClient {
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
