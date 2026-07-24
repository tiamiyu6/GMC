import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getSessionProfile(): Promise<{ userId: string; email: string | null; profile: Profile } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return null;

  return { userId: user.id, email: user.email ?? null, profile };
}

export async function requireProfile(): Promise<{ userId: string; email: string | null; profile: Profile }> {
  const session = await getSessionProfile();
  if (!session) redirect("/signin");
  return session;
}

export async function requireAdmin(): Promise<{ userId: string; email: string | null; profile: Profile }> {
  const session = await requireProfile();
  if (session.profile.role !== "admin") redirect("/dashboard");
  return session;
}

/** Non-redirecting variant for Route Handlers - callers return a 401/403 JSON response instead. */
export async function getRouteSession(): Promise<{ userId: string; profile: Profile } | null> {
  const session = await getSessionProfile();
  if (!session) return null;
  return { userId: session.userId, profile: session.profile };
}
