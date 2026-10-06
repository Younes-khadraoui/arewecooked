import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/admin/login/login-form";
import { getAdminClaims } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Admin sign in — Are We Cooked?",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const claims = await getAdminClaims();
  if (claims) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-5 sm:px-6">
      <header className="flex min-h-[82px] items-center border-b border-border">
        <Link
          className="text-sm font-semibold tracking-[-0.025em] text-foreground"
          href="/"
        >
          Are We Cooked?
        </Link>
      </header>
      <section className="mx-auto my-auto w-full max-w-[420px] py-14">
        <p className="m-0 text-[10px] font-bold tracking-[0.14em] text-subtle">
          EDITORIAL WORKSPACE
        </p>
        <h1 className="mb-0 mt-3 text-3xl font-semibold tracking-[-0.055em]">
          Admin sign in
        </h1>
        <p className="mb-0 mt-3 text-sm leading-6 text-muted-foreground">
          Sign in with an account provisioned for editorial administration.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
