import { createClient } from "@/lib/supabase/server";
import AdminUsersManager from "@/components/admin/AdminUsersManager";
import Pagination from "@/components/admin/Pagination";
import type { Profile } from "@/lib/types";

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = (searchParams.q ?? "").trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "customer");

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: users, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<Profile[]>();

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <AdminUsersManager initialUsers={users ?? []} totalCount={total} query={q} />
      <Pagination page={page} totalPages={totalPages} basePath="/admin/users" query={q ? { q } : {}} />
    </div>
  );
}
