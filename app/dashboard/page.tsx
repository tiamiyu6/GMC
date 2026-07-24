import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import type { Order } from "@/lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default async function DashboardOverviewPage() {
  const { userId, profile } = await requireProfile();
  const supabase = createClient();

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("*, packages(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Order[]>();

  const activeCount = recentOrders?.filter((o) => o.status === "active").length ?? 0;
  const pendingCount = recentOrders?.filter((o) => o.status === "pending_payment").length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back{profile.full_name ? `, ${profile.full_name}` : ""}</h1>
        <p className="mt-1 text-sm text-slate-600">Here&apos;s what&apos;s happening with your account.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Wallet balance</p>
          <p className="mt-1 text-3xl font-bold text-brand-700">{formatMoney(profile.balance)}</p>
          <Link href="/dashboard/wallet" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            View wallet &rarr;
          </Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Active vouchers</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{activeCount}</p>
          <Link href="/dashboard/orders" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            View vouchers &rarr;
          </Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Awaiting payment</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{pendingCount}</p>
          <Link href="/dashboard/packages" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            Buy a package &rarr;
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-sm font-medium text-brand-700 hover:underline">
            See all
          </Link>
        </div>
        {recentOrders && recentOrders.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">{order.packages?.name}</p>
                  <p className="font-mono text-xs text-slate-500">{order.voucher_code}</p>
                </div>
                <StatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
