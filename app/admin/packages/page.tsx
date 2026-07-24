import { createClient } from "@/lib/supabase/server";
import PackagesManager from "@/components/admin/PackagesManager";
import type { Package } from "@/lib/types";

export default async function AdminPackagesPage() {
  const supabase = createClient();
  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .order("price", { ascending: true })
    .returns<Package[]>();

  return <PackagesManager initialPackages={packages ?? []} />;
}
