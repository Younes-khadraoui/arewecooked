"use client";

import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="admin-email"
        >
          Email
        </label>
        <input
          autoComplete="username"
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          id="admin-email"
          maxLength={320}
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="admin-password"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          id="admin-password"
          maxLength={1024}
          name="password"
          required
          type="password"
        />
      </div>

      {state.error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button className="h-11 w-full" disabled={isPending} type="submit">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
