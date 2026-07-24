import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRouteSession } from "@/lib/auth";

const packageSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().nonnegative(),
  duration_days: z.number().int().positive(),
  speed: z.string().nullable().optional(),
  data_limit_gb: z.number().nonnegative().nullable().optional(),
  mikrotik_profile: z.string().min(1),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from("packages").select("*").order("price", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ packages: data });
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.profile.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const parsed = packageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid package." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.from("packages").insert(parsed.data).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ package: data });
}
