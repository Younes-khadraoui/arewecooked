"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error: string | null;
}

export interface ModerationActionState {
  error: string | null;
  success: string | null;
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

export async function moderateEntry(
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const id = formData.get("id");
  const decision = formData.get("decision");

  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    (decision !== "published" && decision !== "rejected")
  ) {
    return { error: "Invalid review action. Refresh the queue and try again.", success: null };
  }

  const claims = await requireAdmin();
  if (typeof claims.sub !== "string") {
    throw new Error("The authenticated admin session did not contain a user ID.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .update({
      status: decision,
      reviewed_by: claims.sub,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to update the review status in Supabase.", {
      cause: error,
    });
  }

  if (!data) {
    return {
      error: "This entry was already reviewed or removed. Refresh the queue.",
      success: null,
    };
  }

  revalidatePath("/admin");
  return {
    error: null,
    success: decision === "published" ? "Entry approved." : "Entry rejected.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Unable to sign out of the admin portal.", { cause: error });
  }

  redirect("/admin/login");
}
