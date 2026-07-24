-- GMC ISP Billing - initial schema
-- Run via `supabase db push` or paste into the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security-definer helper so RLS policies can check role without recursive RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- packages
-- ---------------------------------------------------------------------------
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  duration_days integer not null check (duration_days > 0),
  speed text,
  data_limit_gb numeric(10, 2),
  mikrotik_profile text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders (a.k.a. vouchers)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id uuid not null references public.packages (id),
  voucher_code text not null unique,
  mikrotik_username text not null,
  amount numeric(12, 2) not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'expired', 'cancelled')),
  paid_from_balance boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,       -- 10-minute grace deadline while pending_payment
  activated_at timestamptz,              -- when the voucher was (re)activated
  valid_until timestamptz,               -- service validity end once active
  payment_claimed_at timestamptz,        -- customer-reported "I've sent the money"
  confirmed_by uuid references public.profiles (id),
  cancelled_at timestamptz
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_expires_at_idx on public.orders (expires_at);

-- ---------------------------------------------------------------------------
-- payments (manual confirmations / wallet top-ups - no payment gateway)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  amount numeric(12, 2) not null,
  type text not null check (type in ('order_payment', 'wallet_topup')),
  method text not null default 'manual',
  note text,
  confirmed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_created_at_idx on public.payments (created_at);

-- ---------------------------------------------------------------------------
-- balance helper (atomic, avoids read-modify-write races)
-- ---------------------------------------------------------------------------
create or replace function public.adjust_balance(p_user_id uuid, p_delta numeric)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance numeric;
begin
  update public.profiles
    set balance = balance + p_delta
    where id = p_user_id
    returning balance into new_balance;

  if new_balance is null then
    raise exception 'profile % not found', p_user_id;
  end if;

  if new_balance < 0 then
    raise exception 'insufficient balance';
  end if;

  return new_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- updated_at trigger for packages
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists packages_set_updated_at on public.packages;
create trigger packages_set_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (
    id = auth.uid() and role = (select role from public.profiles where id = auth.uid())
    or public.is_admin()
  );

-- packages: everyone signed in can read active packages, only admins manage
drop policy if exists "packages_select_active_or_admin" on public.packages;
create policy "packages_select_active_or_admin" on public.packages
  for select using (is_active or public.is_admin());

drop policy if exists "packages_admin_write" on public.packages;
create policy "packages_admin_write" on public.packages
  for all using (public.is_admin()) with check (public.is_admin());

-- orders
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_update_own_claim_or_admin" on public.orders;
create policy "orders_update_own_claim_or_admin" on public.orders
  for update using (user_id = auth.uid() or public.is_admin());

-- payments
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
  for insert with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- seed a couple of starter packages (safe to edit/delete from the admin UI)
-- ---------------------------------------------------------------------------
insert into public.packages (name, description, price, duration_days, speed, data_limit_gb, mikrotik_profile)
values
  ('Daily Basic', '24 hours of browsing-speed internet.', 300, 1, '5 Mbps', 2, 'daily-basic'),
  ('Weekly Standard', '7 days of standard speed internet.', 1500, 7, '10 Mbps', 20, 'weekly-standard'),
  ('Monthly Unlimited', '30 days unlimited data.', 5000, 30, '20 Mbps', null, 'monthly-unlimited')
on conflict do nothing;
