import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconComponent = React.ComponentType<{ className?: string }>;

interface TrendPillProps {
  value: string;
  positive?: boolean;
  className?: string;
}

/** Light green / red pill for a change value, e.g. "+12%" */
export function TrendPill({ value, positive = true, className }: TrendPillProps) {
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        positive ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
        className
      )}
    >
      <Arrow className="size-3.5 rtl:-scale-x-100" />
      {value}
    </span>
  );
}

interface StatTileProps {
  icon: IconComponent;
  label: string;
  value: React.ReactNode;
  /** Small line under the value, e.g. "of 10 this month" */
  hint?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground shadow-card",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage-softer text-sage">
          <Icon className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {trend && <TrendPill value={trend.value} positive={trend.positive} />}
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
