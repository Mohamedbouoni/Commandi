"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, MessageCircle, Sparkles, Truck, Undo2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useOrders, useStats, startOfMonthIso } from "@/lib/queries/hooks";
import { dinars } from "@/lib/orders-ui";
import { StatTile } from "@/components/dashboard/stat-tile";
import { OrderCard } from "@/components/orders/order-card";
import { useOrderDialog } from "@/components/orders/order-dialog";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const { t } = useLanguage();
  const { openNewOrder } = useOrderDialog();
  // Fixed for the page's lifetime so the query key stays stable
  const [from] = useState(startOfMonthIso);
  const { data: stats, isLoading } = useStats(from);
  const { data: recent = [] } = useOrders({ limit: 6 });

  const counts = stats?.counts;
  const profit = stats?.profit ?? 0;
  const tnd = t.common.tnd;

  if (!isLoading && stats && stats.total === 0 && recent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-sage-glow p-10 text-center shadow-card sm:p-16">
        <span className="grid size-14 place-items-center rounded-full bg-card text-sage shadow-card">
          <Sparkles className="size-6" />
        </span>
        <h2 className="text-2xl font-bold">{t.overview.emptyTitle}</h2>
        <p className="max-w-md text-muted-foreground">{t.overview.emptyBody}</p>
        <button
          type="button"
          onClick={openNewOrder}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {t.shell.newOrder}
        </button>
      </div>
    );
  }

  const profitRows: { label: string | undefined; value: number; sign: "+" | "−"; muted?: boolean }[] = stats
    ? [
        { label: t.overview.revenue, value: stats.revenue, sign: "+" },
        { label: t.overview.productCost, value: stats.productCost, sign: "−" },
        { label: t.overview.shippingCost, value: stats.shippingCost, sign: "−" },
        { label: t.overview.returnLoss, value: stats.returnLoss, sign: "−", muted: true },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={ClipboardList} label={t.overview.ordersThisMonth ?? ""} value={isLoading ? "—" : stats?.total ?? 0} />
        <StatTile icon={MessageCircle} label={t.overview.toConfirm ?? ""} value={isLoading ? "—" : counts?.new ?? 0} />
        <StatTile icon={Truck} label={t.overview.inDelivery ?? ""} value={isLoading ? "—" : counts?.shipped ?? 0} />
        <StatTile
          icon={Undo2}
          label={t.overview.returnRate ?? ""}
          value={isLoading ? "—" : `${Math.round((stats?.returnRate ?? 0) * 100)}%`}
          hint={t.overview.returnRateHint}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Profit breakdown */}
        <section className="flex flex-col gap-4 self-start rounded-xl bg-card p-5 shadow-card">
          <div>
            <h2 className="text-lg font-bold">{t.overview.profitTitle}</h2>
            <p className="text-xs text-muted-foreground">{t.overview.profitHint}</p>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            {profitRows.map((row) => (
              <div key={row.label} className={cn("flex justify-between", row.muted && "ps-3 text-xs text-muted-foreground")}>
                <dt>{row.label}</dt>
                <dd className="tabular-nums">
                  {row.sign} {dinars(row.value)} {tnd}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="font-semibold">{t.overview.profit}</span>
            <span className={cn("text-2xl font-bold tabular-nums", profit < 0 ? "text-negative" : "text-positive")}>
              {profit < 0 && "−"}
              {dinars(Math.abs(profit))}{" "}
              <span className="text-sm">{tnd}</span>
            </span>
          </div>
          {stats && stats.counts.delivered > 0 && stats.productCost === 0 && (
            <Link href="/dashboard/products" className="rounded-lg bg-muted p-3 text-xs text-muted-foreground hover:text-foreground">
              {t.overview.missingCosts}
            </Link>
          )}
        </section>

        {/* Recent orders */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.overview.recentOrders}</h2>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {t.overview.viewAll}
              <ArrowUpRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {recent.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
