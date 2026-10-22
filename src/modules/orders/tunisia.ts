// =============================================================================
// Tunisia-specific helpers: phone numbers and governorates
// =============================================================================

/**
 * Normalizes a Tunisian phone number to its 8 local digits.
 * Accepts "+216 98 123 456", "0021698123456", "98.123.456", Arabic-Indic digits…
 * Returns null when it is not a plausible Tunisian number.
 */
export function normalizePhone(raw: string): string | null {
  const latin = raw.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  let digits = latin.replace(/\D/g, "");
  if (digits.startsWith("00216")) digits = digits.slice(5);
  else if (digits.startsWith("216") && digits.length === 11) digits = digits.slice(3);
  // Mobile numbers start with 2, 4, 5 or 9; landlines with 3 or 7
  return /^[234579]\d{7}$/.test(digits) ? digits : null;
}

/** "98123456" -> "98 123 456" */
export function formatPhone(phone: string): string {
  return phone.length === 8 ? `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}` : phone;
}

/** wa.me needs the international number without "+" */
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/216${phone}?text=${encodeURIComponent(message)}`;
}

/** The 24 governorates; the English name is the stored key. */
export const GOVERNORATES = [
  { key: "Tunis", ar: "تونس" },
  { key: "Ariana", ar: "أريانة" },
  { key: "Ben Arous", ar: "بن عروس" },
  { key: "Manouba", ar: "منوبة" },
  { key: "Nabeul", ar: "نابل" },
  { key: "Zaghouan", ar: "زغوان" },
  { key: "Bizerte", ar: "بنزرت" },
  { key: "Beja", ar: "باجة" },
  { key: "Jendouba", ar: "جندوبة" },
  { key: "Kef", ar: "الكاف" },
  { key: "Siliana", ar: "سليانة" },
  { key: "Sousse", ar: "سوسة" },
  { key: "Monastir", ar: "المنستير" },
  { key: "Mahdia", ar: "المهدية" },
  { key: "Sfax", ar: "صفاقس" },
  { key: "Kairouan", ar: "القيروان" },
  { key: "Kasserine", ar: "القصرين" },
  { key: "Sidi Bouzid", ar: "سيدي بوزيد" },
  { key: "Gabes", ar: "قابس" },
  { key: "Medenine", ar: "مدنين" },
  { key: "Tataouine", ar: "تطاوين" },
  { key: "Gafsa", ar: "قفصة" },
  { key: "Tozeur", ar: "توزر" },
  { key: "Kebili", ar: "قبلي" },
] as const;

export const GOVERNORATE_KEYS: readonly string[] = GOVERNORATES.map((g) => g.key);

export function governorateLabel(key: string, language: "en" | "ar"): string {
  if (language === "en") return key;
  return GOVERNORATES.find((g) => g.key === key)?.ar ?? key;
}
