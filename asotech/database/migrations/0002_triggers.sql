-- =====================================================================
-- Triggers: timestamps, immutability, ledger -> balances, audit trail,
-- new-user profile, last-owner protection.
-- =====================================================================

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_orgs_updated before update on organizations for each row execute function set_updated_at();
create trigger trg_profiles_updated before update on user_profiles for each row execute function set_updated_at();
create trigger trg_products_updated before update on products for each row execute function set_updated_at();

-- Immutable tables: no UPDATE or DELETE, ever (corrections are new reversing rows).
create or replace function forbid_change() returns trigger
language plpgsql as $$
begin
  raise exception '% is immutable; post a reversing entry instead', tg_table_name using errcode = 'P0001';
end $$;

create trigger trg_movements_immutable before update or delete on stock_movements
  for each row execute function forbid_change();
create trigger trg_movement_lines_immutable before update or delete on stock_movement_lines
  for each row execute function forbid_change();
create trigger trg_count_entries_immutable before update or delete on stock_count_entries
  for each row execute function forbid_change();
create trigger trg_audit_logs_immutable before update or delete on audit_logs
  for each row execute function forbid_change();

-- Validate that line shape matches the movement type.
create or replace function validate_movement_line() returns trigger
language plpgsql as $$
declare t movement_type;
begin
  select movement_type into t from stock_movements
   where organization_id = new.organization_id and id = new.movement_id;
  if t in ('opening_balance','receipt','adjustment_in','return_in') then
    if new.to_location_id is null or new.from_location_id is not null then
      raise exception '% requires a destination location only', t;
    end if;
  elsif t in ('issue','adjustment_out','return_out') then
    if new.from_location_id is null or new.to_location_id is not null then
      raise exception '% requires a source location only', t;
    end if;
  elsif t = 'transfer' then
    if new.from_location_id is null or new.to_location_id is null then
      raise exception 'transfer requires source and destination locations';
    end if;
  end if;
  return new;
end $$;

-- Apply a ledger line to inventory_balances. The ledger is the source of truth;
-- balances are only ever changed here.
create or replace function apply_movement_line() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  allow_neg boolean;
  cur numeric;
  bkey uuid := coalesce(new.batch_id, '00000000-0000-0000-0000-000000000000'::uuid);
begin
  select allow_negative_stock into allow_neg from organizations where id = new.organization_id;

  if new.from_location_id is not null then
    select quantity into cur from inventory_balances
     where organization_id = new.organization_id and product_id = new.product_id
       and location_id = new.from_location_id and batch_key = bkey
     for update;
    if cur is null then cur := 0; end if;
    if cur - new.quantity < 0 and not allow_neg then
      raise exception 'Insufficient stock: have %, need % (product %, location %)',
        cur, new.quantity, new.product_id, new.from_location_id using errcode = 'P0002';
    end if;
    insert into inventory_balances (organization_id, product_id, location_id, batch_id, quantity)
      values (new.organization_id, new.product_id, new.from_location_id, new.batch_id, -new.quantity)
      on conflict (organization_id, product_id, location_id, batch_key)
      do update set quantity = inventory_balances.quantity - new.quantity, updated_at = now();
  end if;

  if new.to_location_id is not null then
    insert into inventory_balances (organization_id, product_id, location_id, batch_id, quantity)
      values (new.organization_id, new.product_id, new.to_location_id, new.batch_id, new.quantity)
      on conflict (organization_id, product_id, location_id, batch_key)
      do update set quantity = inventory_balances.quantity + new.quantity, updated_at = now();
  end if;
  return new;
end $$;

create trigger trg_validate_line before insert on stock_movement_lines
  for each row execute function validate_movement_line();
create trigger trg_apply_line after insert on stock_movement_lines
  for each row execute function apply_movement_line();

-- Generic audit trail ---------------------------------------------------
create or replace function write_audit_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
  org uuid;
  rid text;
begin
  if tg_op = 'DELETE' then rec := to_jsonb(old); else rec := to_jsonb(new); end if;
  org := case when tg_table_name = 'organizations' then (rec->>'id')::uuid
              else nullif(rec->>'organization_id','')::uuid end;
  rid := rec->>'id';
  insert into audit_logs (organization_id, actor_id, action, table_name, record_id, old_data, new_data)
  values (org, auth.uid(), tg_op, tg_table_name, rid,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','organization_members','products','product_barcodes','warehouses','locations',
    'batches','stock_adjustments','stock_adjustment_lines','approval_requests','purchase_orders',
    'goods_receipts','suppliers','subscriptions','billing_records','integration_connections',
    'stock_count_sessions','reconciliation_sessions','quotations','software_projects',
    'consulting_projects','client_reports'
  ] loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$I
                    for each row execute function write_audit_log()', t);
  end loop;
end $$;

-- A new auth user gets a profile row ------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into user_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- An organisation may never be left without an active owner -------------
create or replace function protect_last_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  if tg_op = 'DELETE' then
    if old.role <> 'owner' then return old; end if;
  elsif tg_op = 'UPDATE' then
    if old.role <> 'owner' or (new.role = 'owner' and new.is_active) then return new; end if;
  end if;
  -- cascading deletes of the whole organisation are allowed
  if not exists (select 1 from organizations where id = old.organization_id) then return old; end if;
  select count(*) into remaining from organization_members
   where organization_id = old.organization_id and role = 'owner' and is_active and id <> old.id;
  if remaining = 0 then
    raise exception 'An organisation must keep at least one active owner';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger trg_protect_last_owner before update or delete on organization_members
  for each row execute function protect_last_owner();

-- Purchase order approval: only owner/admin, never the creator (segregation of duties). -----
create or replace function guard_po_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status = 'approved' and auth.uid() is not null then
    if not org_role_in(new.organization_id, array['owner','admin']::org_role[]) then
      raise exception 'Only an owner or administrator can approve a purchase order' using errcode = '42501';
    end if;
    if new.created_by = auth.uid() then
      raise exception 'The creator of a purchase order cannot approve it' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger trg_po_guard before update on purchase_orders
  for each row execute function guard_po_status();
