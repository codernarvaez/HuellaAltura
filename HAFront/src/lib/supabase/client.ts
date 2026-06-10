import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Configura PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en HAFront/.env"
    );
  }

  return createBrowserClient(url, key);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.PUBLIC_SUPABASE_URL &&
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );
}
