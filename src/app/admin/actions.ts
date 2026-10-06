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

export interface EditEntryActionState {
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

export async function updateEntryDetails(
  _previousState: EditEntryActionState,
  formData: FormData,
): Promise<EditEntryActionState> {
  const idValue = formData.get("id");
  const titleValue = formData.get("title");
  const urlValue = formData.get("original_url");

  if (
    typeof idValue !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idValue,
    ) ||
    typeof titleValue !== "string" ||
    typeof urlValue !== "string"
  ) {
    return { error: "Invalid article details. Refresh the queue and try again.", success: null };
  }

  const title = titleValue.trim();
  const originalUrl = urlValue.trim();
  if (title.length === 0 || title.length > 500) {
    return { error: "Title must be between 1 and 500 characters.", success: null };
  }
  if (originalUrl.length === 0 || originalUrl.length > 2048) {
    return { error: "Source URL must be between 1 and 2048 characters.", success: null };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(originalUrl);
  } catch {
    return { error: "Enter a valid source URL.", success: null };
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { error: "Source URL must use HTTP or HTTPS.", success: null };
  }

  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .update({ title, original_url: parsedUrl.toString() })
    .eq("id", idValue)
    .in("status", ["pending", "published"])
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Another entry already uses that source URL.",
        success: null,
      };
    }
    throw new Error("Unable to save the article edits in Supabase.", {
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
  revalidatePath("/");
  return { error: null, success: "Article details saved." };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Unable to sign out of the admin portal.", { cause: error });
  }

  redirect("/admin/login");
}
