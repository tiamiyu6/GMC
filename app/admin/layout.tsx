import NavBar from "@/components/NavBar";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <>
      <NavBar session={{ fullName: profile.full_name, role: profile.role }} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
