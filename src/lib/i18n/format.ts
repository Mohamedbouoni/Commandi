// =============================================================================
// Formatting helpers for translated strings, dates and TND prices
// =============================================================================

import type { Language } from "./translations";

/** Replaces {placeholders} in a translated string. */
export function fmt(template: string | undefined, vars: Record<string, string | number>): string {
  return (template ?? "").replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export function locale(language: Language): string {
  return language === "ar" ? "ar-TN" : "en-GB";
}

export function formatDate(
  value: string | Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  return new Intl.DateTimeFormat(locale(language), options).format(new Date(value));
}

/** 19000 millimes -> "19 TND" / "19 د.ت" */
export function formatTnd(millimes: number, currencyLabel: string): string {
  const amount = millimes / 1000;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(3)} ${currencyLabel}`;
}

/** YYYY-MM-DD in local time (for planned_date) */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
