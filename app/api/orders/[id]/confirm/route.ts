import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRouteSession } from "@/lib/auth";
import { confirmPayment, OrderError } from "@/lib/orders";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await getRouteSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session.profile.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  try {
    const supabase = createClient();
    const { order, mikrotikWarning } = await confirmPayment(supabase, params.id, session.userId);
    return NextResponse.json({ order, mikrotikWarning });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/orders/confirm] unexpected error:", err);
    return NextResponse.json({ error: "Could not confirm payment." }, { status: 500 });
  }
}
