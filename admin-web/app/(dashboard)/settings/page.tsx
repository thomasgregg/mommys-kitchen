import { AppSettingsForm } from "@/components/settings/app-settings-form";
import { getAppSettings } from "@/lib/data/app-settings";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Choose the global currency and app language once, and let both the admin dashboard and customer app read them from the same backend setting.
        </p>
      </section>
      <AppSettingsForm settings={settings} />
    </div>
  );
}
