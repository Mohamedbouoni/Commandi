"use client";

import React, { useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useDeleteProduct, useProducts, useSaveProduct } from "@/lib/queries/hooks";
import { dinars, inputToMillimes, millimesToInput } from "@/lib/orders-ui";
import type { Product } from "@/modules/orders/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Draft {
  name: string;
  price: string;
  cost: string;
}

const EMPTY_DRAFT: Draft = { name: "", price: "", cost: "" };

function toDraft(product: Product): Draft {
  return { name: product.name, price: millimesToInput(product.price), cost: millimesToInput(product.cost) };
}

export default function ProductsPage() {
  const { t } = useLanguage();
  const { data: products = [], isLoading } = useProducts();
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);

  const save = (values: Draft, id?: string) =>
    saveProduct.mutateAsync({
      id,
      name: values.name.trim(),
      price: inputToMillimes(values.price),
      cost: inputToMillimes(values.cost),
    });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await save(draft);
    setDraft(EMPTY_DRAFT);
  };

  const handleSaveEdit = async (id: string) => {
    await save(editDraft, id);
    setEditingId(null);
  };

  const tnd = t.common.tnd;

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={handleAdd} className="flex flex-col gap-3 self-start rounded-xl bg-card p-5 shadow-card">
        <h2 className="text-lg font-bold">{t.products.addTitle}</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-xs text-muted-foreground">{t.products.name}</Label>
          <Input
            id="name"
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t.products.namePlaceholder}
            dir="auto"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price" className="text-xs text-muted-foreground">{t.products.price} ({tnd})</Label>
            <Input id="price" required inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cost" className="text-xs text-muted-foreground">{t.products.cost} ({tnd})</Label>
            <Input id="cost" inputMode="decimal" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
          </div>
        </div>
        <Button type="submit" disabled={saveProduct.isPending} className="h-10 rounded-full">
          {saveProduct.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          {t.common.add}
        </Button>
        {saveProduct.isError && <p className="text-xs text-destructive">{saveProduct.error.message}</p>}
      </form>

      <section className="overflow-hidden rounded-xl bg-card shadow-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t.products.empty}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t.products.name}</th>
                <th className="px-2 py-3 text-end font-medium">{t.products.price}</th>
                <th className="px-2 py-3 text-end font-medium">{t.products.cost}</th>
                <th className="hidden px-2 py-3 text-end font-medium sm:table-cell">{t.products.margin}</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) =>
                editingId === product.id ? (
                  <tr key={product.id} className="border-t">
                    <td className="px-4 py-2">
                      <Input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} dir="auto" />
                    </td>
                    <td className="px-2 py-2">
                      <Input inputMode="decimal" className="text-end" value={editDraft.price} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <Input inputMode="decimal" className="text-end" value={editDraft.cost} onChange={(e) => setEditDraft({ ...editDraft, cost: e.target.value })} />
                    </td>
                    <td className="hidden sm:table-cell" />
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label={t.common.save} onClick={() => handleSaveEdit(product.id)}>
                          <Check />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={t.common.cancel} onClick={() => setEditingId(null)}>
                          <X />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={product.id} className="border-t">
                    <td className="px-4 py-3 font-medium" dir="auto">{product.name}</td>
                    <td className="px-2 py-3 text-end tabular-nums">{dinars(product.price)}</td>
                    <td className="px-2 py-3 text-end tabular-nums text-muted-foreground">{dinars(product.cost)}</td>
                    <td className="hidden px-2 py-3 text-end tabular-nums text-positive sm:table-cell">
                      {dinars(Math.max(0, product.price - product.cost))}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t.common.edit}
                          onClick={() => {
                            setEditingId(product.id);
                            setEditDraft(toDraft(product));
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t.common.delete}
                          onClick={() => window.confirm(t.common.confirmDelete) && deleteProduct.mutate(product.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
