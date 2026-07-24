import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PackageCard from "@/components/PackageCard";
import PlaceOrderButton from "@/components/PlaceOrderButton";
import type { Package } from "@/lib/types";

export default async function CustomerPackagesPage() {
  const { profile } = await requireProfile();
  const supabase = createClient();

  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true })
    .returns<Package[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Packages</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick a package to get an instant voucher. If your wallet balance doesn&apos;t cover it, you&apos;ll have 10
          minutes to send payment before the voucher deactivates.
        </p>
      </div>

      {packages && packages.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              action={<PlaceOrderButton packageId={pkg.id} price={pkg.price} balance={profile.balance} />}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center text-sm text-slate-500">No packages available right now.</div>
      )}
    </div>
  );
}
