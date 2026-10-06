import { createClient } from "@supabase/supabase-js";

const [requestedEmail] = process.argv.slice(2);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!requestedEmail || !supabaseUrl || !serviceRoleKey) {
  console.error(
    "Usage: npm run grant-admin -- <email>. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exitCode = 1;
} else {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let page = 1;
    let user = null;

    while (!user) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) {
        throw new Error("Unable to find the Supabase user.", { cause: error });
      }

      user = data.users.find(
        (candidate) =>
          candidate.email?.toLowerCase() === requestedEmail.toLowerCase(),
      );
      if (user || data.users.length < 1000) {
        break;
      }
      page += 1;
    }

    if (!user) {
      throw new Error(
        `No existing Supabase Auth user found for ${requestedEmail}. Create the account first, then retry.`,
      );
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, role: "admin" },
    });
    if (error) {
      throw new Error("Unable to grant admin role.", { cause: error });
    }

    console.info(`Granted admin role to ${user.email}. Sign in again to refresh the session.`);
  } catch (error) {
    console.error(
      "Admin role provisioning failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  }
}
