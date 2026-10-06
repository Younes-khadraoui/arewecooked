import { requireAdmin } from "@/lib/auth/admin";

export const metadata = {
  title: "Admin — Are We Cooked Yet?",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const claims = await requireAdmin();

  return (
    <section className="py-12">
      <p className="m-0 text-[10px] font-bold tracking-[0.14em] text-subtle">
        ADMIN PORTAL
      </p>
      <h1 className="mb-0 mt-3 text-3xl font-semibold tracking-[-0.055em]">
        You’re signed in.
      </h1>
      <p className="mb-0 mt-3 text-sm text-muted-foreground">
        Admin access verified
        {claims.email ? ` for ${claims.email}` : ""}. The moderation queue will
        be added in a later feature.
      </p>
    </section>
  );
}
