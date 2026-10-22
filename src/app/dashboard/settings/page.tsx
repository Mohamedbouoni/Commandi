"use client";

import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useShop, useUpdateShop } from "@/lib/queries/hooks";
import { DEFAULT_CONFIRM_TEMPLATE, confirmMessage, inputToMillimes, millimesToInput } from "@/lib/orders-ui";
import type { Shop } from "@/modules/orders/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    await updateShop.mutateAsync({
      name: name.trim(),
      defaultDeliveryFee: inputToMillimes(deliveryFee),
      defaultShippingCost: inputToMillimes(shippingCost),
      // Store null for the default so future improvements to it reach this shop
      confirmTemplate: template.trim() === DEFAULT_CONFIRM_TEMPLATE ? null : template.trim(),
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
