import { createClient } from "@/lib/supabase/server";
import AdminOrdersManager from "@/components/admin/AdminOrdersManager";
import Pagination from "@/components/admin/Pagination";
import type { Order, OrderStatus } from "@/lib/types";

const PAGE_SIZE = 25;
const VALID_STATUSES: OrderStatus[] = ["pending_payment", "active", "expired", "cancelled"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = (searchParams.q ?? "").trim();
  const status = VALID_STATUSES.includes(searchParams.status as OrderStatus)
    ? (searchParams.status as OrderStatus)
    : "all";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from("orders").select("*, packages(*), profiles(id, full_name, phone)", { count: "exact" });

  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("voucher_code", `%${q}%`);

  const { data: orders, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<Order[]>();

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const extraQuery: Record<string, string> = {};
  if (q) extraQuery.q = q;
  if (status !== "all") extraQuery.status = status;

  return (
    <div className="space-y-4">
      <AdminOrdersManager initialOrders={orders ?? []} totalCount={total} status={status} query={q} />
      <Pagination page={page} totalPages={totalPages} basePath="/admin/orders" query={extraQuery} />
    </div>
  );
}
