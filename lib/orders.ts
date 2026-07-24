import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Order, Package } from "@/lib/types";
import { generateVoucherCode, graceDeadline, addDays } from "@/lib/voucher";
import {
  createOrEnableHotspotUser,
  disableHotspotUser,
  reEnableHotspotUser,
} from "@/lib/mikrotik/hotspot";

type DB = SupabaseClient<Database>;

/** Router calls must never take the whole billing flow down with them. */
async function safeMikrotik(label: string, fn: () => Promise<void>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mikrotik] ${label} failed:`, message);
    return message;
  }
}

export class OrderError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "OrderError";
  }
}

export async function createOrder(
  db: DB,
  userId: string,
  packageId: string
): Promise<{ order: Order; mikrotikWarning: string | null }> {
  const { data: pkg, error: pkgError } = await db
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .eq("is_active", true)
    .single<Package>();

  if (pkgError || !pkg) {
    throw new OrderError("Package not found or no longer available.", 404);
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new OrderError("Profile not found.", 404);
  }

  const paidFromBalance = Number(profile.balance) >= Number(pkg.price);
  const now = new Date();

  let inserted: Order | null = null;
  let lastError: unknown = null;

  // Voucher codes are short random strings; collisions are rare but retry a
  // few times against the unique constraint rather than pre-checking.
  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    const voucherCode = generateVoucherCode();
    const insertPayload: Database["public"]["Tables"]["orders"]["Insert"] = {
      user_id: userId,
      package_id: pkg.id,
      voucher_code: voucherCode,
      mikrotik_username: voucherCode,
      amount: pkg.price,
      expires_at: graceDeadline(now).toISOString(),
      paid_from_balance: paidFromBalance,
      status: paidFromBalance ? "active" : "pending_payment",
      activated_at: paidFromBalance ? now.toISOString() : null,
      valid_until: paidFromBalance ? addDays(now, pkg.duration_days).toISOString() : null,
    };

    const { data, error } = await db
      .from("orders")
      .insert(insertPayload)
      .select("*")
      .single<Order>();

    if (error) {
      lastError = error;
      if (error.code !== "23505") break; // not a unique-violation, don't retry
      continue;
    }
    inserted = data;
  }

  if (!inserted) {
    throw new OrderError(
      lastError instanceof Error ? lastError.message : "Could not create order, please try again.",
      500
    );
  }

  if (paidFromBalance) {
    const { error: balanceError } = await db.rpc("adjust_balance", {
      p_user_id: userId,
      p_delta: -pkg.price,
    });
    if (balanceError) {
      console.error("[orders] balance deduction failed:", balanceError.message);
    } else {
      await db.from("payments").insert({
        user_id: userId,
        order_id: inserted.id,
        amount: pkg.price,
        type: "order_payment",
        method: "wallet",
        note: "Paid instantly from wallet balance.",
      });
    }
  }

  const mikrotikWarning = await safeMikrotik("createOrEnableHotspotUser", () =>
    createOrEnableHotspotUser({
      username: inserted!.voucher_code,
      password: inserted!.voucher_code,
      profile: pkg.mikrotik_profile,
    })
  );

  return { order: inserted, mikrotikWarning };
}

export async function claimPayment(db: DB, orderId: string, userId: string): Promise<Order> {
  const { data, error } = await db
    .from("orders")
    .update({ payment_claimed_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("user_id", userId)
    .in("status", ["pending_payment", "expired"])
    .select("*")
    .single<Order>();

  if (error || !data) {
    throw new OrderError("Order not found or can no longer be claimed as paid.", 404);
  }
  return data;
}

export async function cancelOrder(db: DB, orderId: string, userId: string | null): Promise<Order> {
  let query = db.from("orders").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  }).eq("id", orderId).eq("status", "pending_payment");

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query.select("*").single<Order>();

  if (error || !data) {
    throw new OrderError("Order not found or cannot be cancelled.", 404);
  }

  await safeMikrotik("disableHotspotUser(cancel)", () => disableHotspotUser(data.mikrotik_username));
  return data;
}

export async function confirmPayment(
  db: DB,
  orderId: string,
  adminId: string
): Promise<{ order: Order; mikrotikWarning: string | null }> {
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("*, packages(*)")
    .eq("id", orderId)
    .single<Order>();

  if (orderError || !order) {
    throw new OrderError("Order not found.", 404);
  }
  if (order.status === "cancelled") {
    throw new OrderError("This order was cancelled and cannot be confirmed.", 400);
  }
  if (order.status === "active") {
    throw new OrderError("This voucher is already active.", 400);
  }

  const pkg = order.packages!;
  const now = new Date();
  const validUntil = addDays(now, pkg.duration_days);

  const { data: updated, error: updateError } = await db
    .from("orders")
    .update({
      status: "active",
      activated_at: now.toISOString(),
      valid_until: validUntil.toISOString(),
      confirmed_by: adminId,
    })
    .eq("id", orderId)
    .select("*")
    .single<Order>();

  if (updateError || !updated) {
    throw new OrderError("Could not confirm payment.", 500);
  }

  await db.from("payments").insert({
    user_id: order.user_id,
    order_id: order.id,
    amount: order.amount,
    type: "order_payment",
    method: "manual",
    note: "Manual payment confirmed by admin (bank transfer/cash).",
    confirmed_by: adminId,
  });

  const mikrotikWarning = await safeMikrotik("reEnableHotspotUser", () =>
    reEnableHotspotUser(order.mikrotik_username, pkg.mikrotik_profile)
  );

  return { order: updated, mikrotikWarning };
}

/** Called by the scheduled cron endpoint. Disables + expires unpaid vouchers past their 10-minute window. */
export async function expirePendingVouchers(db: DB): Promise<{ expired: number }> {
  const { data: dueOrders, error } = await db
    .from("orders")
    .select("id, mikrotik_username")
    .eq("status", "pending_payment")
    .lte("expires_at", new Date().toISOString());

  if (error) throw new OrderError(error.message, 500);
  if (!dueOrders || dueOrders.length === 0) return { expired: 0 };

  for (const order of dueOrders) {
    await safeMikrotik("disableHotspotUser(expire)", () => disableHotspotUser(order.mikrotik_username));
  }

  const ids = dueOrders.map((o) => o.id);
  const { error: updateError } = await db.from("orders").update({ status: "expired" }).in("id", ids);
  if (updateError) throw new OrderError(updateError.message, 500);

  return { expired: ids.length };
}
