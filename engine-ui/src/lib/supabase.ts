import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Lazy singleton — never construct the client at module scope. Doing so
// runs createClient() during import (before React mounts), which previously
// caused a blank-page crash on Cloudflare Pages if the env vars weren't
// ready. Call getSupabase() from inside a hook/effect instead.
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
