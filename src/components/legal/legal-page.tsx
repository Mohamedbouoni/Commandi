import React from "react";
import Link from "next/link";
import { PackageCheck } from "lucide-react";

/** Contact shown on the legal pages; Meta's app review requires one. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export interface LegalSection {
  title: string;
  body: React.ReactNode;
}

/** Plain, static layout shared by /privacy and /data-deletion. */
export function LegalPage({
  title,
  updated,
  sections,
  arabicSummary,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
  arabicSummary: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <PackageCheck className="size-5" />
          </span>
          Commandi
        </Link>
        <header>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
        </header>
        <p dir="rtl" lang="ar" className="rounded-xl bg-card p-4 text-sm leading-relaxed shadow-card">
          {arabicSummary}
        </p>
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">{section.title}</h2>
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">{section.body}</div>
          </section>
        ))}
        {CONTACT_EMAIL && (
          <p className="text-sm">
            Contact: <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">{CONTACT_EMAIL}</a>
          </p>
        )}
      </div>
    </div>
  );
}
