"use client";

// =============================================================================
// React Query hooks for dashboard data
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BuyerHistory, Order, OrderInput, OrderStatus, Product, Shop } from "@/modules/orders/schemas";
import type { OrderStats } from "@/modules/orders/order-service";
import type { ExtractedOrder } from "@/modules/orders/extract-service";
import { apiFetch } from "./client";

export type { OrderStats };
export type ExtractedDraft = ExtractedOrder & { buyer: BuyerHistory | null };

export interface OrderFilters {
  status?: OrderStatus;
  q?: string;
  limit?: number;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** ISO timestamp of the first day of the current month, local time. */
export function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () =>
      apiFetch<{ data: Order[] }>(`/api/orders${toQuery({ ...filters })}`).then((r) => r.data),
  });
}

function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["buyer"] });
  };
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (input: OrderInput) =>
      apiFetch<{ data: Order }>("/api/orders", { method: "POST", body: JSON.stringify(input) }).then(
        (r) => r.data
      ),
    onSuccess: invalidate,
  });
}

export type OrderUpdate = Partial<OrderInput> & { status?: OrderStatus; confirmSent?: true };

export function useUpdateOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, ...changes }: OrderUpdate & { id: string }) =>
      apiFetch<{ data: Order }>(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }).then((r) => r.data),
    onSuccess: invalidate,
  });
}

export function useDeleteOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/orders/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useExtractOrder() {
  return useMutation({
    mutationFn: (chat: string) =>
      apiFetch<{ data: ExtractedDraft }>("/api/orders/extract", {
        method: "POST",
        body: JSON.stringify({ chat }),
      }).then((r) => r.data),
  });
}

/** Past orders for a phone typed into the form (disabled until it has 8+ digits). */
export function useBuyerHistory(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return useQuery({
    queryKey: ["buyer", digits],
    queryFn: () =>
      apiFetch<{ data: BuyerHistory | null }>(`/api/orders/buyer${toQuery({ phone: digits })}`).then(
        (r) => r.data
      ),
    enabled: digits.length >= 8,
    staleTime: 30_000,
  });
}

export function useStats(from: string) {
  return useQuery({
    queryKey: ["stats", from],
    queryFn: () => apiFetch<{ data: OrderStats }>(`/api/stats${toQuery({ from })}`).then((r) => r.data),
  });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<{ data: Product[] }>("/api/products").then((r) => r.data),
  });
}

type ProductInput = Omit<Product, "id">;

export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ProductInput & { id?: string }) =>
      apiFetch<{ data: Product }>(id ? `/api/products/${id}` : "/api/products", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

// ---------------------------------------------------------------------------
// Shop settings
// ---------------------------------------------------------------------------

export function useShop() {
  return useQuery({
    queryKey: ["shop"],
    queryFn: () => apiFetch<{ data: Shop }>("/api/shop").then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<Shop>) =>
      apiFetch<{ data: Shop }>("/api/shop", { method: "PATCH", body: JSON.stringify(changes) }).then(
        (r) => r.data
      ),
    onSuccess: (shop) => queryClient.setQueryData(["shop"], shop),
  });
}
