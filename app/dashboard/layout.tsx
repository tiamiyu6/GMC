import NavBar from "@/components/NavBar";
import { requireProfile } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  return (
    <>
      <NavBar session={{ fullName: profile.full_name, role: profile.role }} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
