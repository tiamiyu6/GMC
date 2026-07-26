-- Server-side aggregates for the admin overview page.
-- Summing rows client-side after a plain SELECT silently truncates at
-- PostgREST's default row cap (1000) once a network has that many orders/
-- customers - these RPCs compute the totals in the database instead.
--
-- Each function checks is_admin() itself (not just relying on the app's UI
-- gating), because `security definer` bypasses RLS - without this check any
-- signed-in customer could call the RPC directly and read network-wide
-- revenue/wallet totals.

create or replace function public.admin_total_revenue()
returns numeric
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return (select coalesce(sum(amount), 0) from public.payments where type = 'order_payment');
end;
$$;

create or replace function public.admin_revenue_since(p_since timestamptz)
returns numeric
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return (
    select coalesce(sum(amount), 0)
    from public.payments
    where type = 'order_payment' and created_at >= p_since
  );
end;
$$;

create or replace function public.admin_wallet_float()
returns numeric
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return (select coalesce(sum(balance), 0) from public.profiles where role = 'customer');
end;
$$;

grant execute on function public.admin_total_revenue() to authenticated;
grant execute on function public.admin_revenue_since(timestamptz) to authenticated;
grant execute on function public.admin_wallet_float() to authenticated;
