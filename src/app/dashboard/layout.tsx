"use client";

import React, { Suspense } from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { OrderDialogProvider } from "@/components/orders/order-dialog";
import { QueryProvider } from "@/components/providers/query-provider";
import { useLanguage } from "@/lib/i18n/provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dir } = useLanguage();

  return (
    // Base UI needs the direction to place tooltips and menus on the right side in RTL
    <DirectionProvider direction={dir}>
      <QueryProvider>
        <OrderDialogProvider>
          <div className="min-h-screen bg-background text-foreground">
            <DashboardSidebar />

            {/* Rail is 5rem wide + 1rem inset, so content starts at 8rem on desktop */}
            <div className="px-4 pt-5 pb-28 sm:px-6 md:ps-32 md:pe-8 md:pt-6 md:pb-12">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-8">
                <DashboardTopbar />
                {/* Pages read live data on first render; Suspense lets Cache
                    Components prerender the shell and defer the page body */}
                <main className="min-w-0">
                  <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-card shadow-card" />}>
                    {children}
                  </Suspense>
                </main>
              </div>
            </div>
          </div>
        </OrderDialogProvider>
      </QueryProvider>
    </DirectionProvider>
  );
}
