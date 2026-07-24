import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CustomerOrdersRealtime from "@/components/CustomerOrdersRealtime";
import type { Order } from "@/lib/types";

export default async function CustomerOrdersPage() {
  const { userId } = await requireProfile();
  const supabase = createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*, packages(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My vouchers</h1>
        <p className="mt-1 text-sm text-slate-600">Updates live &mdash; no need to refresh after an admin confirms payment.</p>
      </div>

      <CustomerOrdersRealtime userId={userId} initialOrders={orders ?? []} />
    </div>
  );
}
