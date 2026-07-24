import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import type { Order, Payment } from "@/lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: allPayments },
    { data: monthPayments },
    { count: activeCount },
    { count: pendingCount },
    { count: customerCount },
    { data: walletTotals },
    { data: pendingOrders },
  ] = await Promise.all([
    supabase.from("payments").select("amount").eq("type", "order_payment").returns<Pick<Payment, "amount">[]>(),
    supabase
      .from("payments")
      .select("amount")
      .eq("type", "order_payment")
      .gte("created_at", startOfMonth.toISOString())
      .returns<Pick<Payment, "amount">[]>(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("profiles").select("balance"),
    supabase
      .from("orders")
      .select("*, packages(*), profiles(id, full_name, phone)")
      .in("status", ["pending_payment", "expired"])
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<Order[]>(),
  ]);

  const totalRevenue = (allPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const monthRevenue = (monthPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const walletFloat = (walletTotals ?? []).reduce((sum, p) => sum + Number(p.balance), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-600">Revenue, vouchers and account health at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total revenue</p>
          <p className="mt-1 text-2xl font-bold text-brand-700">{formatMoney(totalRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Revenue this month</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(monthRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Active vouchers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{activeCount ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Awaiting payment</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Customers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{customerCount ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Customer wallet float</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(walletFloat)}</p>
          <p className="mt-1 text-xs text-slate-500">Prepaid balances held across all customers</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Needs attention</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">
            View all vouchers
          </Link>
        </div>
        {pendingOrders && pendingOrders.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {pendingOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {order.profiles?.full_name ?? "Customer"} &middot; {order.packages?.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500">{order.voucher_code}</p>
                </div>
                <StatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Nothing needs your attention right now.</p>
        )}
      </div>
    </div>
  );
}
