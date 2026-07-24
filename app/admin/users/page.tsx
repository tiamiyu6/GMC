import { createClient } from "@/lib/supabase/server";
import AdminUsersManager from "@/components/admin/AdminUsersManager";
import type { Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .returns<Profile[]>();

  return <AdminUsersManager initialUsers={users ?? []} />;
}
