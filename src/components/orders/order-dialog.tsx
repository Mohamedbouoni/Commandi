"use client";

import React, { createContext, useContext, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, MessageCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import {
  useBuyerHistory,
  useCreateOrder,
  useExtractOrder,
  useProducts,
  useShop,
  useUpdateOrder,
} from "@/lib/queries/hooks";
import {
  confirmMessage,
  dinars,
  inputToMillimes,
  millimesToInput,
} from "@/lib/orders-ui";
import { GOVERNORATES, normalizePhone, whatsappLink } from "@/modules/orders/tunisia";
import { ORDER_SOURCES, buyerRisk, type Order, type OrderSource } from "@/modules/orders/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Context: any page can open the dialog (topbar button, empty states, cards)
// ---------------------------------------------------------------------------

interface OrderDialogContextType {
  openNewOrder: () => void;
  openEditOrder: (order: Order) => void;
}

const OrderDialogContext = createContext<OrderDialogContextType | undefined>(undefined);

export function useOrderDialog() {
  const context = useContext(OrderDialogContext);
  if (!context) throw new Error("useOrderDialog must be used within an OrderDialogProvider");
  return context;
}

export function OrderDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  // Remount the form on every open so it starts from fresh state
  const [formKey, setFormKey] = useState(0);

  const show = (order: Order | null) => {
    setEditing(order);
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  return (
    <OrderDialogContext.Provider
      value={{ openNewOrder: () => show(null), openEditOrder: (order) => show(order) }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-w-2xl">
          <OrderForm key={formKey} order={editing} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </OrderDialogContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

interface ItemDraft {
  name: string;
  qty: string;
  price: string;
  /** Cost comes from the product catalog; not edited in the form */
  cost: number;
}

const EMPTY_ITEM: ItemDraft = { name: "", qty: "1", price: "", cost: 0 };

const selectClass =
  "h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function OrderForm({ order, onDone }: { order: Order | null; onDone: () => void }) {
  const { t, language } = useLanguage();
  const { data: shop } = useShop();
  const { data: products = [] } = useProducts();
  const extract = useExtractOrder();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();

  const [chat, setChat] = useState("");
  const [extracted, setExtracted] = useState(false);
  const [name, setName] = useState(order?.customerName ?? "");
  const [phone, setPhone] = useState(order?.phone ?? "");
  const [governorate, setGovernorate] = useState(order?.governorate ?? "");
  const [address, setAddress] = useState(order?.address ?? "");
  const [items, setItems] = useState<ItemDraft[]>(
    order
      ? order.items.map((i) => ({
          name: i.name,
          qty: String(i.qty),
          price: millimesToInput(i.unitPrice),
          cost: i.unitCost,
        }))
      : [{ ...EMPTY_ITEM }]
  );
  // null = use the shop default (loaded asynchronously)
  const [deliveryFee, setDeliveryFee] = useState<string | null>(
    order ? millimesToInput(order.deliveryFee) : null
  );
  const [shippingCost, setShippingCost] = useState<string | null>(
    order ? millimesToInput(order.shippingCost) : null
  );
  const [source, setSource] = useState<OrderSource>(order?.source ?? "messenger");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const deliveryFeeValue = deliveryFee ?? millimesToInput(shop?.defaultDeliveryFee ?? 7000);
  const shippingCostValue = shippingCost ?? millimesToInput(shop?.defaultShippingCost ?? 7000);

  const normalizedPhone = normalizePhone(phone);
  const { data: buyer } = useBuyerHistory(normalizedPhone ?? "");
  // While editing, the history already counts this order itself
  const risk = buyer ? buyerRisk(buyer) : "new";

  const subtotal = items.reduce(
    (sum, item) => sum + inputToMillimes(item.price) * (parseInt(item.qty, 10) || 0),
    0
  );
  const codTotal = subtotal + inputToMillimes(deliveryFeeValue);
  const saving = createOrder.isPending || updateOrder.isPending;

  const updateItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        // Picking a saved product fills its price and cost
        if (patch.name !== undefined) {
          const product = products.find((p) => p.name.toLowerCase() === patch.name!.trim().toLowerCase());
          if (product) {
            next.price = millimesToInput(product.price);
            next.cost = product.cost;
          }
        }
        return next;
      })
    );
  };

  const handleExtract = async () => {
    setError(null);
    try {
      const draft = await extract.mutateAsync(chat);
      if (draft.customerName) setName(draft.customerName);
      if (draft.phone) setPhone(draft.phone);
      if (draft.governorate) setGovernorate(draft.governorate);
      if (draft.address) setAddress(draft.address);
      if (draft.notes) setNotes(draft.notes);
      if (draft.items.length > 0) {
        setItems(
          draft.items.map((i) => ({
            name: i.name,
            qty: String(i.qty),
            price: i.unitPrice ? millimesToInput(i.unitPrice) : "",
            cost: i.unitCost,
          }))
        );
      }
      setExtracted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async (sendWhatsapp: boolean) => {
    setError(null);
    if (!normalizedPhone) {
      setError(t.form.phoneInvalid ?? "Invalid phone");
      return;
    }

    // Open the tab inside the click handler so popup blockers allow it
    const whatsappTab = sendWhatsapp ? window.open("", "_blank") : null;

    const input = {
      customerName: name.trim(),
      phone: normalizedPhone,
      governorate,
      address: address.trim(),
      items: items
        .filter((item) => item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          qty: Math.max(1, parseInt(item.qty, 10) || 1),
          unitPrice: inputToMillimes(item.price),
          unitCost: item.cost,
        })),
      deliveryFee: inputToMillimes(deliveryFeeValue),
      shippingCost: inputToMillimes(shippingCostValue),
      source,
      notes: notes.trim(),
    };

    try {
      const saved = order
        ? await updateOrder.mutateAsync({ id: order.id, ...input })
        : await createOrder.mutateAsync(input);

      if (whatsappTab) {
        whatsappTab.location.href = whatsappLink(
          saved.phone,
          confirmMessage(saved, shop?.name ?? "", shop?.confirmTemplate ?? null)
        );
        await updateOrder.mutateAsync({ id: saved.id, confirmSent: true });
      }
      onDone();
    } catch (err) {
      whatsappTab?.close();
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave(false);
      }}
      className="flex flex-col gap-5"
    >
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">
          {order ? fmt(t.form.editTitle, { number: order.number }) : t.form.newTitle}
        </DialogTitle>
      </DialogHeader>

      {/* Paste chat → AI */}
      {!order && (
        <section className="flex flex-col gap-2 rounded-xl bg-sage-glow p-4">
          <Label htmlFor="chat" className="font-semibold">
            <Sparkles className="size-4 text-sage" />
            {t.form.pasteLabel}
          </Label>
          <Textarea
            id="chat"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            placeholder={t.form.pastePlaceholder}
            dir="auto"
            className="min-h-28 bg-card"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleExtract}
              disabled={chat.trim().length < 5 || extract.isPending}
              className="h-9 rounded-full px-4"
            >
              {extract.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {extract.isPending ? t.form.extracting : t.form.extract}
            </Button>
            {extracted && <span className="text-xs text-muted-foreground">{t.form.extractedNote}</span>}
          </div>
        </section>
      )}

      {/* Customer */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label={t.form.customerName} htmlFor="customerName">
          <Input id="customerName" required value={name} onChange={(e) => setName(e.target.value)} dir="auto" />
        </Field>
        <Field label={t.form.phone} htmlFor="phone">
          <Input
            id="phone"
            required
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98 123 456"
            aria-invalid={phone.length > 0 && !normalizedPhone}
            dir="ltr"
          />
        </Field>
        <Field label={t.form.governorate} htmlFor="governorate">
          <select
            id="governorate"
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className={selectClass}
          >
            <option value="">{t.form.chooseGovernorate}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.key} value={g.key}>
                {language === "ar" ? g.ar : g.key}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.form.address} htmlFor="address">
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} dir="auto" />
        </Field>
      </section>

      {buyer && risk !== "new" && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg p-3 text-sm",
            risk === "risky" ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive"
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {risk === "risky"
              ? fmt(t.form.riskWarning, { failed: buyer.returned + buyer.cancelled })
              : fmt(t.form.trustedNote, { delivered: buyer.delivered })}
          </span>
        </div>
      )}

      {/* Items */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t.form.itemsTitle}</h3>
        <datalist id="product-names">
          {products.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr_4rem_5.5rem_2rem] items-end gap-2">
            <Field label={index === 0 ? t.form.itemName : undefined} htmlFor={`item-${index}`}>
              <Input
                id={`item-${index}`}
                list="product-names"
                required={index === 0}
                value={item.name}
                onChange={(e) => updateItem(index, { name: e.target.value })}
                dir="auto"
              />
            </Field>
            <Field label={index === 0 ? t.form.qty : undefined} htmlFor={`qty-${index}`}>
              <Input
                id={`qty-${index}`}
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateItem(index, { qty: e.target.value })}
              />
            </Field>
            <Field label={index === 0 ? t.form.unitPrice : undefined} htmlFor={`price-${index}`}>
              <Input
                id={`price-${index}`}
                inputMode="decimal"
                value={item.price}
                onChange={(e) => updateItem(index, { price: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.form.removeItem}
              disabled={items.length === 1}
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}
        >
          <Plus />
          {t.form.addItem}
        </Button>
      </section>

      {/* Delivery & extras */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Field label={`${t.form.deliveryFee} (${t.common.tnd})`} htmlFor="deliveryFee">
          <Input
            id="deliveryFee"
            inputMode="decimal"
            value={deliveryFeeValue}
            onChange={(e) => setDeliveryFee(e.target.value)}
          />
        </Field>
        <Field label={`${t.form.shippingCost} (${t.common.tnd})`} htmlFor="shippingCost">
          <Input
            id="shippingCost"
            inputMode="decimal"
            value={shippingCostValue}
            onChange={(e) => setShippingCost(e.target.value)}
          />
        </Field>
        <Field label={t.form.source} htmlFor="source">
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value as OrderSource)}
            className={selectClass}
          >
            {ORDER_SOURCES.map((s) => (
              <option key={s} value={s}>
                {t.source[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.form.notes} htmlFor="notes" className="sm:col-span-3">
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} dir="auto" />
        </Field>
      </section>

      {/* Totals */}
      <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {t.form.subtotal}: {dinars(subtotal)} · {t.form.codTotal}
        </span>
        <span className="text-xl font-bold tabular-nums">
          {dinars(codTotal)} {t.common.tnd}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" variant="outline" disabled={saving} className="h-10 rounded-full px-5">
          {saving && <Loader2 className="animate-spin" />}
          {t.form.saveOrder}
        </Button>
        {(!order || order.status === "new") && (
          <Button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="h-10 rounded-full bg-[#25D366] px-5 text-white hover:bg-[#1ebe5b]"
          >
            <MessageCircle />
            {t.form.saveAndConfirm}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string | undefined;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
          {label}
        </Label>
      )}
      {children}
    </div>
  );
}
