import { createClient } from "@/lib/supabase/server";
import AdminOrdersManager from "@/components/admin/AdminOrdersManager";
import type { Order } from "@/lib/types";

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, packages(*), profiles(id, full_name, phone)")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Order[]>();

  return <AdminOrdersManager initialOrders={orders ?? []} />;
}
