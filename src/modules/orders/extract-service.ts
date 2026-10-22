// =============================================================================
// Order Extraction — turns a pasted Messenger/Instagram/WhatsApp chat into a
// draft order the seller reviews before saving.
// =============================================================================

import { z } from "zod";
import { getAIProvider } from "@/modules/ai/provider-factory";
import { GOVERNORATE_KEYS, normalizePhone } from "./tunisia";
import type { OrderItem, Product } from "./schemas";

export const extractRequestSchema = z.object({
  chat: z.string().trim().min(5).max(6000),
});

// What the model returns. Prices are in dinars here (models handle decimals
// better than millimes) and converted below.
const modelOutputSchema = z.object({
  customerName: z.string().default(""),
  phone: z.string().default(""),
  governorate: z.string().default(""),
  address: z.string().default(""),
  items: z
    .array(
      z.object({
        name: z.string(),
        qty: z.coerce.number().default(1),
        unitPriceTnd: z.coerce.number().nullable().default(null),
      })
    )
    .default([]),
  notes: z.string().default(""),
});
type ModelOutput = z.infer<typeof modelOutputSchema>;

export interface ExtractedOrder {
  customerName: string;
  /** Normalized 8 digits, or the raw text when it could not be normalized */
  phone: string;
  phoneValid: boolean;
  governorate: string;
  address: string;
  items: OrderItem[];
  notes: string;
}

function buildPrompt(products: Product[]): string {
  const catalog =
    products.length > 0
      ? products.map((p) => `- ${p.name}: ${p.price / 1000} TND`).join("\n")
      : "(the seller has no saved products)";

  return `You extract cash-on-delivery orders for a Tunisian online shop.
The chat may be in Tunisian Darija (Arabic script or Latin "Arabizi" like "3aslema, nheb n3adi commande"), French, Arabic or English, and may include the seller's own messages.

Return ONLY a JSON object with these keys:
{
  "customerName": "buyer's name as written, or empty",
  "phone": "buyer's phone number exactly as written, or empty",
  "governorate": "one of: ${GOVERNORATE_KEYS.join(", ")} — or empty if unknown. Infer it from a city (e.g. Hammamet -> Nabeul, La Marsa -> Tunis, Msaken -> Sousse)",
  "address": "street / city / landmark details, or empty",
  "items": [{ "name": "product", "qty": 1, "unitPriceTnd": 45 }],
  "notes": "size, color, delivery time or other details, short"
}

Rules:
- Match products to the seller's catalog when possible and use the catalog name and price:
${catalog}
- unitPriceTnd is the price of ONE unit in dinars; null if no price is known.
- Never invent a phone number, name or address that is not in the chat.
- Do not include delivery fees as an item.`;
}

/** Mock output for offline development (no AI key configured). */
function sampleOutput(chat: string): ModelOutput {
  const phone = chat.match(/(?:\+?216[\s.-]?)?[2-9](?:[\s.-]?\d){7}/)?.[0] ?? "";
  return {
    customerName: "Sample customer",
    phone,
    governorate: "Tunis",
    address: "(dev mode sample — add GROQ_API_KEY or GEMINI_API_KEY for real extraction)",
    items: [{ name: "Sample product", qty: 1, unitPriceTnd: 45 }],
    notes: "",
  };
}

function toMillimes(tnd: number | null): number {
  if (tnd === null || !Number.isFinite(tnd) || tnd < 0) return 0;
  return Math.round(tnd * 1000);
}

export async function extractOrder(chat: string, products: Product[]): Promise<ExtractedOrder> {
  const provider = getAIProvider({ tier: "fast", language: "auto" });
  const { data } = await provider.generateStructured(
    [
      { role: "system", content: buildPrompt(products) },
      { role: "user", content: chat },
    ],
    modelOutputSchema,
    { mock: () => sampleOutput(chat) }
  );

  const normalizedPhone = normalizePhone(data.phone);
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));

  return {
    customerName: data.customerName.trim().slice(0, 120),
    phone: normalizedPhone ?? data.phone.trim(),
    phoneValid: normalizedPhone !== null,
    governorate: GOVERNORATE_KEYS.includes(data.governorate) ? data.governorate : "",
    address: data.address.trim().slice(0, 500),
    items: data.items
      .filter((item) => item.name.trim())
      .slice(0, 50)
      .map((item) => {
        // Catalog prices win over whatever the model read from the chat
        const product = byName.get(item.name.trim().toLowerCase());
        return {
          name: item.name.trim().slice(0, 200),
          qty: Math.min(999, Math.max(1, Math.round(item.qty) || 1)),
          unitPrice: product?.price ?? toMillimes(item.unitPriceTnd),
          unitCost: product?.cost ?? 0,
        };
      }),
    notes: data.notes.trim().slice(0, 1000),
  };
}
