"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signUpTenantAction } from "@/lib/actions/auth";

export function SignupForm({ error }: { error?: string }) {
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
          <CardTitle className="text-[2rem] font-semibold tracking-tight text-foreground">Create a family</CardTitle>
          <CardDescription className="text-sm">Set up your family kitchen and become the first admin.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-4">
        <form
          ref={formRef}
          action={signUpTenantAction}
          className="flex flex-col gap-3"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        >
          <div className="flex flex-col gap-2.5">
            <label htmlFor="tenantName" className="text-sm font-medium text-foreground">
              Family name
            </label>
            <Input id="tenantName" name="tenantName" required placeholder="The Smith Family" className="h-10 bg-background px-4" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Your name
              </label>
              <Input id="fullName" name="fullName" required placeholder="Peter" className="h-10 bg-background px-4" />
            </div>

            <div className="flex flex-col gap-2.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone
              </label>
              <Input id="phone" name="phone" placeholder="+49 ..." className="h-10 bg-background px-4" />
            </div>
          </div>

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
            <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" className="h-10 bg-background px-4" />
          </div>

          {safeError ? (
            <Alert variant="destructive">
              <AlertTitle>Setup failed</AlertTitle>
              <AlertDescription>{safeError}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" variant="outline" size="lg" className="w-full justify-center text-base">
            Create family
            <ArrowRight data-icon="inline-end" />
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Already have a family?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
