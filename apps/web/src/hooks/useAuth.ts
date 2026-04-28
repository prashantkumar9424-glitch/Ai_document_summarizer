import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

function formatAuthError(message: string) {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Your email is not confirmed yet. Open the confirmation email from Supabase, then log in again. For local development, you can also disable Confirm email in your Supabase Auth email provider settings.";
  }

  return message;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
      } else {
        setError(null);
      }
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
      setIsLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      const message = formatAuthError(signInError.message);
      setError(message);
      throw new Error(message);
    }

    setSession(data.session);
    setIsLoading(false);
    setError(null);
  }

  async function signInWithPhone(phone: string, password: string) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ phone, password });
    if (signInError) {
      const message = formatAuthError(signInError.message);
      setError(message);
      throw new Error(message);
    }

    setSession(data.session);
    setIsLoading(false);
    setError(null);
  }

  async function signUp(email: string, password: string) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    if (signUpError) {
      const message = formatAuthError(signUpError.message);
      setError(message);
      throw new Error(message);
    }

    if (data.session) {
      setSession(data.session);
      setIsLoading(false);
    }
    setError(null);
    if (!data.session) {
      return "We sent a confirmation email to your inbox. Open that email and confirm your account before logging in.";
    }

    return "Your account is ready.";
  }

  async function signUpWithPhone(phone: string, password: string) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      phone,
      password
    });
    if (signUpError) {
      const message = formatAuthError(signUpError.message);
      setError(message);
      throw new Error(message);
    }

    if (data.session) {
      setSession(data.session);
      setIsLoading(false);
    }
    setError(null);
    if (!data.session) {
      return "Your phone signup was created. If phone verification is enabled in Supabase, complete the SMS verification step before logging in.";
    }

    return "Your phone account is ready.";
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      const message = formatAuthError(signOutError.message);
      setError(message);
      throw new Error(message);
    }

    setSession(null);
    setIsLoading(false);
    setError(null);
  }

  function clearError() {
    setError(null);
  }

  return {
    session,
    mode: (session ? "authenticated" : "guest") as "authenticated" | "guest",
    accessToken: session?.access_token ?? null,
    userEmail: session?.user.email ?? null,
    isLoading,
    error,
    signIn,
    signInWithPhone,
    signUp,
    signUpWithPhone,
    signOut,
    clearError,
    hasSupabase: Boolean(supabase)
  };
}
