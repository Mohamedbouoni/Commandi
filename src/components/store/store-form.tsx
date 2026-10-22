"use client";

import React, { useState } from "react";
import { Languages, Loader2, Minus, PackageCheck, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { dinars } from "@/lib/orders-ui";
import { GOVERNORATES, normalizePhone } from "@/modules/orders/tunisia";
import type { Store } from "@/modules/store/store-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function StoreForm({ slug, store }: { slug: string; store: Store }) {
  const { t, language, dir, toggleLanguage } = useLanguage();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);

  const setQty = (id: string, qty: number) =>
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 20);
      return next;
    });

  const lines = store.products.filter((p) => cart[p.id]);
  const subtotal = lines.reduce((sum, p) => sum + p.price * (cart[p.id] ?? 0), 0);
  const tnd = t.common.tnd;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lines.length === 0) return setError(t.store.emptyCart ?? null);
    if (!normalizePhone(phone)) return setError(t.form.phoneInvalid ?? null);

    setPending(true);
    try {
      const response = await fetch(`/api/store/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          governorate,
          address,
          notes,
          website,
          items: lines.map((p) => ({ productId: p.id, qty: cart[p.id] })),
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error || "Something went wrong.");
      setPlaced(json.data.number);
      setCart({});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <header className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <PackageCheck className="size-5" />
          </span>
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold" dir="auto">{store.name}</h1>
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold shadow-card"
          >
            <Languages className="size-4" />
            {t.shell.switchLanguage}
          </button>
        </header>

        {placed !== null ? (
          <section className="flex flex-col items-center gap-3 rounded-xl bg-card p-8 text-center shadow-card">
            <h2 className="text-xl font-bold">{t.store.successTitle}</h2>
            <p className="text-sm text-muted-foreground">{fmt(t.store.successBody, { number: placed })}</p>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPlaced(null)}>
              {t.store.newOrder}
            </Button>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <section className="flex flex-col gap-2 rounded-xl bg-card p-4 shadow-card">
              <h2 className="font-bold">{t.store.chooseProducts}</h2>
              {store.products.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.store.noProducts}</p>
              )}
              {store.products.map((product) => {
                const qty = cart[product.id] ?? 0;
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      qty > 0 && "border-primary bg-muted",
                      !product.inStock && "opacity-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium" dir="auto">{product.name}</div>
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {product.inStock ? `${dinars(product.price)} ${tnd}` : t.store.soldOut}
                      </div>
                    </div>
                    {product.inStock &&
                      (qty === 0 ? (
                        <Button type="button" size="icon" className="rounded-full" aria-label="+" onClick={() => setQty(product.id, 1)}>
                          <Plus />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button type="button" size="icon" variant="outline" className="rounded-full" aria-label="-" onClick={() => setQty(product.id, qty - 1)}>
                            <Minus />
                          </Button>
                          <span className="w-5 text-center font-bold tabular-nums">{qty}</span>
                          <Button type="button" size="icon" variant="outline" className="rounded-full" aria-label="+" onClick={() => setQty(product.id, qty + 1)}>
                            <Plus />
                          </Button>
                        </div>
                      ))}
                  </div>
                );
              })}
            </section>

            <section className="relative flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card">
              <h2 className="font-bold">{t.store.yourDetails}</h2>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customerName" className="text-xs text-muted-foreground">{t.store.fullName}</Label>
                <Input id="customerName" required minLength={2} maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.target.value)} dir="auto" autoComplete="name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-xs text-muted-foreground">{t.store.phone}</Label>
                <Input id="phone" required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="98 123 456" autoComplete="tel" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="governorate" className="text-xs text-muted-foreground">{t.store.governorate}</Label>
                <select
                  id="governorate"
                  required
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="h-10 rounded-lg border bg-background px-3 text-sm"
                >
                  <option value="">{t.form.chooseGovernorate}</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g.key} value={g.key}>
                      {language === "ar" ? g.ar : g.key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address" className="text-xs text-muted-foreground">{t.store.address}</Label>
                <Input id="address" required minLength={3} maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} dir="auto" autoComplete="street-address" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes" className="text-xs text-muted-foreground">{t.store.notes}</Label>
                <Textarea id="notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} dir="auto" className="min-h-16" />
              </div>
              {/* Honeypot for bots — hidden from people and screen readers */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="pointer-events-none absolute size-0 opacity-0"
              />
            </section>

            <section className="flex flex-col gap-1.5 rounded-xl bg-card p-4 text-sm shadow-card">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.store.products}</span>
                <span className="tabular-nums">{dinars(subtotal)} {tnd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.store.delivery}</span>
                <span className="tabular-nums">{dinars(store.deliveryFee)} {tnd}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>{t.store.total}</span>
                <span className="tabular-nums">
                  {dinars(lines.length > 0 ? subtotal + store.deliveryFee : 0)} {tnd}
                </span>
              </div>
            </section>

            {error && <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">{error}</p>}

            <Button type="submit" disabled={pending} className="h-12 rounded-full text-base">
              {pending && <Loader2 className="animate-spin" />}
              {pending ? t.store.placing : t.store.placeOrder}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">{t.store.poweredBy}</p>
      </div>
    </div>
  );
}
