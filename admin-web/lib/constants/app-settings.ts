export const currencyOptions = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
] as const;

export const languageOptions = [
  { value: "de", label: "Deutsch", localeIdentifier: "de-DE" },
  { value: "en", label: "English", localeIdentifier: "en-US" },
  { value: "fr", label: "Français", localeIdentifier: "fr-FR" },
  { value: "it", label: "Italiano", localeIdentifier: "it-IT" },
] as const;

export const defaultAppSettings = {
  singleton_key: "global" as const,
  currency_code: "EUR",
  language_code: "de",
  locale_identifier: "de-DE",
};

export function currencyOptionFor(code: string) {
  return currencyOptions.find((option) => option.value === code) ?? currencyOptions[0];
}

export function languageOptionFor(code: string) {
  return languageOptions.find((option) => option.value === code) ?? languageOptions[0];
}

export function localeIdentifierForLanguage(code: string) {
  return languageOptionFor(code).localeIdentifier;
}
