import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRouteSession } from "@/lib/auth";
import { cancelOrder, OrderError } from "@/lib/orders";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await getRouteSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const isAdmin = session.profile.role === "admin";
    const order = await cancelOrder(supabase, params.id, isAdmin ? null : session.userId);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/orders/cancel] unexpected error:", err);
    return NextResponse.json({ error: "Could not cancel order." }, { status: 500 });
  }
}
