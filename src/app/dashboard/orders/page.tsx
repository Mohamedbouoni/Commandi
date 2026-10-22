"use client";

import React, { useDeferredValue, useState } from "react";
import { Download, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useOrders } from "@/lib/queries/hooks";
import { statusLabel } from "@/lib/orders-ui";
import { ORDER_STATUSES, type OrderStatus } from "@/modules/orders/schemas";
import { PillTabs } from "@/components/dashboard/pill-tabs";
import { OrderCard } from "@/components/orders/order-card";

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

  return (
    <div className="flex flex-col gap-5">
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
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
          {t.orders.empty}
        </div>
      )}
    </div>
  );
}
