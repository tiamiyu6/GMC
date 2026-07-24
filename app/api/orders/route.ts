import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRouteSession } from "@/lib/auth";
import { createOrder, OrderError } from "@/lib/orders";

const bodySchema = z.object({ package_id: z.string().uuid() });

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid package_id is required." }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const { order, mikrotikWarning } = await createOrder(supabase, session.userId, parsed.data.package_id);
    return NextResponse.json({ order, mikrotikWarning });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/orders] unexpected error:", err);
    return NextResponse.json({ error: "Could not place order." }, { status: 500 });
  }
}
