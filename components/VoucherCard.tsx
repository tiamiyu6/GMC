"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import Countdown from "@/components/Countdown";
import type { Order } from "@/lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function VoucherCard({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function claimPaid() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/orders/${order.id}/claim`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Something went wrong.");
      return;
    }
    setMessage("Thanks! We've notified the admin team - your voucher will be reactivated once payment is confirmed.");
    router.refresh();
  }

  async function cancel() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/orders/${order.id}/cancel`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Could not cancel this order.");
      return;
    }
    router.refresh();
  }

  async function copyCode() {
    await navigator.clipboard.writeText(order.voucher_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const pkg = order.packages;

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{pkg?.name ?? "Package"}</p>
          <button
            onClick={copyCode}
            className="mt-1 rounded-md bg-slate-900 px-3 py-1.5 font-mono text-lg tracking-widest text-white hover:bg-slate-800"
            title="Click to copy"
          >
            {order.voucher_code}
          </button>
          {copied && <span className="ml-2 text-xs text-brand-600">Copied!</span>}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Amount</dt>
          <dd className="font-medium">{formatMoney(order.amount)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Speed</dt>
          <dd className="font-medium">{pkg?.speed ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Ordered</dt>
          <dd className="font-medium">{new Date(order.created_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Paid from wallet</dt>
          <dd className="font-medium">{order.paid_from_balance ? "Yes" : "No"}</dd>
        </div>
      </dl>

      {order.status === "pending_payment" && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Send payment now &mdash; this voucher works for the next{" "}
            <Countdown target={order.expires_at} onExpire={() => router.refresh()} className="font-mono font-semibold" />{" "}
            and switches off automatically if payment isn&apos;t confirmed in time.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy || !!order.payment_claimed_at} onClick={claimPaid}>
              {order.payment_claimed_at ? "Admin notified" : "I've sent the money"}
            </button>
            <button className="btn-secondary" disabled={busy} onClick={cancel}>
              Cancel order
            </button>
          </div>
        </div>
      )}

      {order.status === "expired" && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          This voucher expired because payment wasn&apos;t confirmed in time. If you already sent the money, let us know
          and an admin can reactivate it.
          <div className="mt-3">
            <button className="btn-primary" disabled={busy || !!order.payment_claimed_at} onClick={claimPaid}>
              {order.payment_claimed_at ? "Admin notified" : "I've sent the money"}
            </button>
          </div>
        </div>
      )}

      {order.status === "active" && order.valid_until && (
        <div className="mt-4 rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
          Valid until <strong>{new Date(order.valid_until).toLocaleString()}</strong>.
        </div>
      )}

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
