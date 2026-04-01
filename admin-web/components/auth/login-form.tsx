import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/lib/actions/auth";

export function LoginForm({ error }: { error?: string }) {
  return (
    <Card className="mx-auto w-full max-w-lg border-border/80 bg-card shadow-sm">
      <CardHeader className="gap-3 border-b border-border/70 px-5 py-6 text-center">
        <div className="flex w-full justify-center">
          <BrandMark className="!size-14" />
        </div>
        <div className="flex flex-col gap-2">
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">Mommy&apos;s Kitchen Admin</CardTitle>
          <CardDescription className="text-sm">Sign in to continue to the dashboard.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-6">
        <form action={signInAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input id="email" name="email" type="email" required placeholder="name@example.com" className="h-11 bg-background px-4" />
          </div>

          <div className="flex flex-col gap-2.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input id="password" name="password" type="password" required placeholder="Enter your password" className="h-11 bg-background px-4" />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" variant="outline" size="lg" className="mt-1 w-full justify-center text-base">
            Sign in
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
