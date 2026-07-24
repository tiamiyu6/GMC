import type { Package } from "@/lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function PackageCard({ pkg, action }: { pkg: Package; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{pkg.name}</h3>
        {!pkg.is_active && <span className="badge bg-slate-200 text-slate-600">Inactive</span>}
      </div>
      {pkg.description && <p className="mt-1 text-sm text-slate-600">{pkg.description}</p>}

      <p className="mt-4 text-3xl font-bold text-brand-700">{formatMoney(pkg.price)}</p>

      <dl className="mt-4 space-y-1 text-sm text-slate-600">
        <div className="flex justify-between">
          <dt>Duration</dt>
          <dd className="font-medium text-slate-900">{pkg.duration_days} day{pkg.duration_days === 1 ? "" : "s"}</dd>
        </div>
        {pkg.speed && (
          <div className="flex justify-between">
            <dt>Speed</dt>
            <dd className="font-medium text-slate-900">{pkg.speed}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Data</dt>
          <dd className="font-medium text-slate-900">{pkg.data_limit_gb ? `${pkg.data_limit_gb} GB` : "Unlimited"}</dd>
        </div>
      </dl>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
