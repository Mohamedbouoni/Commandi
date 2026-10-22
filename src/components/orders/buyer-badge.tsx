"use client";

import React from "react";
import { Shield, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { buyerRisk, type BuyerHistory } from "@/modules/orders/schemas";
import { cn } from "@/lib/utils";

const STYLE = {
  new: { icon: UserRound, className: "bg-muted text-muted-foreground" },
  trusted: { icon: ShieldCheck, className: "bg-positive-soft text-positive" },
  risky: { icon: ShieldAlert, className: "bg-negative-soft text-negative" },
} as const;

const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";

/** "New buyer" / "Trusted · 3 delivered" / "Risky · 2 refused" pill for a phone number. */
export function BuyerBadge({ buyer, className }: { buyer: BuyerHistory; className?: string }) {
  const { t } = useLanguage();
  const risk = buyerRisk(buyer);
  const { icon: Icon, className: tone } = STYLE[risk];
  const local = buyer.totalOrders > 0 ? buyer : null;

  const label =
    risk === "risky" && local && local.returned + local.cancelled > 0
      ? fmt(t.orders.buyerRisky, { failed: local.returned + local.cancelled })
      : risk === "trusted" && local && local.delivered > 0
        ? fmt(t.orders.buyerTrusted, { delivered: local.delivered })
        : risk === "new"
          ? t.orders.buyerNew
          : null;

  return (
    <>
      {label && (
        <span className={cn(pill, tone, className)}>
          <Icon className="size-3.5" />
          {label}
        </span>
      )}
      <ShieldBadge buyer={buyer} className={className} />
    </>
  );
}

/** What Commandi Shield knows about this phone from other shops. */
export function ShieldBadge({ buyer, className }: { buyer: BuyerHistory; className?: string }) {
  const { t } = useLanguage();
  const { network } = buyer;
  if (network.returned > 0) {
    return (
      <span className={cn(pill, "bg-negative-soft text-negative", className)}>
        <ShieldAlert className="size-3.5" />
        {fmt(t.orders.shieldRisky, { returned: network.returned, shops: network.shops })}
      </span>
    );
  }
  if (network.delivered > 0) {
    return (
      <span className={cn(pill, "bg-positive-soft text-positive", className)}>
        <Shield className="size-3.5" />
        {fmt(t.orders.shieldGood, { delivered: network.delivered })}
      </span>
    );
  }
  return null;
}
