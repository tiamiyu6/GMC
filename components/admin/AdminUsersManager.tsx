"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function AdminUsersManager({
  initialUsers,
  totalCount,
  query,
}: {
  initialUsers: Profile[];
  totalCount: number;
  query: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => setUsers(initialUsers), [initialUsers]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("q", searchInput.trim());
    router.push(`/admin/users${params.toString() ? `?${params.toString()}` : ""}`);
  }
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCredit(id: string) {
    setOpenId(id);
    setAmount("");
    setNote("");
    setError(null);
  }

  async function submitCredit(id: string) {
    const delta = Number(amount);
    if (!delta) {
      setError("Enter a non-zero amount.");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${id}/credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: delta, note }),
    });

    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not update balance.");
      return;
    }

    const { balance } = await res.json();
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, balance } : u)));
    setOpenId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-600">
            {totalCount.toLocaleString()} customer{totalCount === 1 ? "" : "s"} across the network.
          </p>
        </div>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            className="input w-56"
            placeholder="Search name or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button className="btn-secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Phone</th>
              <th className="pb-2 font-medium">Joined</th>
              <th className="pb-2 font-medium">Balance</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td className="py-2 font-medium text-slate-900">{u.full_name ?? "-"}</td>
                  <td className="py-2">{u.phone ?? "-"}</td>
                  <td className="py-2">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-2 font-medium">{formatMoney(u.balance)}</td>
                  <td className="py-2 text-right">
                    <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => openCredit(u.id)}>
                      Adjust balance
                    </button>
                  </td>
                </tr>
                {openId === u.id && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 py-3">
                      <div className="flex flex-wrap items-end gap-3 px-2">
                        <div>
                          <label className="label">Amount (negative to debit)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="label">Note</label>
                          <input
                            className="input"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Bank transfer ref #1234"
                          />
                        </div>
                        <button className="btn-primary" disabled={busy} onClick={() => submitCredit(u.id)}>
                          {busy ? "Saving..." : "Save"}
                        </button>
                        <button className="btn-secondary" onClick={() => setOpenId(null)}>
                          Cancel
                        </button>
                      </div>
                      {error && <p className="mt-2 px-2 text-sm text-red-600">{error}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
