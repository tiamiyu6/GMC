# GMC ISP Billing

A self-service ISP billing portal: customers buy internet access packages and
get an instant voucher tied to a Mikrotik RouterOS hotspot user. There is
**no payment gateway** — customers pay out of band (bank transfer, cash,
mobile money, etc.) and an admin manually confirms the payment.

## How the voucher flow works

1. A customer places an order for a package.
   - If their wallet balance already covers the price, the voucher activates
     immediately (balance is deducted).
   - Otherwise a voucher is issued and **enabled on the router right away**,
     giving the customer a **10 minute grace window** to send payment.
2. A background job (`/api/cron/expire-vouchers`) runs every couple of
   minutes. Any voucher still `pending_payment` past its 10-minute deadline
   is disabled on the router and marked `expired`.
3. When the admin confirms payment was received (Admin → Vouchers → *Confirm
   payment*), the voucher is **re-enabled** on the router and given the
   package's full validity period (`duration_days`), regardless of whether it
   had already expired.
4. Customers can hit **"I've sent the money"** on a pending/expired voucher to
   flag it for the admin — this is informational only, it does not reactivate
   anything by itself.

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **Supabase**: Postgres + Auth + Row Level Security + Realtime
- **Mikrotik RouterOS API**: a small hand-written TCP client
  (`lib/mikrotik/`) that speaks the RouterOS API binary protocol directly —
  no extra runtime dependency. It manages `/ip/hotspot/user` entries.

## Project layout

```
app/
  page.tsx                 landing page
  signup/, signin/         auth
  dashboard/                customer portal (overview, packages, vouchers, wallet)
  admin/                     admin dashboard (overview/revenue, packages, vouchers, customers)
  api/
    orders/                 place order, confirm/cancel/claim payment
    packages/                package CRUD
    admin/users/[id]/credit  manual wallet top-up / debit
    cron/expire-vouchers     scheduled voucher expiry
lib/
  supabase/                browser/server/service-role Supabase clients
  mikrotik/                RouterOS API protocol + hotspot user helpers
  orders.ts                order/voucher business logic shared by API routes
  voucher.ts               voucher code generation, time helpers
supabase/migrations/0001_init.sql   full DB schema, RLS policies, seed packages
```

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or via
   `supabase db push` if you use the CLI). It creates all tables, RLS
   policies, the `adjust_balance` RPC, a trigger that auto-creates a
   `profiles` row on sign-up, and seeds three example packages.
3. Copy the Project URL, anon key and service role key into `.env.local`
   (see `.env.example`).
4. Promote your own account to admin after signing up once, in the SQL
   editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-auth-user-id>';
   ```

### 2. Mikrotik RouterOS

1. Enable the API service: **IP → Services → api** (port 8728) or
   **api-ssl** (port 8729) if you want TLS.
2. Create a dedicated API user with hotspot-management permissions rather
   than reusing `admin`.
3. Create one **hotspot user profile per package** (IP → Hotspot →
   Profiles) — the profile name is what you enter as "Mikrotik hotspot
   profile" when creating a package in the admin dashboard. Rate limits,
   session limits, etc. live on the profile.
4. Fill in `MIKROTIK_HOST`, `MIKROTIK_PORT`, `MIKROTIK_USER`,
   `MIKROTIK_PASSWORD` in `.env.local`.
5. For local development without a router, leave `MIKROTIK_MOCK=true` — all
   router calls are logged to the console instead of executed.

### 3. Cron (voucher expiry)

The 10-minute grace period is enforced by `/api/cron/expire-vouchers`,
which must be called every 1-5 minutes:

- **Vercel**: `vercel.json` already defines a cron every 2 minutes. Set a
  `CRON_SECRET` env var in your Vercel project — Vercel automatically sends
  it as `Authorization: Bearer <CRON_SECRET>` on cron invocations.
- **Anywhere else**: `.github/workflows/expire-vouchers.yml` is a ready-made
  GitHub Actions fallback. Set the `CRON_SECRET` and `APP_URL` repository
  secrets, or point any external scheduler (cron, cron-job.org, etc.) at the
  endpoint with the same header.

### 4. Run locally

```bash
cp .env.example .env.local   # then fill in the values above
npm install
npm run dev
```

## Notes

- Every page listed under `dashboard/` and `admin/` requires auth; `admin/`
  additionally requires `profiles.role = 'admin'` (enforced both by
  `middleware.ts`/layouts and by RLS policies, not just the UI).
- Wallet balances and vouchers update live via Supabase Realtime — no manual
  refresh needed after an admin confirms a payment or a voucher expires.
- There is intentionally no card/mobile-money payment integration. Revenue
  and wallet balances are driven entirely by admin-confirmed manual
  payments.
