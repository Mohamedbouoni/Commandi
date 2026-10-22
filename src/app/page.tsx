"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  ClipboardPaste,
  Download,
  Globe,
  Languages,
  MessageCircle,
  PackageCheck,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import type { IconComponent } from "@/components/dashboard/stat-tile";

const FEATURES: { icon: IconComponent; n: string }[] = [
  { icon: ClipboardPaste, n: "1" },
  { icon: MessageCircle, n: "2" },
  { icon: ShieldAlert, n: "3" },
  { icon: Wallet, n: "4" },
  { icon: Download, n: "5" },
  { icon: Languages, n: "6" },
];

export default function LandingPage() {
  const { t, language, toggleLanguage, dir } = useLanguage();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <PackageCheck className="size-5" />
          </span>
          {t.brand}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-muted"
          >
            <Globe className="size-4" />
            {language === "en" ? "العربية" : "English"}
          </button>
          <Link href="/login" className="hidden h-9 items-center rounded-full px-4 text-sm font-medium hover:bg-muted sm:inline-flex">
            {t.nav.login}
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {t.nav.getStarted}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-16">
        <div className="flex flex-col items-start gap-6">
          <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-sage shadow-card">
            {t.landing.heroBadge}
          </span>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">{t.landing.heroTitle}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t.landing.heroBody}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-float"
            >
              {t.landing.heroCta}
              <Arrow className="size-4" />
            </Link>
            <a href="#features" className="inline-flex h-12 items-center rounded-full bg-card px-6 font-semibold shadow-card">
              {t.landing.heroSecondary}
            </a>
          </div>
        </div>

        {/* Product demo: chat → order card */}
        <div className="relative flex flex-col gap-4">
          <div className="max-w-xs self-start rounded-2xl rounded-ss-sm bg-card p-4 text-sm shadow-card" dir="auto">
            3aslema 👋 nheb njib el robe noir taille M
            <br />
            Ahmed Ben Salah — 98 123 456
            <br />
            Sousse, Sahloul 4
          </div>
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-sage text-sage-foreground shadow-float">
            <Arrow className="size-5 rotate-90" />
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-float">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">#1024</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                {t.status.new}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">Ahmed Ben Salah</span>
              <span className="rounded-full bg-positive-soft px-2 py-0.5 text-[11px] font-semibold text-positive">
                {t.orders.buyerTrusted?.replace("{delivered}", "3")}
              </span>
            </div>
            <div className="flex items-end justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span>1 × Robe noire (M)</span>
              <span className="text-lg font-bold">66 {t.common.tnd}</span>
            </div>
            <span className="inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white">
              <MessageCircle className="size-4" />
              {t.orders.confirmWhatsapp}
            </span>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold">{t.landing.painTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["1", "2", "3", "4"] as const).map((n) => (
            <div key={n} className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-negative-soft text-negative">
                <X className="size-4" />
              </span>
              <span className="text-sm font-medium">{t.landing[`pain${n}`]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold">{t.landing.featuresTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, n }) => (
            <div key={n} className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card">
              <span className="grid size-10 place-items-center rounded-full bg-sage-softer text-sage">
                <Icon className="size-5" />
              </span>
              <h3 className="font-bold">{t.landing[`f${n}Title`]}</h3>
              <p className="text-sm text-muted-foreground">{t.landing[`f${n}Body`]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary p-10 text-center text-primary-foreground">
          <h2 className="text-3xl font-extrabold">{t.landing.ctaTitle}</h2>
          <p className="opacity-80">{t.landing.ctaBody}</p>
          <Link
            href="/register"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-sage px-6 font-semibold text-sage-foreground"
          >
            {t.landing.heroCta}
            <Arrow className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-muted-foreground sm:px-6">
        © 2026 {t.brand} · {t.landing.footer} 🇹🇳
      </footer>
    </div>
  );
}
