"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { buyerRisk, type BuyerHistory } from "@/modules/orders/schemas";
import { cn } from "@/lib/utils";

const STYLE = {
  new: { icon: UserRound, className: "bg-muted text-muted-foreground" },
  trusted: { icon: ShieldCheck, className: "bg-positive-soft text-positive" },
  risky: { icon: ShieldAlert, className: "bg-negative-soft text-negative" },
} as const;

/** "New buyer" / "Trusted · 3 delivered" / "Risky · 2 refused" pill for a phone number. */
export function BuyerBadge({ buyer, className }: { buyer: BuyerHistory; className?: string }) {
  const { t } = useLanguage();
  const risk = buyerRisk(buyer);
  const { icon: Icon, className: tone } = STYLE[risk];

  const label =
    risk === "risky"
      ? fmt(t.orders.buyerRisky, { failed: buyer.returned + buyer.cancelled })
      : risk === "trusted"
        ? fmt(t.orders.buyerTrusted, { delivered: buyer.delivered })
        : t.orders.buyerNew;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tone,
        className
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
