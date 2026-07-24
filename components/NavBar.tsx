"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

interface NavBarProps {
  session: { fullName: string | null; role: Role } | null;
}

export default function NavBar({ session }: NavBarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const homeHref = session ? (session.role === "admin" ? "/admin" : "/dashboard") : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={homeHref} className="flex items-center gap-2 font-bold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">G</span>
          GMC ISP
        </Link>

        <button
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <div className="hidden items-center gap-4 sm:flex">
          {session ? (
            <>
              {session.role === "admin" ? (
                <>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/admin">
                    Overview
                  </Link>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/admin/packages">
                    Packages
                  </Link>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/admin/orders">
                    Vouchers
                  </Link>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/admin/users">
                    Customers
                  </Link>
                </>
              ) : (
                <>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/dashboard">
                    Overview
                  </Link>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/dashboard/packages">
                    Packages
                  </Link>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/dashboard/orders">
                    My Vouchers
                  </Link>
                  <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/dashboard/wallet">
                    Wallet
                  </Link>
                </>
              )}
              <span className="text-sm text-slate-500">{session.fullName ?? "Account"}</span>
              <button className="btn-secondary" disabled={signingOut} onClick={handleSignOut}>
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link className="text-sm font-medium text-slate-600 hover:text-brand-700" href="/signin">
                Sign in
              </Link>
              <Link className="btn-primary" href="/signup">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-3">
            {session ? (
              <>
                <Link href={session.role === "admin" ? "/admin" : "/dashboard"} onClick={() => setOpen(false)}>
                  Overview
                </Link>
                {session.role === "admin" ? (
                  <>
                    <Link href="/admin/packages" onClick={() => setOpen(false)}>Packages</Link>
                    <Link href="/admin/orders" onClick={() => setOpen(false)}>Vouchers</Link>
                    <Link href="/admin/users" onClick={() => setOpen(false)}>Customers</Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard/packages" onClick={() => setOpen(false)}>Packages</Link>
                    <Link href="/dashboard/orders" onClick={() => setOpen(false)}>My Vouchers</Link>
                    <Link href="/dashboard/wallet" onClick={() => setOpen(false)}>Wallet</Link>
                  </>
                )}
                <button className="btn-secondary w-full" disabled={signingOut} onClick={handleSignOut}>
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" onClick={() => setOpen(false)}>Sign in</Link>
                <Link className="btn-primary w-full" href="/signup" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
