import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { signOut } from "@/app/admin/actions";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1120px] px-5 sm:px-6">
      <header className="flex min-h-[82px] items-center justify-between border-b border-border">
        <Link
          className="text-sm font-semibold tracking-[-0.025em] text-foreground"
          href="/admin"
        >
          Editorial workspace
        </Link>
        <form action={signOut}>
          <button
            className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>
      {children}
    </main>
  );
}
