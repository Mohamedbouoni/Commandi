"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackageCheck, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useOrderDialog } from "@/components/orders/order-dialog";

// Route prefix → t.shell keys for the page title and subtitle.
// Anything else under /dashboard falls back to the overview title.
const PAGE_TITLES: { prefix: string; title: string; subtitle: string }[] = [
  { prefix: "/dashboard/orders", title: "ordersTitle", subtitle: "ordersSubtitle" },
  { prefix: "/dashboard/products", title: "productsTitle", subtitle: "productsSubtitle" },
  { prefix: "/dashboard/settings", title: "settingsTitle", subtitle: "settingsSubtitle" },
];
const OVERVIEW_TITLE = { prefix: "/dashboard", title: "overviewTitle", subtitle: "overviewSubtitle" };

export function DashboardTopbar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { openNewOrder } = useOrderDialog();

  const page = PAGE_TITLES.find((entry) => pathname.startsWith(entry.prefix)) ?? OVERVIEW_TITLE;

  return (
    <header className="flex items-center justify-between gap-4">
      {/* Logo mark + page title */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          href="/dashboard"
          aria-label={t.brand}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-card transition-opacity hover:opacity-90"
        >
          <PackageCheck className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight font-bold tracking-tight sm:text-[1.75rem]">
            {t.shell[page.title]}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{t.shell[page.subtitle]}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={openNewOrder}
        className="inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-primary ps-3 pe-3 text-sm font-semibold text-primary-foreground shadow-card transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 sm:ps-4 sm:pe-5"
      >
        <span className="grid size-7 place-items-center rounded-full bg-sage text-sage-foreground">
          <Plus className="size-4" />
        </span>
        <span className="hidden sm:inline">{t.shell.newOrder}</span>
      </button>
    </header>
  );
}
