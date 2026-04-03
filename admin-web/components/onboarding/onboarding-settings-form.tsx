"use client";

import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { currencyOptions, languageOptions, localeIdentifierForLanguage } from "@/lib/constants/app-settings";
import { updateOnboardingSettingsAction } from "@/lib/actions/onboarding";
import type { AppSettings } from "@/lib/types/app";

export function OnboardingSettingsForm({ settings }: { settings: AppSettings }) {
  const [currencyCode, setCurrencyCode] = useState(settings.currency_code);
  const [languageCode, setLanguageCode] = useState(settings.language_code);
  const localeIdentifier = localeIdentifierForLanguage(languageCode);

  return (
    <form action={updateOnboardingSettingsAction} className="flex flex-col gap-4">
      <label className="space-y-2.5">
        <span className="text-sm font-medium text-foreground">Display currency</span>
        <SettingsSelect
          value={currencyCode}
          onValueChange={(value) => setCurrencyCode(value ?? "")}
          options={currencyOptions.map((option) => ({ value: option.value, label: option.label }))}
        />
        <input type="hidden" name="currencyCode" value={currencyCode} />
      </label>

      <label className="space-y-2.5">
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

      <div className="rounded-xl border border-border/70 bg-background px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Formatting locale</p>
        <p className="text-muted-foreground">{localeIdentifier}</p>
      </div>

      <div className="flex justify-end border-t border-border/70 pt-2.5">
        <SubmitButton label="Save and continue" variant="outline" size="lg" className="h-10 min-w-44 rounded-xl px-5" />
      </div>
    </form>
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
