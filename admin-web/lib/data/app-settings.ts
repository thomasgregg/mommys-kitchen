import { cache } from "react";
import { defaultAppSettings } from "@/lib/constants/app-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppSettings } from "@/lib/types/app";

export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("singleton_key, currency_code, language_code, locale_identifier")
    .eq("singleton_key", "global")
    .maybeSingle<AppSettings>();

  return data ?? defaultAppSettings;
});
