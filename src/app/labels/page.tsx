"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { QueryProvider } from "@/components/providers/query-provider";
import { useLanguage } from "@/lib/i18n/provider";
import { useOrders, useShop } from "@/lib/queries/hooks";
import { dinars } from "@/lib/orders-ui";
import { formatPhone, governorateLabel } from "@/modules/orders/tunisia";

/** Printable delivery labels for the orders in ?ids= (two per row on A4). */
export default function LabelsPage() {
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <Labels />
      </Suspense>
    </QueryProvider>
  );
}

function Labels() {
  const { t, language } = useLanguage();
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const { data: orders = [], isLoading, error } = useOrders({ ids, limit: 200 });
  const { data: shop } = useShop();

  return (
    <div className="min-h-screen bg-white p-4 text-black print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-neutral-600">
          {isLoading ? t.common.loading : error ? error.message : `${orders.length} × ${t.orders.printLabels}`}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={orders.length === 0}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Printer className="size-4" />
          {t.orders.printLabels}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {orders.map((order) => (
          <article
            key={order.id}
            className="flex break-inside-avoid flex-col gap-2 rounded-lg border-2 border-black p-3 text-sm"
          >
            <div className="flex items-center justify-between border-b border-dashed border-black pb-1.5 text-xs">
              <span className="font-bold" dir="auto">{shop?.name || t.brand}</span>
              <span className="font-mono font-bold">#{order.number}</span>
            </div>
            <div>
              <div className="text-lg leading-tight font-bold" dir="auto">{order.customerName}</div>
              <div className="font-mono text-base font-bold" dir="ltr">{formatPhone(order.phone)}</div>
              <div dir="auto">
                {[governorateLabel(order.governorate, language), order.address].filter(Boolean).join(" — ")}
              </div>
            </div>
            <ul className="text-xs" dir="auto">
              {order.items.map((item, i) => (
                <li key={i}>
                  {item.qty} × {item.name}
                </li>
              ))}
              {order.notes && <li className="italic">{order.notes}</li>}
            </ul>
            <div className="mt-auto flex items-center justify-between rounded bg-black px-2 py-1 text-white">
              <span className="text-xs font-semibold">COD</span>
              <span className="text-lg font-bold tabular-nums">
                {dinars(order.subtotal + order.deliveryFee)} TND
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
