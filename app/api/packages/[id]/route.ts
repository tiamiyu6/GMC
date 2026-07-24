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

async function requireAdminOrResponse() {
  const session = await getRouteSession();
  if (!session) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (session.profile.role !== "admin") return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { session };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdminOrResponse();
  if (check.error) return check.error;

  const parsed = packageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid package." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("packages")
    .update(parsed.data)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ package: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdminOrResponse();
  if (check.error) return check.error;

  const supabase = createClient();
  const { error } = await supabase.from("packages").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
