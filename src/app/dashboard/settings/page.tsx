"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useShop, useUpdateShop } from "@/lib/queries/hooks";
import { DEFAULT_CONFIRM_TEMPLATE, confirmMessage, inputToMillimes, millimesToInput } from "@/lib/orders-ui";
import type { Shop } from "@/modules/orders/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** "Boutique Yasmine!" -> "boutique-yasmine" (Arabic names give "", the seller types one) */
function suggestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const SAMPLE_ORDER = {
  customerName: "Ahmed",
  number: 1024,
  items: [{ name: "Robe noire (M)", qty: 1, unitPrice: 59000, unitCost: 0 }],
  subtotal: 59000,
  deliveryFee: 7000,
  governorate: "Sousse",
  address: "Sahloul 4",
};

export default function SettingsPage() {
  const { data: shop } = useShop();
  // Mount the form once the shop has loaded so it starts from saved values
  return shop ? <SettingsForm shop={shop} /> : <div className="h-96 animate-pulse rounded-xl bg-card shadow-card" />;
}

function SettingsForm({ shop }: { shop: Shop }) {
  const { t } = useLanguage();
  const updateShop = useUpdateShop();

  const [name, setName] = useState(shop.name);
  const [deliveryFee, setDeliveryFee] = useState(millimesToInput(shop.defaultDeliveryFee));
  const [shippingCost, setShippingCost] = useState(millimesToInput(shop.defaultShippingCost));
  const [template, setTemplate] = useState(shop.confirmTemplate ?? DEFAULT_CONFIRM_TEMPLATE);
  const [slug, setSlug] = useState(shop.slug ?? suggestSlug(shop.name));
  const [storeEnabled, setStoreEnabled] = useState(shop.storeEnabled);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Link to the saved slug: an unsaved one would open a "not found" page
  const storeUrl = shop.slug ? `${window.location.origin}/s/${shop.slug}` : null;
  const copyLink = async () => {
    if (!storeUrl) return;
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    await updateShop.mutateAsync({
      name: name.trim(),
      defaultDeliveryFee: inputToMillimes(deliveryFee),
      defaultShippingCost: inputToMillimes(shippingCost),
      // Store null for the default so future improvements to it reach this shop
      confirmTemplate: template.trim() === DEFAULT_CONFIRM_TEMPLATE ? null : template.trim(),
      slug: slug.trim() ? slug.trim().toLowerCase() : null,
      // A store with no link cannot be reached, so keep it off
      storeEnabled: storeEnabled && Boolean(slug.trim()),
    });
    setSaved(true);
  };

  const tnd = t.common.tnd;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card">
          <h2 className="text-lg font-bold">{t.settings.shopTitle}</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shopName" className="text-xs text-muted-foreground">{t.settings.shopName}</Label>
            <Input id="shopName" value={name} onChange={(e) => setName(e.target.value)} dir="auto" />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card">
          <div>
            <h2 className="text-lg font-bold">{t.settings.deliveryTitle}</h2>
            <p className="text-xs text-muted-foreground">{t.settings.deliveryHint}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deliveryFee" className="text-xs text-muted-foreground">
                {t.settings.defaultDeliveryFee} ({tnd})
              </Label>
              <Input id="deliveryFee" inputMode="decimal" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shippingCost" className="text-xs text-muted-foreground">
                {t.settings.defaultShippingCost} ({tnd})
              </Label>
              <Input id="shippingCost" inputMode="decimal" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card">
          <div>
            <h2 className="text-lg font-bold">{t.settings.storeTitle}</h2>
            <p className="text-xs text-muted-foreground">{t.settings.storeHint}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug" className="text-xs text-muted-foreground">{t.settings.storeSlug}</Label>
            <div className="flex h-10 items-center overflow-hidden rounded-lg border bg-background text-sm focus-within:ring-3 focus-within:ring-ring/30" dir="ltr">
              <span className="ps-3 text-muted-foreground">/s/</span>
              <input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                maxLength={40}
                placeholder="boutique-yasmine"
                className="h-full min-w-0 flex-1 bg-transparent pe-3 outline-none"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={storeEnabled}
              onChange={(e) => setStoreEnabled(e.target.checked)}
              className="size-4 accent-primary"
            />
            {storeEnabled ? t.settings.storeEnabled : t.settings.storeDisabled}
          </label>
          {storeUrl && shop.storeEnabled && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2 ps-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-mono text-xs" dir="ltr">{storeUrl}</span>
              <Button type="button" variant="outline" size="sm" onClick={copyLink} className="rounded-full">
                {copied ? <Check /> : <Copy />}
                {copied ? t.settings.copied : t.settings.copyLink}
              </Button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold hover:bg-background"
              >
                <ExternalLink className="size-3.5" />
                {t.settings.openStore}
              </a>
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card">
        <div>
          <h2 className="text-lg font-bold">{t.settings.templateTitle}</h2>
          <p className="text-xs text-muted-foreground" dir="ltr">{t.settings.templateHint}</p>
        </div>
        <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} dir="auto" className="min-h-36" />
        <button
          type="button"
          onClick={() => setTemplate(DEFAULT_CONFIRM_TEMPLATE)}
          className="self-start text-xs font-semibold text-muted-foreground underline hover:text-foreground"
        >
          {t.settings.resetTemplate}
        </button>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t.settings.preview}</span>
          <p className="max-w-sm rounded-2xl rounded-ss-sm bg-[#dcf8c6] p-3 text-sm whitespace-pre-line text-[#111] shadow-card" dir="auto">
            {confirmMessage(SAMPLE_ORDER, name, template)}
          </p>
        </div>
      </section>

      <div className="flex items-center gap-3 lg:col-span-2">
        <Button type="submit" disabled={updateShop.isPending} className="h-10 rounded-full px-6">
          {updateShop.isPending && <Loader2 className="animate-spin" />}
          {updateShop.isPending ? t.common.saving : t.common.save}
        </Button>
        {saved && !updateShop.isPending && (
          <span className="inline-flex items-center gap-1 text-sm text-positive">
            <Check className="size-4" />
            {t.common.saved}
          </span>
        )}
        {updateShop.isError && <span className="text-sm text-destructive">{updateShop.error.message}</span>}
      </div>
    </form>
  );
}
