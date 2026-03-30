import { ArrowRight, ChefHat, ShieldCheck, TimerReset } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signInAction } from "@/lib/actions/auth";

const highlights = [
  {
    title: "Queue first",
    body: "Accept, prepare, and complete orders without leaving the main workflow.",
    icon: ChefHat,
  },
  {
    title: "Role controlled",
    body: "Admin-only actions stay protected through Supabase auth and server checks.",
    icon: ShieldCheck,
  },
  {
    title: "Realtime aware",
    body: "Kitchen staff always works from the same backend state as the customer app.",
    icon: TimerReset,
  },
];

export function LoginForm({ error }: { error?: string }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.8fr] xl:items-center">
      <Card className="border-border/70 bg-card/85 shadow-sm">
        <CardHeader className="gap-4 border-b border-border/70">
          <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
            Staff access only
          </Badge>
          <div className="flex flex-col gap-2">
            <CardTitle className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Operate Mommy&apos;s Kitchen from one calm control room.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Review incoming orders, keep the menu current, manage customer roles, and monitor kitchen performance over time.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} size="sm" className="border-border/70 bg-background/70 shadow-none">
                <CardContent className="flex h-full flex-col gap-3 pt-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="gap-2 border-b border-border/70">
          <Badge variant="secondary" className="w-fit">
            Admin sign in
          </Badge>
          <CardTitle className="text-2xl font-semibold tracking-tight">Open the dashboard</CardTitle>
          <CardDescription>
            Use the kitchen admin account to access orders, menu controls, categories, and customer roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-6">
          <form action={signInAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="admin@mommyskitchen.local" className="h-11 bg-background" />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" className="h-11 bg-background" />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" size="lg" className="w-full">
              Sign in to dashboard
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>

          <Separator />

          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Test admin account: <span className="font-medium text-foreground">admin@mommyskitchen.local</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
