"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { IconComponent } from "./stat-tile";

export interface PillTabOption<T extends string> {
  value: T;
  label: string;
  icon?: IconComponent;
  count?: number;
}

interface PillTabsProps<T extends string> {
  options: PillTabOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: "sm" | "default";
  "aria-label"?: string;
  className?: string;
}

/** Segmented filter (All / YouTube / TikTok …); the active pill is filled black */
export function PillTabs<T extends string>({
  options,
  value,
  onValueChange,
  size = "default",
  "aria-label": ariaLabel,
  className,
}: PillTabsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-card p-1 shadow-card [scrollbar-width:none]",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-4" />}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold tabular-nums",
                  active
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
