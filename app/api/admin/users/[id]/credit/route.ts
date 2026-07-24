import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRouteSession } from "@/lib/auth";

const bodySchema = z.object({
  amount: z.number().refine((n) => n !== 0, "Amount must be non-zero."),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.profile.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: newBalance, error } = await supabase.rpc("adjust_balance", {
    p_user_id: params.id,
    p_delta: parsed.data.amount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("payments").insert({
    user_id: params.id,
    // signed: positive = credit, negative = debit/correction
    amount: parsed.data.amount,
    type: "wallet_topup",
    method: "manual",
    note: parsed.data.note || (parsed.data.amount > 0 ? "Manual credit" : "Manual debit"),
    confirmed_by: session.userId,
  });

  return NextResponse.json({ balance: newBalance });
}
