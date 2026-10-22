import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/modules/store/store-service";
import { StoreForm } from "@/components/store/store-form";

type Props = { params: Promise<{ slug: string }> };

/** Public order page a seller puts in their Instagram bio. */
export default function StorePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-96 max-w-xl animate-pulse rounded-xl bg-card" />}>
      <StoreLoader params={params} />
    </Suspense>
  );
}

async function StoreLoader({ params }: Props) {
  const { slug } = await params;
  // Stock and prices are live: always render at request time
  await connection();
  const store = await getStore(await createClient(), slug);
  if (!store) notFound();
  return <StoreForm slug={slug} store={store} />;
}
