"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Package } from "@/lib/types";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration_days: "",
  speed: "",
  data_limit_gb: "",
  mikrotik_profile: "",
  is_active: true,
};

type FormState = typeof emptyForm;

function toFormState(pkg: Package): FormState {
  return {
    name: pkg.name,
    description: pkg.description ?? "",
    price: String(pkg.price),
    duration_days: String(pkg.duration_days),
    speed: pkg.speed ?? "",
    data_limit_gb: pkg.data_limit_gb != null ? String(pkg.data_limit_gb) : "",
    mikrotik_profile: pkg.mikrotik_profile,
    is_active: pkg.is_active,
  };
}

export default function PackagesManager({ initialPackages }: { initialPackages: Package[] }) {
  const router = useRouter();
  const [packages, setPackages] = useState(initialPackages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setForm(emptyForm);
    setError(null);
  }

  function startEdit(pkg: Package) {
    setCreating(false);
    setEditingId(pkg.id);
    setForm(toFormState(pkg));
    setError(null);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setError(null);
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      duration_days: Number(form.duration_days),
      speed: form.speed.trim() || null,
      data_limit_gb: form.data_limit_gb.trim() ? Number(form.data_limit_gb) : null,
      mikrotik_profile: form.mikrotik_profile.trim(),
      is_active: form.is_active,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload = buildPayload();
    const url = editingId ? `/api/packages/${editingId}` : "/api/packages";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save package.");
      return;
    }

    const { package: saved } = await res.json();

    setPackages((current) => {
      if (editingId) return current.map((p) => (p.id === editingId ? saved : p));
      return [...current, saved].sort((a, b) => a.price - b.price);
    });

    cancelForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this package? Existing vouchers won't be affected.")) return;
    setBusy(true);
    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not delete package.");
      return;
    }

    setPackages((current) => current.filter((p) => p.id !== id));
    router.refresh();
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Packages</h1>
        {!showForm && (
          <button className="btn-primary" onClick={startCreate}>
            Add package
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-semibold text-slate-900">{editingId ? "Edit package" : "New package"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Mikrotik hotspot profile</label>
              <input
                className="input"
                required
                value={form.mikrotik_profile}
                onChange={(e) => setForm({ ...form, mikrotik_profile: e.target.value })}
                placeholder="e.g. weekly-standard"
              />
            </div>
            <div>
              <label className="label">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Duration (days)</label>
              <input
                type="number"
                min="1"
                className="input"
                required
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Speed</label>
              <input
                className="input"
                value={form.speed}
                onChange={(e) => setForm({ ...form, speed: e.target.value })}
                placeholder="e.g. 10 Mbps"
              />
            </div>
            <div>
              <label className="label">Data limit (GB, blank = unlimited)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="input"
                value={form.data_limit_gb}
                onChange={(e) => setForm({ ...form, data_limit_gb: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Visible to customers
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save package"}
            </button>
            <button className="btn-secondary" type="button" onClick={cancelForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Price</th>
              <th className="pb-2 font-medium">Duration</th>
              <th className="pb-2 font-medium">Mikrotik profile</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="py-2 font-medium text-slate-900">{pkg.name}</td>
                <td className="py-2">{pkg.price}</td>
                <td className="py-2">{pkg.duration_days}d</td>
                <td className="py-2 font-mono text-xs">{pkg.mikrotik_profile}</td>
                <td className="py-2">
                  <span className={`badge ${pkg.is_active ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-600"}`}>
                    {pkg.is_active ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => startEdit(pkg)}>
                    Edit
                  </button>
                  <button
                    className="ml-3 text-sm font-medium text-red-600 hover:underline"
                    onClick={() => handleDelete(pkg.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No packages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
