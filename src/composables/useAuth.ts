import { ref } from "vue";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

// Shared, module-level auth state so every component sees the same session.
const session = ref<Session | null>(null);
const user = ref<User | null>(null);
const authReady = ref(false);

let initialized = false;

/**
 * Initialize auth state once and keep it in sync with Supabase. Safe to call
 * from multiple components; only the first call wires up the listener.
 */
const initAuth = () => {
  if (initialized || !isSupabaseEnabled) {
    authReady.value = true;
    return;
  }
  initialized = true;

  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session;
    user.value = data.session?.user ?? null;
    authReady.value = true;
  });

  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession;
    user.value = newSession?.user ?? null;
  });
};

/**
 * Start the Google OAuth flow. Redirects back to the current page (works for
 * both localhost dev and the GitHub Pages base path).
 */
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
};

const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export function useAuth() {
  initAuth();
  return {
    session,
    user,
    authReady,
    isSupabaseEnabled,
    signInWithGoogle,
    signOut,
  };
}
