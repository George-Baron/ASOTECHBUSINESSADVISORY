-- =====================================================================
-- Server-side business functions (RPC). All are SECURITY DEFINER with a
-- fixed search_path and perform their own authorisation checks, because
-- the ledger, balances and approval tables are not writable directly.
-- =====================================================================

create or replace function assert_role(org uuid, roles org_role[]) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not org_role_in(org, roles) then
    raise exception 'Insufficient permissions for this organisation' using errcode = '42501';
  end if;
end $$;

create or replace function assert_subscription(org uuid) returns void
language plpgsql stable security definer set search_path = public as $$
declare k org_kind;
begin
  select kind into k from organizations where id = org;
  if k <> 'saas' then return; end if;
  if not exists (
    select 1 from subscriptions s
     where s.organization_id = org
       and ((s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()))
         or (s.status = 'trialing' and s.trial_ends_at > now()))
  ) then
    raise exception 'Subscription inactive: renew to continue posting transactions' using errcode = 'P0003';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Organisations
-- ---------------------------------------------------------------------
create or replace function create_organization(p_name text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  insert into organizations (name, slug, kind, created_by) values (p_name, lower(p_slug), 'saas', auth.uid())
    returning id into oid;
  insert into organization_members (organization_id, user_id, role) values (oid, auth.uid(), 'owner');
  insert into subscriptions (organization_id, plan_key, status, trial_ends_at)
    values (oid, 'starter', 'trialing', now() + interval '14 days');
  insert into units_of_measure (organization_id, code, name) values
    (oid,'EA','Each'),(oid,'BOX','Box'),(oid,'CTN','Carton'),(oid,'KG','Kilogram'),(oid,'L','Litre'),(oid,'PK','Pack');
  return oid;
end $$;

-- ---------------------------------------------------------------------
-- Ledger posting (internal) and public wrapper
-- ---------------------------------------------------------------------
-- p_lines: [{product_id, batch_id?, from_location_id?, to_location_id?, quantity, unit_cost?}]
create or replace function _post_movement(
  p_org uuid, p_type movement_type, p_reference text, p_idem text, p_lines jsonb,
  p_notes text, p_actor uuid, p_event uuid default null, p_reverses uuid default null,
  p_approval approval_state default 'not_required'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  mid uuid;
  l jsonb;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'A movement needs at least one line';
  end if;

  -- duplicate prevention: same idempotency key returns the original movement
  if p_idem is not null then
    select id into mid from stock_movements where organization_id = p_org and idempotency_key = p_idem;
    if found then return mid; end if;
  end if;

  insert into stock_movements (organization_id, movement_type, reference, approval, idempotency_key,
                               integration_event_id, reverses_movement_id, notes, created_by)
  values (p_org, p_type, p_reference, p_approval, p_idem, p_event, p_reverses, p_notes, p_actor)
  returning id into mid;

  for l in select * from jsonb_array_elements(p_lines) loop
    insert into stock_movement_lines (organization_id, movement_id, product_id, batch_id,
                                      from_location_id, to_location_id, quantity, unit_cost)
    values (p_org, mid, (l->>'product_id')::uuid, nullif(l->>'batch_id','')::uuid,
            nullif(l->>'from_location_id','')::uuid, nullif(l->>'to_location_id','')::uuid,
            (l->>'quantity')::numeric, nullif(l->>'unit_cost','')::numeric);
  end loop;
  return mid;
end $$;
revoke all on function _post_movement(uuid, movement_type, text, text, jsonb, text, uuid, uuid, uuid, approval_state) from public, anon, authenticated;

create or replace function post_stock_movement(
  p_org uuid, p_type movement_type, p_reference text, p_lines jsonb,
  p_idempotency_key text default null, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if p_type in ('adjustment_in','adjustment_out') then
    raise exception 'Stock adjustments must go through reconciliation and approval';
  end if;
  if p_type = 'opening_balance' then
    perform assert_role(p_org, array['owner','admin']::org_role[]);
  else
    perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  end if;
  perform assert_subscription(p_org);
  return _post_movement(p_org, p_type, p_reference, p_idempotency_key, p_lines, p_notes, auth.uid());
end $$;

-- Reverse a movement with an equal and opposite entry (history is never edited).
create or replace function reverse_stock_movement(p_org uuid, p_movement uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m stock_movements;
  new_type movement_type;
  lines jsonb;
begin
  perform assert_role(p_org, array['owner','admin']::org_role[]);
  perform assert_subscription(p_org);
  select * into m from stock_movements where id = p_movement and organization_id = p_org;
  if not found then raise exception 'Movement not found'; end if;
  if exists (select 1 from stock_movements where reverses_movement_id = p_movement) then
    raise exception 'Movement already reversed';
  end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'A reason is required'; end if;

  new_type := case
    when m.movement_type in ('opening_balance','receipt','adjustment_in','return_in') then 'adjustment_out'
    when m.movement_type in ('issue','adjustment_out','return_out') then 'adjustment_in'
    else 'transfer' end;

  select jsonb_agg(jsonb_build_object(
           'product_id', product_id, 'batch_id', batch_id, 'quantity', quantity, 'unit_cost', unit_cost,
           'from_location_id', to_location_id, 'to_location_id', from_location_id))
    into lines from stock_movement_lines where movement_id = p_movement;

  return _post_movement(p_org, new_type, 'REV-' || m.reference, null, lines,
                        'Reversal: ' || p_reason, auth.uid(), null, p_movement, 'approved');
end $$;

-- ---------------------------------------------------------------------
-- Stocktaking
-- ---------------------------------------------------------------------
create or replace function create_count_session(
  p_org uuid, p_warehouse uuid, p_name text, p_count_type text default 'full',
  p_location_ids uuid[] default null, p_product_ids uuid[] default null, p_blind boolean default true
) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  insert into stock_count_sessions (organization_id, warehouse_id, name, count_type, status, blind_count, snapshot_at, created_by)
  values (p_org, p_warehouse, p_name, p_count_type, 'counting', p_blind, now(), auth.uid())
  returning id into sid;

  -- system snapshot taken at session start
  insert into stock_count_lines (organization_id, session_id, product_id, location_id, batch_id, snapshot_qty)
  select b.organization_id, sid, b.product_id, b.location_id, b.batch_id, b.quantity
    from inventory_balances b
    join locations loc on loc.organization_id = b.organization_id and loc.id = b.location_id
   where b.organization_id = p_org and loc.warehouse_id = p_warehouse
     and (p_location_ids is null or b.location_id = any(p_location_ids))
     and (p_product_ids is null or b.product_id = any(p_product_ids));

  if not exists (select 1 from stock_count_lines where session_id = sid) then
    raise exception 'No stock found for the selected warehouse, locations or products';
  end if;
  return sid;
end $$;

create or replace function assign_count_lines(p_org uuid, p_session uuid, p_location_ids uuid[], p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  if not exists (select 1 from organization_members where organization_id = p_org and user_id = p_user and is_active) then
    raise exception 'Assignee is not a member of this organisation';
  end if;
  update stock_count_lines set assigned_to = p_user
   where organization_id = p_org and session_id = p_session and location_id = any(p_location_ids);
  get diagnostics n = row_count;
  return n;
end $$;

-- Capture (or recapture) a physical quantity. Original value is kept in first_count_qty;
-- every entry is retained in stock_count_entries.
create or replace function record_count(p_org uuid, p_line uuid, p_quantity numeric,
                                        p_source text default 'web', p_note text default null) returns int
language plpgsql security definer set search_path = public as $$
declare
  ln stock_count_lines;
  sess stock_count_sessions;
  n int;
begin
  perform assert_role(p_org, array['owner','admin','manager','stock_counter']::org_role[]);
  if p_quantity is null or p_quantity < 0 then raise exception 'Quantity must be zero or more'; end if;

  select * into ln from stock_count_lines where id = p_line and organization_id = p_org for update;
  if not found then raise exception 'Count line not found'; end if;
  select * into sess from stock_count_sessions where id = ln.session_id;
  if sess.status <> 'counting' then raise exception 'Count session is not open for counting (status: %)', sess.status; end if;

  if org_role_in(p_org, array['stock_counter']::org_role[]) and ln.assigned_to is distinct from auth.uid() then
    raise exception 'This line is assigned to another counter' using errcode = '42501';
  end if;

  select coalesce(max(entry_no),0) + 1 into n from stock_count_entries where line_id = p_line;
  insert into stock_count_entries (organization_id, line_id, entry_no, quantity, entered_by, source, note)
    values (p_org, p_line, n, p_quantity, auth.uid(), p_source, p_note);

  update stock_count_lines
     set first_count_qty = coalesce(first_count_qty, p_quantity),
         counted_qty = p_quantity,
         status = 'counted',
         counted_by = auth.uid(),
         counted_at = now()
   where id = p_line;
  return n;
end $$;

create or replace function request_recount(p_org uuid, p_line uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  update stock_count_lines set status = 'recount'
   where id = p_line and organization_id = p_org
     and exists (select 1 from stock_count_sessions s where s.id = session_id and s.status in ('counting','review'));
  if not found then raise exception 'Line not found or session not open'; end if;
  update stock_count_sessions set status = 'counting'
   where id = (select session_id from stock_count_lines where id = p_line) and status = 'review';
end $$;

-- Close counting and move to review; every line must be counted.
create or replace function close_counting(p_org uuid, p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
declare open_lines int;
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  select count(*) into open_lines from stock_count_lines
   where organization_id = p_org and session_id = p_session and status in ('pending','recount');
  if open_lines > 0 then
    raise exception '% line(s) still need a count or recount', open_lines;
  end if;
  update stock_count_sessions set status = 'review' where id = p_session and organization_id = p_org and status = 'counting';
  if not found then raise exception 'Session is not in counting status'; end if;
end $$;

create or replace function cancel_count_session(p_org uuid, p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  update stock_count_sessions set status = 'cancelled', closed_at = now()
   where id = p_session and organization_id = p_org and status in ('draft','counting','review');
  if not found then raise exception 'Only an open count can be cancelled'; end if;
end $$;

-- Compare counts with the live system quantity and open a reconciliation.
create or replace function open_reconciliation(p_org uuid, p_session uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  perform assert_role(p_org, array['owner','admin','manager','auditor']::org_role[]);
  if not exists (select 1 from stock_count_sessions where id = p_session and organization_id = p_org and status = 'review') then
    raise exception 'Session must be in review status';
  end if;
  insert into reconciliation_sessions (organization_id, count_session_id, prepared_by)
    values (p_org, p_session, auth.uid()) returning id into rid;

  insert into reconciliation_lines (organization_id, reconciliation_id, count_line_id, product_id, location_id,
                                    batch_id, system_qty, counted_qty, variance_value, action)
  select l.organization_id, rid, l.id, l.product_id, l.location_id, l.batch_id,
         l.snapshot_qty, l.counted_qty, (l.counted_qty - l.snapshot_qty) * p.cost_price,
         case when l.counted_qty = l.snapshot_qty then 'ignore' else 'adjust' end
    from stock_count_lines l
    join products p on p.organization_id = l.organization_id and p.id = l.product_id
   where l.organization_id = p_org and l.session_id = p_session;

  update stock_count_sessions set status = 'reconciling' where id = p_session;
  return rid;
end $$;

-- Submit for approval: every variance to be adjusted needs a reason code.
create or replace function submit_reconciliation(p_org uuid, p_reconciliation uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  adj uuid;
  missing int;
  pending int;
  n int;
  ref text;
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  if not exists (select 1 from reconciliation_sessions where id = p_reconciliation and organization_id = p_org and status = 'draft') then
    raise exception 'Reconciliation not found or already submitted';
  end if;

  select count(*) into missing from reconciliation_lines
   where reconciliation_id = p_reconciliation and variance_qty <> 0 and action = 'adjust' and reason_code is null;
  if missing > 0 then raise exception '% variance line(s) need a reason code', missing; end if;

  select count(*) into pending from reconciliation_lines
   where reconciliation_id = p_reconciliation and variance_qty <> 0 and action = 'investigate';
  if pending > 0 then raise exception '% variance line(s) are still marked for investigation', pending; end if;

  select count(*) into n from reconciliation_lines
   where reconciliation_id = p_reconciliation and variance_qty <> 0 and action = 'adjust';

  update reconciliation_sessions set status = 'submitted', submitted_at = now() where id = p_reconciliation;

  if n = 0 then
    update reconciliation_sessions set status = 'posted' where id = p_reconciliation;
    update stock_count_sessions set status = 'posted', closed_at = now()
     where id = (select count_session_id from reconciliation_sessions where id = p_reconciliation);
    return null;
  end if;

  ref := 'ADJ-' || to_char(now(), 'YYYYMMDD') || '-' || substr(p_reconciliation::text, 1, 6);
  insert into stock_adjustments (organization_id, reconciliation_id, reference, reason, status, requested_by)
    values (p_org, p_reconciliation, ref, 'Stocktake reconciliation', 'pending_approval', auth.uid())
    returning id into adj;

  insert into stock_adjustment_lines (organization_id, adjustment_id, product_id, location_id, batch_id, quantity_delta, unit_cost)
  select rl.organization_id, adj, rl.product_id, rl.location_id, rl.batch_id, rl.variance_qty, p.cost_price
    from reconciliation_lines rl
    join products p on p.organization_id = rl.organization_id and p.id = rl.product_id
   where rl.reconciliation_id = p_reconciliation and rl.variance_qty <> 0 and rl.action = 'adjust';

  insert into approval_requests (organization_id, entity_type, entity_id, requested_by)
    values (p_org, 'stock_adjustment', adj, auth.uid());
  return adj;
end $$;

-- ---------------------------------------------------------------------
-- Approvals (segregation of duties: requester cannot decide)
-- ---------------------------------------------------------------------
create or replace function decide_approval(p_org uuid, p_request uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  r approval_requests;
  adj stock_adjustments;
  ins jsonb;
  outs jsonb;
  mids uuid[] := '{}';
  mid uuid;
begin
  perform assert_role(p_org, array['owner','admin']::org_role[]);
  select * into r from approval_requests where id = p_request and organization_id = p_org for update;
  if not found then raise exception 'Approval request not found'; end if;
  if r.status <> 'pending' then raise exception 'Request already decided'; end if;
  if r.requested_by = auth.uid() then
    raise exception 'The requester cannot approve their own request' using errcode = '42501';
  end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then
    raise exception 'A note is required when rejecting';
  end if;

  update approval_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = p_note
   where id = p_request;

  if r.entity_type = 'stock_adjustment' then
    select * into adj from stock_adjustments where id = r.entity_id and organization_id = p_org for update;
    if not p_approve then
      update stock_adjustments set status = 'rejected', approved_by = auth.uid() where id = adj.id;
      update reconciliation_sessions set status = 'rejected' where id = adj.reconciliation_id;
      update stock_count_sessions set status = 'review'
       where id = (select count_session_id from reconciliation_sessions where id = adj.reconciliation_id);
      return;
    end if;

    perform assert_subscription(p_org);

    select jsonb_agg(jsonb_build_object('product_id', product_id, 'batch_id', batch_id, 'quantity', quantity_delta,
                                        'unit_cost', unit_cost, 'to_location_id', location_id))
      into ins from stock_adjustment_lines where adjustment_id = adj.id and quantity_delta > 0;
    select jsonb_agg(jsonb_build_object('product_id', product_id, 'batch_id', batch_id, 'quantity', -quantity_delta,
                                        'unit_cost', unit_cost, 'from_location_id', location_id))
      into outs from stock_adjustment_lines where adjustment_id = adj.id and quantity_delta < 0;

    if outs is not null then
      mid := _post_movement(p_org, 'adjustment_out', adj.reference || '-OUT', 'adj-' || adj.id || '-out', outs,
                            'Approved stock adjustment', auth.uid(), null, null, 'approved');
      mids := mids || mid;
    end if;
    if ins is not null then
      mid := _post_movement(p_org, 'adjustment_in', adj.reference || '-IN', 'adj-' || adj.id || '-in', ins,
                            'Approved stock adjustment', auth.uid(), null, null, 'approved');
      mids := mids || mid;
    end if;

    update stock_adjustments set status = 'posted', approved_by = auth.uid(), movement_ids = mids where id = adj.id;
    update reconciliation_sessions set status = 'posted' where id = adj.reconciliation_id;
    update stock_count_sessions set status = 'posted', closed_at = now()
     where id = (select count_session_id from reconciliation_sessions where id = adj.reconciliation_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Procurement: post a goods receipt into the ledger
-- ---------------------------------------------------------------------
create or replace function post_goods_receipt(p_org uuid, p_receipt uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  gr goods_receipts;
  ln record;
  bid uuid;
  lines jsonb := '[]'::jsonb;
  mid uuid;
  po uuid;
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  perform assert_subscription(p_org);
  select * into gr from goods_receipts where id = p_receipt and organization_id = p_org for update;
  if not found then raise exception 'Goods receipt not found'; end if;
  if gr.status <> 'draft' then raise exception 'Goods receipt already %', gr.status; end if;
  if not exists (select 1 from goods_receipt_lines where goods_receipt_id = p_receipt) then
    raise exception 'Goods receipt has no lines';
  end if;

  for ln in select grl.*, p.track_batches, p.track_expiry from goods_receipt_lines grl
              join products p on p.organization_id = grl.organization_id and p.id = grl.product_id
             where grl.goods_receipt_id = p_receipt loop
    bid := null;
    if ln.track_batches then
      if ln.batch_no is null then raise exception 'Batch number required for product %', ln.product_id; end if;
      if ln.track_expiry and ln.expiry_date is null then raise exception 'Expiry date required for batch %', ln.batch_no; end if;
      insert into batches (organization_id, product_id, batch_no, expiry_date)
        values (p_org, ln.product_id, ln.batch_no, ln.expiry_date)
        on conflict (organization_id, product_id, batch_no) do update set expiry_date = coalesce(batches.expiry_date, excluded.expiry_date)
        returning id into bid;
    end if;
    lines := lines || jsonb_build_object('product_id', ln.product_id, 'batch_id', bid, 'quantity', ln.quantity,
                                         'unit_cost', ln.unit_cost, 'to_location_id', ln.location_id);
    if ln.po_line_id is not null then
      update purchase_order_lines set received_quantity = received_quantity + ln.quantity where id = ln.po_line_id;
    end if;
  end loop;

  mid := _post_movement(p_org, 'receipt', gr.receipt_no, 'gr-' || gr.id, lines, 'Goods receipt', auth.uid());
  update goods_receipts set status = 'posted', movement_id = mid where id = gr.id;

  po := gr.purchase_order_id;
  if po is not null then
    update purchase_orders set status = case
      when not exists (select 1 from purchase_order_lines where purchase_order_id = po and received_quantity < quantity) then 'received'
      else 'partially_received' end
     where id = po;
  end if;
  return mid;
end $$;

-- ---------------------------------------------------------------------
-- Expiry management (FEFO support)
-- ---------------------------------------------------------------------
create or replace function refresh_expiry_records(p_org uuid, p_warning_days int default 90) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform assert_role(p_org, array['owner','admin','manager']::org_role[]);
  delete from expiry_records where organization_id = p_org;
  insert into expiry_records (organization_id, batch_id, location_id, quantity, expiry_date, status)
  select b.organization_id, b.batch_id, b.location_id, b.quantity, bt.expiry_date,
         case when bt.expiry_date < current_date then 'expired'
              when bt.expiry_date <= current_date + p_warning_days then 'near_expiry'
              else 'ok' end
    from inventory_balances b
    join batches bt on bt.organization_id = b.organization_id and bt.id = b.batch_id
   where b.organization_id = p_org and b.quantity > 0 and bt.expiry_date is not null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Integration events: idempotent intake (service role / edge functions)
-- ---------------------------------------------------------------------
create or replace function record_integration_event(
  p_org uuid, p_connection uuid, p_direction text, p_event_type text, p_key text, p_payload jsonb
) returns table (event_id uuid, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  insert into integration_events (organization_id, connection_id, direction, event_type, idempotency_key, payload)
  values (p_org, p_connection, p_direction, p_event_type, p_key, coalesce(p_payload, '{}'::jsonb))
  on conflict (organization_id, connection_id, idempotency_key) do nothing
  returning id into eid;
  if eid is null then
    select id into eid from integration_events
     where organization_id = p_org and connection_id = p_connection and idempotency_key = p_key;
    return query select eid, true;
  else
    return query select eid, false;
  end if;
end $$;
revoke all on function record_integration_event(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;

-- Approve a client-facing item (client role may approve milestones/deliverables/quotations)
create or replace function client_decide(p_org uuid, p_entity text, p_id uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_role(p_org, array['owner','admin','client']::org_role[]);
  if p_entity = 'deliverable' then
    update project_deliverables set status = case when p_approve then 'approved' else 'changes_requested' end
     where id = p_id and organization_id = p_org and is_published and status = 'in_review';
  elsif p_entity = 'quotation' then
    update quotations set status = case when p_approve then 'accepted' else 'rejected' end
     where id = p_id and organization_id = p_org and status = 'sent';
  elsif p_entity = 'milestone' then
    update project_milestones set status = case when p_approve then 'approved' else 'in_progress' end
     where id = p_id and organization_id = p_org and status = 'done';
  else
    raise exception 'Unknown entity %', p_entity;
  end if;
  if not found then raise exception 'Item not found or not awaiting your decision'; end if;
end $$;

-- ---------------------------------------------------------------------
-- ASOTECH staff operations (client onboarding)
-- ---------------------------------------------------------------------
create or replace function staff_create_client_org(p_name text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if not is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  insert into organizations (name, slug, kind, created_by) values (p_name, lower(p_slug), 'consulting_client', auth.uid())
    returning id into oid;
  return oid;
end $$;

create or replace function staff_add_client_member(p_org uuid, p_email text, p_role org_role default 'client') returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid; mid uuid;
begin
  if not is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'No registered user with that email; ask them to register first'; end if;
  insert into organization_members (organization_id, user_id, role) values (p_org, uid, p_role)
    on conflict (organization_id, user_id) do update set role = excluded.role, is_active = true
    returning id into mid;
  return mid;
end $$;

-- ---------------------------------------------------------------------
-- AppSheet / external capture: counts arriving through a VERIFIED integration connection.
-- Callable by service_role only (the intake route authenticates the connection first).
-- ---------------------------------------------------------------------
create or replace function integration_record_count(
  p_org uuid, p_connection uuid, p_event_key text, p_line uuid, p_quantity numeric, p_note text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  conn integration_connections;
  ev record;
  ln stock_count_lines;
  sess stock_count_sessions;
  n int;
begin
  select * into conn from integration_connections where id = p_connection and organization_id = p_org;
  if not found or conn.provider <> 'appsheet' or conn.status <> 'verified' then
    raise exception 'Connection is not a verified AppSheet connection';
  end if;
  select * into ev from record_integration_event(p_org, p_connection, 'inbound', 'count.captured', p_event_key,
        jsonb_build_object('line_id', p_line, 'quantity', p_quantity));
  if ev.duplicate then return 'duplicate'; end if;

  if p_quantity is null or p_quantity < 0 then raise exception 'Quantity must be zero or more'; end if;
  select * into ln from stock_count_lines where id = p_line and organization_id = p_org for update;
  if not found then
    update integration_events set status = 'failed', error = 'line not found' where id = ev.event_id;
    raise exception 'Count line not found';
  end if;
  select * into sess from stock_count_sessions where id = ln.session_id;
  if sess.status <> 'counting' then
    update integration_events set status = 'failed', error = 'session not open' where id = ev.event_id;
    raise exception 'Count session is not open';
  end if;
  select coalesce(max(entry_no),0) + 1 into n from stock_count_entries where line_id = p_line;
  insert into stock_count_entries (organization_id, line_id, entry_no, quantity, entered_by, source, note)
    values (p_org, p_line, n, p_quantity, null, 'appsheet', p_note);
  update stock_count_lines set first_count_qty = coalesce(first_count_qty, p_quantity), counted_qty = p_quantity,
         status = 'counted', counted_at = now() where id = p_line;
  update integration_events set status = 'processed', processed_at = now() where id = ev.event_id;
  return 'recorded';
end $$;
revoke all on function integration_record_count(uuid, uuid, text, uuid, numeric, text) from public, anon, authenticated;
grant execute on function integration_record_count(uuid, uuid, text, uuid, numeric, text) to service_role;
grant execute on function record_integration_event(uuid, uuid, text, text, text, jsonb) to service_role;

-- Lock execution to signed-in users (anon may only insert public forms via RLS)
revoke execute on all functions in schema public from public, anon;
grant execute on function
  is_staff(), is_org_member(uuid), org_role_in(uuid, org_role[]),
  create_organization(text, text),
  post_stock_movement(uuid, movement_type, text, jsonb, text, text),
  reverse_stock_movement(uuid, uuid, text),
  create_count_session(uuid, uuid, text, text, uuid[], uuid[], boolean),
  assign_count_lines(uuid, uuid, uuid[], uuid),
  record_count(uuid, uuid, numeric, text, text),
  request_recount(uuid, uuid, text),
  close_counting(uuid, uuid),
  cancel_count_session(uuid, uuid),
  open_reconciliation(uuid, uuid),
  submit_reconciliation(uuid, uuid),
  decide_approval(uuid, uuid, boolean, text),
  post_goods_receipt(uuid, uuid),
  refresh_expiry_records(uuid, int),
  client_decide(uuid, text, uuid, boolean, text),
  staff_create_client_org(text, text),
  staff_add_client_member(uuid, text, org_role)
to authenticated;
