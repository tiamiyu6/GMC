import Link from "next/link";
import NavBar from "@/components/NavBar";
import { getSessionProfile } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSessionProfile();

  return (
    <>
      <NavBar session={session ? { fullName: session.profile.full_name, role: session.profile.role } : null} />

      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-10 py-16 sm:grid-cols-2">
          <div>
            <span className="badge bg-brand-100 text-brand-700">Mikrotik + Supabase powered</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Self-service internet vouchers, billed your way.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Customers grab a voucher instantly, get 10 minutes of free access to send payment, and your
              hotspot switches itself off automatically if payment isn&apos;t confirmed in time &mdash; no
              payment gateway required.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/signup" className="btn-primary">
                Create an account
              </Link>
              <Link href="/signin" className="btn-secondary">
                Sign in
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">How it works</h2>
            <ol className="mt-4 space-y-4 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
                Pick a package and place an order &mdash; a voucher is issued and enabled on the router immediately.
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
                You have 10 minutes to send payment (bank transfer, cash, etc.) while the voucher is live.
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>
                No confirmation in time? The voucher is disabled automatically. As soon as an admin confirms your
                payment, it&apos;s reactivated for the full package duration.
              </li>
            </ol>
          </div>
        </section>

        <section className="grid gap-6 pb-20 sm:grid-cols-3">
          <div className="card">
            <h3 className="font-semibold text-slate-900">Customer portal</h3>
            <p className="mt-2 text-sm text-slate-600">
              Browse packages, track live voucher countdowns, view balance and full order history.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-900">Admin dashboard</h3>
            <p className="mt-2 text-sm text-slate-600">
              Manage packages, confirm payments, track revenue and every customer&apos;s balance in real time.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-900">Mikrotik integration</h3>
            <p className="mt-2 text-sm text-slate-600">
              Vouchers map directly to RouterOS hotspot users &mdash; enabled, disabled and re-enabled automatically.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
