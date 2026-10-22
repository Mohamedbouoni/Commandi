"use client";

import React from "react";
import Link from "next/link";
import { PackageCheck, Globe, ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, language, toggleLanguage, dir } = useLanguage();

  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-2">
      {/* Form panel */}
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 bg-background">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-80 transition"
          >
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <PackageCheck className="size-5" />
            </div>
            <span>{t.brand}</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <Globe className="size-4" />
            <span>{language === "en" ? "العربية" : "English"}</span>
          </Button>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-10">
          {children}
        </div>

        <div className="text-xs text-muted-foreground pt-6 border-t">
          © 2026 {t.brand} · {t.landing.footer} 🇹🇳
        </div>
      </div>

      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sage-glow relative overflow-hidden">
        <div className="relative z-10 flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            {dir === "rtl" ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
            <span>{t.auth.backToSite}</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg my-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-card shadow-card text-sage">
            {t.auth.panelBadge}
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
            {t.auth.panelTitle}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">{t.auth.panelBody}</p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            {(["1", "2", "3"] as const).map((n) => (
              <div key={n} className="space-y-1">
                <div className="text-2xl font-bold">{t.auth[`panelStat${n}`]}</div>
                <div className="text-xs text-muted-foreground">{t.auth[`panelStat${n}Label`]}</div>
              </div>
            ))}
          </div>
        </div>

        <div />
      </div>
    </div>
  );
}
