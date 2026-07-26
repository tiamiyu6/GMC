"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import type { Order, OrderStatus } from "@/lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Awaiting payment", value: "pending_payment" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
];

function filterHref(status: OrderStatus | "all", query: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default function AdminOrdersManager({
  initialOrders,
  totalCount,
  status,
  query,
}: {
  initialOrders: Order[];
  totalCount: number;
  status: OrderStatus | "all";
  query: string;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchInput, setSearchInput] = useState(query);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => setOrders(initialOrders), [initialOrders]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        setOrders((current) => {
          if (payload.eventType === "DELETE") {
            return current.filter((o) => o.id !== (payload.old as Order).id);
          }
          const incoming = payload.new as Order;
          const idx = current.findIndex((o) => o.id === incoming.id);
          if (idx === -1) {
            // Only splice a brand-new order into view if it matches the
            // current status filter - otherwise it belongs on another tab.
            if (status !== "all" && incoming.status !== status) return current;
            return [incoming, ...current];
          }
          const next = [...current];
          next[idx] = { ...next[idx], ...incoming };
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(filterHref(status, searchInput.trim()));
  }

  async function confirmPayment(id: string) {
    setBusyId(id);
    setErrorId(null);
    const res = await fetch(`/api/orders/${id}/confirm`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorId({ id, message: body.error ?? "Could not confirm payment." });
      return;
    }
    router.refresh();
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this voucher?")) return;
    setBusyId(id);
    setErrorId(null);
    const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorId({ id, message: body.error ?? "Could not cancel order." });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vouchers</h1>
          <p className="mt-1 text-sm text-slate-600">
            {totalCount.toLocaleString()} matching voucher{totalCount === 1 ? "" : "s"} &middot; updates live as customers order and vouchers expire.
          </p>
        </div>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            className="input w-48"
            placeholder="Search voucher code..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button className="btn-secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={filterHref(f.value, query)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              status === f.value ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Package</th>
              <th className="pb-2 font-medium">Voucher</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Claimed paid</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="py-2">
                  <p className="font-medium text-slate-900">{order.profiles?.full_name ?? "-"}</p>
                  <p className="text-xs text-slate-500">{order.profiles?.phone}</p>
                </td>
                <td className="py-2">{order.packages?.name}</td>
                <td className="py-2 font-mono text-xs">{order.voucher_code}</td>
                <td className="py-2">{formatMoney(order.amount)}</td>
                <td className="py-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-2">
                  {order.payment_claimed_at ? new Date(order.payment_claimed_at).toLocaleString() : "-"}
                </td>
                <td className="py-2 text-right">
                  {(order.status === "pending_payment" || order.status === "expired") && (
                    <button
                      className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                      disabled={busyId === order.id}
                      onClick={() => confirmPayment(order.id)}
                    >
                      Confirm payment
                    </button>
                  )}
                  {order.status === "pending_payment" && (
                    <button
                      className="ml-3 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                      disabled={busyId === order.id}
                      onClick={() => cancelOrder(order.id)}
                    >
                      Cancel
                    </button>
                  )}
                  {errorId?.id === order.id && <p className="mt-1 text-xs text-red-600">{errorId.message}</p>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  No vouchers in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
