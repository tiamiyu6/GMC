"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlaceOrderButton({ packageId, price, balance }: { packageId: string; price: number; balance: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: packageId }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not place order.");
      return;
    }

    router.push("/dashboard/orders");
    router.refresh();
  }

  const willUseBalance = balance >= price;

  return (
    <div>
      <button className="btn-primary w-full" disabled={loading} onClick={placeOrder}>
        {loading ? "Placing order..." : willUseBalance ? "Pay from wallet" : "Get voucher"}
      </button>
      {!willUseBalance && (
        <p className="mt-2 text-xs text-slate-500">
          Insufficient wallet balance &mdash; you&apos;ll get a 10-minute voucher to send payment manually.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
