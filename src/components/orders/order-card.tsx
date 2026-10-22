"use client";

import React from "react";
import {
  Check,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  Truck,
  Undo2,
  X,
  PackageCheck,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/i18n/format";
import { useDeleteOrder, useShop, useUpdateOrder } from "@/lib/queries/hooks";
import { NEXT_STATUS, STATUS_STYLE, confirmMessage, dinars, statusLabel } from "@/lib/orders-ui";
import { formatPhone, governorateLabel, whatsappLink } from "@/modules/orders/tunisia";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/modules/orders/schemas";
import { BuyerBadge } from "./buyer-badge";
import { useOrderDialog } from "./order-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NEXT_ICON = { confirmed: Check, shipped: Truck, delivered: PackageCheck } as const;
const NEXT_LABEL = { confirmed: "markConfirmed", shipped: "markShipped", delivered: "markDelivered" } as const;

export function StatusPill({ status }: { status: OrderStatus }) {
  const { t } = useLanguage();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_STYLE[status]
      )}
    >
      {statusLabel(status, t)}
    </span>
  );
}

export function OrderCard({ order }: { order: Order }) {
  const { t, language } = useLanguage();
  const { data: shop } = useShop();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const { openEditOrder } = useOrderDialog();

  const next = NEXT_STATUS[order.status] as keyof typeof NEXT_ICON | undefined;
  const NextIcon = next ? NEXT_ICON[next] : null;
  const setStatus = (status: OrderStatus) => updateOrder.mutate({ id: order.id, status });

  const sendConfirmation = () => {
    window.open(
      whatsappLink(order.phone, confirmMessage(order, shop?.name ?? "", shop?.confirmTemplate ?? null)),
      "_blank",
      "noopener"
    );
    updateOrder.mutate({ id: order.id, confirmSent: true });
  };

  const handleDelete = () => {
    if (window.confirm(t.common.confirmDelete)) deleteOrder.mutate(order.id);
  };

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card transition-opacity",
        (updateOrder.isPending || deleteOrder.isPending) && "opacity-60"
      )}
    >
      {/* Header: number, date, status, menu */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">#{order.number}</span>
        <span className="text-xs text-muted-foreground">
          {formatDate(order.createdAt, language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="ms-auto">
          <StatusPill status={order.status} />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t.common.edit}
            className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
            <DropdownMenuItem onClick={() => openEditOrder(order)} className="gap-2 py-2">
              <Pencil />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="gap-2 py-2">
                <span className={cn("size-2 rounded-full", STATUS_STYLE[s])} />
                {statusLabel(s, t)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete} className="gap-2 py-2">
              <Trash2 />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Customer */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold" dir="auto">
            {order.customerName}
          </h3>
          <BuyerBadge buyer={order.buyer} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <a href={`tel:+216${order.phone}`} className="inline-flex items-center gap-1 hover:text-foreground" dir="ltr">
            <Phone className="size-3.5" />
            {formatPhone(order.phone)}
          </a>
          {(order.governorate || order.address) && (
            <span className="inline-flex min-w-0 items-center gap-1" dir="auto">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">
                {[governorateLabel(order.governorate, language), order.address].filter(Boolean).join(" · ")}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Items + total */}
      <div className="flex items-end justify-between gap-3 rounded-lg bg-muted px-3 py-2">
        <ul className="min-w-0 text-sm" dir="auto">
          {order.items.map((item, i) => (
            <li key={i} className="truncate">
              {item.qty} × {item.name}
            </li>
          ))}
          {order.notes && <li className="truncate text-xs text-muted-foreground">{order.notes}</li>}
        </ul>
        <div className="shrink-0 text-end">
          <div className="text-[11px] text-muted-foreground">{t.orders.total}</div>
          <div className="text-lg font-bold tabular-nums">
            {dinars(order.subtotal + order.deliveryFee)} <span className="text-xs">{t.common.tnd}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {(order.status === "new" || order.status === "confirmed") && (
          <button
            type="button"
            onClick={sendConfirmation}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
              order.confirmSentAt
                ? "bg-muted text-foreground hover:bg-muted/70"
                : "bg-[#25D366] text-white hover:bg-[#1ebe5b]"
            )}
          >
            <MessageCircle className="size-4" />
            {order.confirmSentAt ? t.orders.resendWhatsapp : t.orders.confirmWhatsapp}
          </button>
        )}
        {next && NextIcon && (
          <button
            type="button"
            onClick={() => setStatus(next)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85"
          >
            <NextIcon className="size-4" />
            {t.orders[NEXT_LABEL[next]]}
          </button>
        )}
        {order.status === "shipped" && (
          <button
            type="button"
            onClick={() => setStatus("returned")}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-negative-soft px-4 text-sm font-semibold text-negative transition-opacity hover:opacity-85"
          >
            <Undo2 className="size-4" />
            {t.orders.markReturned}
          </button>
        )}
        {order.status === "new" && (
          <button
            type="button"
            onClick={() => setStatus("cancelled")}
            aria-label={t.orders.cancelOrder}
            title={t.orders.cancelOrder}
            className="ms-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {updateOrder.isError && (
        <p className="text-xs text-destructive">{updateOrder.error.message}</p>
      )}
    </article>
  );
}
