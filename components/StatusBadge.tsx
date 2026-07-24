import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  active: "bg-brand-100 text-brand-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-600",
};

const LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${STYLES[status]}`}>{LABELS[status]}</span>;
}
