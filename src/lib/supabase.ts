import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

// The app still works fully offline (localStorage only). Cloud features are
// gated behind `isSupabaseEnabled` so a missing config never crashes the app.
export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseEnabled) {
  console.warn(
    "Supabase env vars are missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
      "Cloud login and saved configs are disabled."
  );
}

// When disabled we still create a client with dummy values so imports don't
// break; every caller checks `isSupabaseEnabled` before touching it.
export const supabase = createClient(
  supabaseUrl ?? "http://localhost",
  supabaseAnonKey ?? "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
