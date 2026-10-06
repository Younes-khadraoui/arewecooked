const [requestedEmail] = process.argv.slice(2);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

async function requestAdminApi(path, options = {}) {
  const response = await fetch(new URL(`/auth/v1/admin${path}`, supabaseUrl), {
    ...options,
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      if (isRecord(body) && typeof body.message === "string") {
        detail = `: ${body.message}`;
      } else if (isRecord(body) && typeof body.msg === "string") {
        detail = `: ${body.msg}`;
      }
    } catch {
      detail = "";
    }
    throw new Error(`Supabase Auth Admin returned HTTP ${response.status}${detail}`);
  }

  return response;
}

if (!requestedEmail || !supabaseUrl || !secretKey) {
  console.error(
    "Usage: npm run grant-admin -- <email>. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (an sb_secret_… or legacy service_role key) in .env.local.",
  );
  process.exitCode = 1;
} else {
  try {
    const projectUrl = new URL(supabaseUrl);
    if (
      projectUrl.protocol !== "https:" &&
      projectUrl.hostname !== "localhost" &&
      projectUrl.hostname !== "127.0.0.1"
    ) {
      throw new Error("The Supabase project URL must use HTTPS.");
    }

    const normalizedEmail = requestedEmail.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length > 320) {
      throw new Error("Provide a valid email address.");
    }

    let page = 1;
    let user = null;

    while (!user) {
      const query = new URLSearchParams({
        page: String(page),
        per_page: "1000",
      });
      const response = await requestAdminApi(`/users?${query}`);
      const result = await response.json();

      if (!isRecord(result) || !Array.isArray(result.users)) {
        throw new Error("Supabase returned an invalid user-list response.");
      }

      user = result.users.find(
        (candidate) =>
          isRecord(candidate) &&
          typeof candidate.email === "string" &&
          candidate.email.toLowerCase() === normalizedEmail,
      );

      if (user || result.users.length < 1000) {
        break;
      }
      page += 1;
    }

    if (!user || !isRecord(user) || typeof user.id !== "string") {
      throw new Error(
        `No existing Supabase Auth user found for ${normalizedEmail}. Create the account first, then retry.`,
      );
    }

    const appMetadata = isRecord(user.app_metadata) ? user.app_metadata : {};
    const userPath = `/users/${encodeURIComponent(user.id)}`;
    await requestAdminApi(userPath, {
      method: "PUT",
      body: JSON.stringify({
        app_metadata: { ...appMetadata, role: "admin" },
      }),
    });

    console.info(
      `Granted admin role to ${normalizedEmail}. Sign in again to refresh the session.`,
    );
  } catch (error) {
    console.error(
      "Admin role provisioning failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  }
}
