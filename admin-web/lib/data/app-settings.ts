import { cache } from "react";
import { defaultAppSettings } from "@/lib/constants/app-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppSettings } from "@/lib/types/app";

type TenantSettingsRow = Omit<AppSettings, "singleton_key">;

export const getAppSettings = cache(async (tenantId?: string): Promise<AppSettings> => {
  const supabase = await createSupabaseServerClient();
  if (tenantId) {
    const { data: tenantSettings } = await supabase
      .from("tenant_settings")
      .select("currency_code, language_code, locale_identifier")
      .eq("tenant_id", tenantId)
      .maybeSingle<TenantSettingsRow>();

    if (tenantSettings) {
      return {
        singleton_key: "global",
        ...tenantSettings,
      };
    }
  }

  const { data } = await supabase
    .from("app_settings")
    .select("singleton_key, currency_code, language_code, locale_identifier")
    .eq("singleton_key", "global")
    .maybeSingle<AppSettings>();

  return data ?? defaultAppSettings;
});
