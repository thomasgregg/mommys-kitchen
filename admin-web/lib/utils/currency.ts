import { defaultAppSettings } from "@/lib/constants/app-settings";
import type { AppSettings } from "@/lib/types/app";

export function formatCurrency(
  cents: number,
  settings: Pick<AppSettings, "currency_code" | "locale_identifier"> = defaultAppSettings
) {
  return new Intl.NumberFormat(settings.locale_identifier, {
    style: "currency",
    currency: settings.currency_code,
  }).format(cents / 100);
}

export function formatDate(
  value: string | null,
  settings: Pick<AppSettings, "locale_identifier"> = defaultAppSettings
) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(settings.locale_identifier, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDurationMinutes(value: number | null) {
  if (value == null) return "-";
  if (value < 60) return `${value} min`;

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}
