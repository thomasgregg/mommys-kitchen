import { AppSettingsForm } from "@/components/settings/app-settings-form";
import { getAppSettings } from "@/lib/data/app-settings";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function SettingsPage() {
  const { profile, tenant } = await requireAdmin();
  const settings = await getAppSettings(profile.tenant_id);

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Choose the currency and app language for this family once, and let both the admin dashboard and customer app read them from the same backend setting.
        </p>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="font-semibold text-foreground">Family</h2>
        </div>
        <div className="grid gap-2.5 px-4 py-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">Family name</p>
            <p className="mt-1 font-medium text-foreground">{tenant.name}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">Tenant slug</p>
            <p className="mt-1 font-medium text-foreground">{tenant.slug}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="mt-1 font-medium text-foreground capitalize">{tenant.status}</p>
          </div>
        </div>
      </section>
      <AppSettingsForm settings={settings} />
    </div>
  );
}
