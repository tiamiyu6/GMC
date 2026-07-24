import { talk, isMikrotikMocked } from "./client";

/** RouterOS hotspot user actions needed by the voucher lifecycle. */

async function findHotspotUserId(username: string): Promise<string | null> {
  const replies = await talk(["/ip/hotspot/user/print", `?name=${username}`]);
  const first = replies[0];
  return first?.attrs[".id"] ?? null;
}

export interface CreateVoucherOptions {
  username: string;
  password: string;
  profile: string;
  /** Optional: RouterOS "limit-uptime" value, e.g. "1d" - total connected time allowed. */
  limitUptime?: string;
}

/**
 * Creates (or re-enables + re-configures) a RouterOS hotspot user for a
 * voucher. Idempotent: safe to call again for the same voucher code.
 */
export async function createOrEnableHotspotUser(opts: CreateVoucherOptions): Promise<void> {
  if (isMikrotikMocked()) {
    console.info("[mikrotik:mock] createOrEnableHotspotUser", opts);
    return;
  }

  const existingId = await findHotspotUserId(opts.username);

  if (existingId) {
    const args = [
      "/ip/hotspot/user/set",
      `=.id=${existingId}`,
      `=password=${opts.password}`,
      `=profile=${opts.profile}`,
      "=disabled=no",
    ];
    if (opts.limitUptime) args.push(`=limit-uptime=${opts.limitUptime}`);
    await talk(args);
    return;
  }

  const args = [
    "/ip/hotspot/user/add",
    `=name=${opts.username}`,
    `=password=${opts.password}`,
    `=profile=${opts.profile}`,
    "=disabled=no",
  ];
  if (opts.limitUptime) args.push(`=limit-uptime=${opts.limitUptime}`);
  await talk(args);
}

async function disconnectActiveSession(username: string): Promise<void> {
  const active = await talk(["/ip/hotspot/active/print", `?user=${username}`]);
  for (const session of active) {
    const id = session.attrs[".id"];
    if (id) {
      await talk(["/ip/hotspot/active/remove", `=.id=${id}`]);
    }
  }
}

/** Disables a voucher's hotspot user and kicks any active session immediately. */
export async function disableHotspotUser(username: string): Promise<void> {
  if (isMikrotikMocked()) {
    console.info("[mikrotik:mock] disableHotspotUser", { username });
    return;
  }

  const id = await findHotspotUserId(username);
  if (id) {
    await talk(["/ip/hotspot/user/set", `=.id=${id}`, "=disabled=yes"]);
  }
  await disconnectActiveSession(username);
}

/** Re-enables a previously disabled/expired voucher (payment confirmed after the fact). */
export async function reEnableHotspotUser(username: string, profile: string): Promise<void> {
  if (isMikrotikMocked()) {
    console.info("[mikrotik:mock] reEnableHotspotUser", { username, profile });
    return;
  }

  const id = await findHotspotUserId(username);
  if (!id) {
    // The user record may have been removed manually on the router; recreate it.
    await talk(["/ip/hotspot/user/add", `=name=${username}`, `=password=${username}`, `=profile=${profile}`, "=disabled=no"]);
    return;
  }
  await talk(["/ip/hotspot/user/set", `=.id=${id}`, "=disabled=no", `=profile=${profile}`]);
}

export async function removeHotspotUser(username: string): Promise<void> {
  if (isMikrotikMocked()) {
    console.info("[mikrotik:mock] removeHotspotUser", { username });
    return;
  }
  const id = await findHotspotUserId(username);
  if (id) {
    await talk(["/ip/hotspot/user/remove", `=.id=${id}`]);
  }
}
