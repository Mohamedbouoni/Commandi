"use client";

import React, { useDeferredValue, useState } from "react";
import { Download, Loader2, Printer, Search, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { useBulkStatus, useOrders } from "@/lib/queries/hooks";
import { statusLabel } from "@/lib/orders-ui";
import { ORDER_STATUSES, type OrderStatus } from "@/modules/orders/schemas";
import { PillTabs } from "@/components/dashboard/pill-tabs";
import { OrderCard } from "@/components/orders/order-card";
import { cn } from "@/lib/utils";

type Filter = OrderStatus | "all";

export default function OrdersPage() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const status = filter === "all" ? undefined : filter;
  const { data: orders, isLoading, error, refetch } = useOrders({ status, q: deferredQuery || undefined });
  // Unfiltered list feeds the per-status counts on the tabs
  const { data: allOrders = [] } = useOrders({});

  const counts = allOrders.reduce<Partial<Record<OrderStatus, number>>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const exportHref = `/api/orders/export${status ? `?status=${status}` : ""}`;

  // Bulk selection (ids stay selected across filter changes until cleared)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkStatus = useBulkStatus();
  const toggleSelect = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAllVisible = () => setSelected(new Set(orders?.map((o) => o.id)));
  const clearSelection = () => setSelected(new Set());
  const applyStatus = async (next: OrderStatus) => {
    await bulkStatus.mutateAsync({ ids: [...selected], status: next });
    clearSelection();
  };
  const labelsHref = `/labels?ids=${[...selected].join(",")}`;

  return (
    // Extra bottom room while the bulk bar is open, so it never hides the last card
    <div className={cn("flex flex-col gap-5", selected.size > 0 && "pb-24")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PillTabs<Filter>
          aria-label={t.orders.statusLabel}
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: t.orders.all ?? "All", count: allOrders.length },
            ...ORDER_STATUSES.map((s) => ({ value: s, label: statusLabel(s, t), count: counts[s] ?? 0 })),
          ]}
        />
        <div className="flex items-center gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-card ps-4 pe-2 shadow-card focus-within:ring-3 focus-within:ring-ring/30 lg:w-72 lg:flex-none">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.orders.searchPlaceholder}
              aria-label={t.orders.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <a
            href={exportHref}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold shadow-card transition-colors hover:bg-muted"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">{t.orders.export}</span>
          </a>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-10 text-center shadow-card">
          <p className="text-sm text-destructive">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold underline">
            {t.common.retry}
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-xl bg-card shadow-card" />
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selected.has(order.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
          {t.orders.empty}
        </div>
      )}

      {/* Bulk action bar — sits above the mobile tab bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl bg-foreground p-2 ps-4 text-background shadow-float md:start-32 md:end-8 md:bottom-6">
          <span className="text-sm font-semibold">{fmt(t.orders.selected, { count: selected.size })}</span>
          <button type="button" onClick={selectAllVisible} className="text-xs underline opacity-80 hover:opacity-100">
            {t.orders.selectAll}
          </button>
          <div className="ms-auto flex flex-wrap items-center gap-1.5">
            {bulkStatus.isPending && <Loader2 className="size-4 animate-spin" />}
            {(["confirmed", "shipped", "delivered", "returned"] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={bulkStatus.isPending}
                onClick={() => applyStatus(s)}
                className="h-8 cursor-pointer rounded-full bg-background/15 px-3 text-xs font-semibold hover:bg-background/25 disabled:opacity-50"
              >
                {statusLabel(s, t)}
              </button>
            ))}
            <a
              href={labelsHref}
              target="_blank"
              rel="noopener"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-background px-3 text-xs font-semibold text-foreground hover:opacity-90"
            >
              <Printer className="size-3.5" />
              {t.orders.printLabels}
            </a>
            <button
              type="button"
              onClick={clearSelection}
              aria-label={t.orders.clearSelection}
              className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-background/15"
            >
              <X className="size-4" />
            </button>
          </div>
          {bulkStatus.isError && <p className="w-full text-xs text-red-300">{bulkStatus.error.message}</p>}
        </div>
      )}
    </div>
  );
}
