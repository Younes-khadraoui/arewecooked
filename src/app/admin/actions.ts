"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error: string | null;
}

export async function signIn(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string" ||
    emailValue.trim().length === 0 ||
    emailValue.length > 320 ||
    passwordValue.length === 0 ||
    passwordValue.length > 1024
  ) {
    return { error: "Enter a valid email address and password." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: emailValue.trim(),
    password: passwordValue,
  });

  if (signInError) {
    if (
      signInError.name === "AuthRetryableFetchError" ||
      signInError.status === 0 ||
      (typeof signInError.status === "number" && signInError.status >= 500)
    ) {
      throw new Error("Supabase Auth could not complete the sign-in request.", {
        cause: signInError,
      });
    }
    return { error: "Sign-in failed. Check your credentials and try again." };
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    throw new Error("Unable to verify the signed-in account.", {
      cause: claimsError,
    });
  }

  if (data?.claims.app_metadata?.role !== "admin") {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw new Error("Unable to end a non-admin Supabase session.", {
        cause: signOutError,
      });
    }
    return { error: "Sign-in failed. Check your credentials and try again." };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Unable to sign out of the admin portal.", { cause: error });
  }

  redirect("/admin/login");
}
