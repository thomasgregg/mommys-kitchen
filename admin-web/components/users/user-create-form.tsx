import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createUserAction } from "@/lib/actions/users";
import type { ProfileRole } from "@/lib/types/app";

const roles: ProfileRole[] = ["customer", "admin"];

export function UserCreateForm() {
  return (
    <form action={createUserAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <label className="grid gap-4 sm:col-span-2">
          <span className="text-sm font-medium text-foreground">Email</span>
          <Input
            name="email"
            type="email"
            required
            placeholder="child@example.com"
            className="h-9 rounded-xl bg-background"
          />
        </label>

        <label className="grid gap-4 sm:col-span-2">
          <span className="text-sm font-medium text-foreground">Temporary password</span>
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="h-9 rounded-xl bg-background"
          />
        </label>

        <label className="grid gap-4">
          <span className="text-sm font-medium text-foreground">Full name</span>
          <Input name="fullName" placeholder="Thomas" className="h-9 rounded-xl bg-background" />
        </label>

        <label className="grid gap-4">
          <span className="text-sm font-medium text-foreground">Phone</span>
          <Input name="phone" placeholder="+49 ..." className="h-9 rounded-xl bg-background" />
        </label>

        <label className="grid gap-4 sm:col-span-2">
          <span className="text-sm font-medium text-foreground">Role</span>
          <SelectField
            name="role"
            defaultValue="customer"
            options={roles.map((role) => ({ value: role, label: role[0]?.toUpperCase() + role.slice(1) }))}
            className="h-9"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          The auth account is created immediately. Notifications only start once the user signs into an iPhone app.
        </p>
        <SubmitButton label="Create user" variant="outline" size="lg" className="h-10 min-w-44 rounded-xl px-5" />
      </div>
    </form>
  );
}
