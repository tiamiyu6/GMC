import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expirePendingVouchers } from "@/lib/orders";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const result = await expirePendingVouchers(supabase);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/expire-vouchers] failed:", err);
    return NextResponse.json({ error: "Failed to expire vouchers." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
