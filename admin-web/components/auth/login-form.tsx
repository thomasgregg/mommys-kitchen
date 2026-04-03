"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/lib/actions/auth";

export function LoginForm({ error, message }: { error?: string; message?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const safeError =
    typeof error === "string" && error.trim() && error !== "{}" && error !== "[object Object]"
      ? error
      : undefined;

  return (
    <Card className="mx-auto w-full max-w-md border-border/80 bg-card shadow-sm">
      <CardHeader className="gap-2 border-b border-border/70 px-4 py-4 text-center">
        <div className="flex w-full justify-center">
          <BrandMark className="!size-12" />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-[2rem] font-semibold tracking-tight text-foreground">Mommy&apos;s Kitchen Admin</CardTitle>
          <CardDescription className="text-sm">Sign in to continue to the dashboard.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-4">
        <form
          ref={formRef}
          action={signInAction}
          className="flex flex-col gap-3"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        >
          <div className="flex flex-col gap-2.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input id="email" name="email" type="email" required placeholder="name@example.com" className="h-10 bg-background px-4" />
          </div>

          <div className="flex flex-col gap-2.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input id="password" name="password" type="password" required placeholder="Enter your password" className="h-10 bg-background px-4" />
          </div>

          {safeError ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{safeError}</AlertDescription>
            </Alert>
          ) : null}

          {!safeError && message ? (
            <Alert>
              <AlertTitle>Ready to sign in</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" variant="outline" size="lg" className="w-full justify-center text-base">
            Sign in
            <ArrowRight data-icon="inline-end" />
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            New family?{" "}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create one
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
