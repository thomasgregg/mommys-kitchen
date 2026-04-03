"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { currencyOptions, languageOptions, localeIdentifierForLanguage } from "@/lib/constants/app-settings";
import type { AppSettings } from "@/lib/types/app";
import { updateAppSettingsAction } from "@/lib/actions/settings";

export function AppSettingsForm({ settings }: { settings: AppSettings }) {
  const [currencyCode, setCurrencyCode] = useState(settings.currency_code);
  const [languageCode, setLanguageCode] = useState(settings.language_code);
  const localeIdentifier = localeIdentifierForLanguage(languageCode);

  return (
    <div>
      <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Settings2 className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Localization</h2>
              <p className="text-sm text-muted-foreground">
                Set currency and language separately. Formatting follows the selected app language.
              </p>
            </div>
          </div>
        </div>

        <form action={updateAppSettingsAction} className="grid gap-4 px-4 py-4">
          <label className="space-y-4">
            <span className="text-sm font-medium text-foreground">Display currency</span>
            <SettingsSelect
              value={currencyCode}
              onValueChange={(value) => setCurrencyCode(value ?? "")}
              options={currencyOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <input type="hidden" name="currencyCode" value={currencyCode} />
          </label>

          <label className="space-y-4">
            <span className="text-sm font-medium text-foreground">App language</span>
            <SettingsSelect
              value={languageCode}
              onValueChange={(value) => setLanguageCode(value ?? "")}
              options={languageOptions.map((option) => ({
                value: option.value,
                label: `${option.label} · ${option.localeIdentifier}`,
              }))}
            />
            <input type="hidden" name="languageCode" value={languageCode} />
          </label>

          <div className="rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm">
            <div>
              <p className="font-medium text-foreground">Formatting locale</p>
              <p className="text-muted-foreground">{localeIdentifier}</p>
            </div>
          </div>

          <div className="flex justify-end border-t border-border/60 pt-4">
            <SubmitButton label="Save settings" variant="outline" size="lg" className="h-11 min-w-44 rounded-xl px-5" />
          </div>
        </form>
      </section>
    </div>
  );
}

function SettingsSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (value: string | null) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-10 w-full">
        <span className="flex flex-1 items-center text-left">{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
