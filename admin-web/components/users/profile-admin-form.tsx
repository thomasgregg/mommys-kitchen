import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateUserProfileAction } from "@/lib/actions/users";
import type { Profile, ProfileRole } from "@/lib/types/app";
import { cn } from "@/lib/utils";

const roles: ProfileRole[] = ["customer", "admin"];

export function ProfileAdminForm({
  profile,
  title = "Edit customer",
  description = "Update the customer record that the apps read from Postgres.",
  variant = "card",
  submitLabel = "Save profile",
}: {
  profile: Profile;
  title?: string;
  description?: string;
  variant?: "card" | "plain";
  submitLabel?: string;
}) {
  const compact = variant === "plain";

  return (
    <form
      action={updateUserProfileAction}
      className={cn(
        "flex flex-col gap-4",
        compact && "gap-4",
        !compact && "rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
      )}
    >
      {!compact ? (
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ) : null}

      <input type="hidden" name="id" value={profile.id} />

      <div className={cn("grid gap-4", compact && "sm:grid-cols-2 sm:items-start")}>
        <label className="grid gap-4">
          <span className="text-sm font-medium text-foreground">Full name</span>
          <Input name="fullName" defaultValue={profile.full_name ?? ""} placeholder="Customer name" className="h-9 rounded-xl bg-background" />
        </label>

        <label className="grid gap-4">
          <span className="text-sm font-medium text-foreground">Phone</span>
          <Input name="phone" defaultValue={profile.phone ?? ""} placeholder="+49 ..." className="h-9 rounded-xl bg-background" />
        </label>

        <label className={cn("grid gap-4", compact && "sm:col-span-2")}>
          <span className="text-sm font-medium text-foreground">Role</span>
          <SelectField
            name="role"
            defaultValue={profile.role}
            options={roles.map((role) => ({ value: role, label: role[0]?.toUpperCase() + role.slice(1) }))}
            className="h-9"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Role changes apply immediately.</p>
        <SubmitButton label={submitLabel} variant="outline" size="lg" className="h-10 min-w-44 rounded-xl px-5" />
      </div>
    </form>
  );
}
