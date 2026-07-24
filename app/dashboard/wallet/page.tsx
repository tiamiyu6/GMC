import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Payment } from "@/lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default async function WalletPage() {
  const { userId, profile } = await requireProfile();
  const supabase = createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Payment[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your balance is credited by an admin once they confirm a bank transfer or cash payment.
        </p>
      </div>

      <div className="card">
        <p className="text-sm text-slate-500">Current balance</p>
        <p className="mt-1 text-4xl font-bold text-brand-700">{formatMoney(profile.balance)}</p>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900">Transaction history</h2>
        {payments && payments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Note</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-2 capitalize">{p.type.replace("_", " ")}</td>
                    <td className="py-2 capitalize">{p.method}</td>
                    <td className="py-2 text-slate-500">{p.note ?? "-"}</td>
                    <td className="py-2 text-right font-medium">
                      {p.type === "wallet_topup" && (p.amount >= 0 ? "+" : "-")}
                      {p.type === "order_payment" && p.method === "wallet" && "-"}
                      {formatMoney(Math.abs(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}
