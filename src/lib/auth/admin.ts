import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAdminClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    if (
      error.name === "AuthRetryableFetchError" ||
      error.status === 0 ||
      (typeof error.status === "number" && error.status >= 500)
    ) {
      throw new Error("Unable to verify the admin session with Supabase Auth.", {
        cause: error,
      });
    }
    return null;
  }

  const claims = data?.claims;
  if (claims?.app_metadata?.role !== "admin") {
    return null;
  }

  return claims;
}

export async function requireAdmin() {
  const claims = await getAdminClaims();
  if (!claims) {
    redirect("/admin/login");
  }

  return claims;
}
