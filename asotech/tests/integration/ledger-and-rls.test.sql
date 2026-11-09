-- Integration tests for the ledger, stocktake workflow, approvals, tenant isolation and public forms.
-- Run against a database that has the Supabase stub (tests/integration/supabase-stub.sql),
-- migrations 0001-0004 and seed.sql applied. Output lines starting FAIL indicate a failed assertion.
\set ON_ERROR_STOP on

drop schema if exists t cascade;
create schema t;
grant usage on schema t to anon, authenticated;

create function t.check(name text, cond boolean, detail text default null) returns void
language plpgsql as $$
begin
  if cond is true then raise notice 'PASS: %', name;
  else raise notice 'FAIL: % %', name, coalesce('(' || detail || ')', ''); end if;
end $$;

create function t.sqlstate_of(q text) returns text
language plpgsql as $$
begin execute q; return 'OK'; exception when others then return sqlstate; end $$;

create function t.msg_of(q text) returns text
language plpgsql as $$
begin execute q; return 'OK'; exception when others then return sqlerrm; end $$;

grant execute on all functions in schema t to anon, authenticated;

do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ud uuid := gen_random_uuid(); us uuid := gen_random_uuid();
  oa uuid; ob uuid;
  wa uuid; wb uuid; la1 uuid; la2 uuid; lb1 uuid;
  pa uuid; pa2 uuid; pb uuid;
  m1 uuid; m1b uuid; m2 uuid;
  qty numeric; n int;
  sess uuid; recon uuid; adj uuid; req uuid;
  line1 uuid; line2 uuid; ln record;
  st text;
begin
  insert into auth.users (id, email) values
    (ua,'a@test.local'),(ub,'b@test.local'),(uc,'counter@test.local'),(ud,'admin2@test.local'),(us,'staff@test.local');
  insert into platform_staff (user_id, staff_role) values (us, 'consultant');
  perform t.check('profile created for new auth user', (select count(*) from user_profiles) = 5);

  -- Organisations ------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  oa := create_organization('Org A', 'org-a');
  perform set_config('request.jwt.claim.sub', ub::text, true);
  ob := create_organization('Org B', 'org-b');

  -- Org A master data -----------------------------------------------------------
  perform set_config('request.jwt.claim.sub', ua::text, true);
  insert into warehouses (organization_id, code, name) values (oa,'W1','Main') returning id into wa;
  insert into locations (organization_id, warehouse_id, code) values (oa, wa, 'A1') returning id into la1;
  insert into locations (organization_id, warehouse_id, code) values (oa, wa, 'A2') returning id into la2;
  insert into products (organization_id, sku, name, cost_price) values (oa,'P1','Widget',100) returning id into pa;
  insert into products (organization_id, sku, name, cost_price) values (oa,'P2','Gadget',50) returning id into pa2;

  perform set_config('request.jwt.claim.sub', ub::text, true);
  insert into warehouses (organization_id, code, name) values (ob,'W1','Main') returning id into wb;
  insert into locations (organization_id, warehouse_id, code) values (ob, wb, 'B1') returning id into lb1;
  insert into products (organization_id, sku, name) values (ob,'P1','Other widget') returning id into pb;

  -- Tenant isolation ---------------------------------------------------------------
  perform t.check('B cannot see org A products', (select count(*) from products where organization_id = oa) = 0);
  perform t.check('B sees only own org', (select count(*) from organizations) = 1);
  perform t.check('B cannot insert into org A (RLS)',
    t.sqlstate_of(format('insert into products (organization_id, sku, name) values (%L,%L,%L)', oa, 'X', 'Evil')) = '42501');
  perform t.check('B cannot post movement into org A',
    t.sqlstate_of(format($q$select post_stock_movement(%L,'receipt','HACK',%L::jsonb)$q$, oa,
      jsonb_build_array(jsonb_build_object('product_id', pa, 'to_location_id', la1, 'quantity', 5))::text)) = '42501');
  perform t.check('B cannot add itself as member of org A',
    t.sqlstate_of(format($q$insert into organization_members (organization_id, user_id, role) values (%L,%L,'owner')$q$, oa, ub)) = '42501');

  -- Ledger posting --------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', ua::text, true);
  m1 := post_stock_movement(oa, 'receipt', 'GRN-1', jsonb_build_array(
          jsonb_build_object('product_id', pa, 'to_location_id', la1, 'quantity', 100, 'unit_cost', 100),
          jsonb_build_object('product_id', pa2, 'to_location_id', la1, 'quantity', 40)), 'key-1');
  select quantity into qty from inventory_balances where product_id = pa and location_id = la1;
  perform t.check('receipt updates balance', qty = 100, qty::text);

  m1b := post_stock_movement(oa, 'receipt', 'GRN-1', jsonb_build_array(
          jsonb_build_object('product_id', pa, 'to_location_id', la1, 'quantity', 100)), 'key-1');
  select quantity into qty from inventory_balances where product_id = pa and location_id = la1;
  perform t.check('idempotency key returns original movement', m1b = m1);
  perform t.check('duplicate post does not double stock', qty = 100, qty::text);

  m2 := post_stock_movement(oa, 'transfer', 'TRF-1', jsonb_build_array(
          jsonb_build_object('product_id', pa, 'from_location_id', la1, 'to_location_id', la2, 'quantity', 30)));
  select quantity into qty from inventory_balances where product_id = pa and location_id = la2;
  perform t.check('transfer credits destination', qty = 30);
  select quantity into qty from inventory_balances where product_id = pa and location_id = la1;
  perform t.check('transfer debits source', qty = 70);

  perform t.check('issue beyond stock is rejected',
    t.sqlstate_of(format($q$select post_stock_movement(%L,'issue','ISS-X',%L::jsonb)$q$, oa,
      jsonb_build_array(jsonb_build_object('product_id', pa, 'from_location_id', la1, 'quantity', 9999))::text)) = 'P0002');
  perform t.check('line shape validated against movement type',
    t.sqlstate_of(format($q$select post_stock_movement(%L,'receipt','BAD',%L::jsonb)$q$, oa,
      jsonb_build_array(jsonb_build_object('product_id', pa, 'from_location_id', la1, 'quantity', 1))::text)) <> 'OK');
  perform t.check('cross-tenant product in a movement is rejected (composite FK)',
    t.sqlstate_of(format($q$select post_stock_movement(%L,'receipt','XT',%L::jsonb)$q$, oa,
      jsonb_build_array(jsonb_build_object('product_id', pb, 'to_location_id', la1, 'quantity', 1))::text)) = '23503');
  perform t.check('direct insert into ledger is denied',
    t.sqlstate_of(format($q$insert into stock_movements (organization_id, movement_type, reference) values (%L,'receipt','DIRECT')$q$, oa)) = '42501');
  perform t.check('direct write to balances is denied',
    t.sqlstate_of(format($q$update inventory_balances set quantity = 999999 where organization_id = %L$q$, oa)) = '42501');
  perform t.check('adjustments cannot be posted directly',
    t.sqlstate_of(format($q$select post_stock_movement(%L,'adjustment_in','ADJ',%L::jsonb)$q$, oa,
      jsonb_build_array(jsonb_build_object('product_id', pa, 'to_location_id', la1, 'quantity', 1))::text)) <> 'OK');

  reset role;
  perform t.check('ledger rows are immutable (update)', t.sqlstate_of(format('update stock_movements set reference = ''x'' where id = %L', m1)) = 'P0001');
  perform t.check('ledger rows are immutable (delete)', t.sqlstate_of(format('delete from stock_movement_lines where movement_id = %L', m1)) = 'P0001');
  perform t.check('audit logs are immutable', t.sqlstate_of('delete from audit_logs') = 'P0001');
  perform t.check('audit trail captured product creation', (select count(*) from audit_logs where table_name = 'products' and action = 'INSERT') >= 3);

  -- Team: stock counter C and second admin D ----------------------------------------------
  insert into organization_members (organization_id, user_id, role) values (oa, uc, 'stock_counter'), (oa, ud, 'admin');

  -- Stocktake ---------------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  sess := create_count_session(oa, wa, 'Q4 full count', 'full');
  select count(*) into n from stock_count_lines where session_id = sess;
  perform t.check('count session snapshots balances', n = 3, n::text);

  select id into line1 from stock_count_lines where session_id = sess and product_id = pa and location_id = la1;
  select id into line2 from stock_count_lines where session_id = sess and product_id = pa2 and location_id = la1;
  perform assign_count_lines(oa, sess, array[la1], uc);

  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform t.check('counter cannot read stock_count_lines directly', (select count(*) from stock_count_lines) = 0);
  select count(*) into n from v_count_sheet where session_id = sess;
  perform t.check('counter sees assigned count sheet', n = 2, n::text);
  perform t.check('blind count hides system quantity', (select count(*) from v_count_sheet where snapshot_qty is not null) = 0);
  perform t.check('counter cannot read system balances (blind count)', (select count(*) from inventory_balances) = 0);
  perform t.check('counter cannot read the ledger', (select count(*) from stock_movements) = 0);
  perform record_count(oa, line1, 65, 'appsheet');
  perform record_count(oa, line1, 68, 'web', 'recount after shelf check');
  perform record_count(oa, line2, 40);
  perform t.check('counter cannot post movements',
    t.sqlstate_of(format($q$select post_stock_movement(%L,'receipt','C',%L::jsonb)$q$, oa,
      jsonb_build_array(jsonb_build_object('product_id', pa, 'to_location_id', la1, 'quantity', 1))::text)) = '42501');

  perform set_config('request.jwt.claim.sub', ua::text, true);
  select count(*) into n from stock_count_entries where line_id = line1;
  perform t.check('every count entry is retained', n = 2, n::text);
  select first_count_qty, counted_qty into ln from stock_count_lines where id = line1;
  perform t.check('original count preserved, latest count updated', ln.first_count_qty = 65 and ln.counted_qty = 68);
  perform t.check('closing with uncounted lines is blocked',
    t.sqlstate_of(format('select close_counting(%L,%L)', oa, sess)) <> 'OK');
  -- remaining line (A2) is unassigned: count it as manager
  select id into line2 from stock_count_lines where session_id = sess and location_id = la2;
  perform record_count(oa, line2, 30);
  perform close_counting(oa, sess);
  recon := open_reconciliation(oa, sess);

  perform t.check('submission without reason code is blocked',
    t.msg_of(format('select submit_reconciliation(%L,%L)', oa, recon)) like '%reason code%');
  update reconciliation_lines set reason_code = 'miscount', explanation = 'Shelf recount' where reconciliation_id = recon and variance_qty <> 0;
  adj := submit_reconciliation(oa, recon);
  perform t.check('adjustment created pending approval', (select status from stock_adjustments where id = adj) = 'pending_approval');
  select id into req from approval_requests where entity_id = adj;

  perform t.check('requester cannot approve own adjustment',
    t.sqlstate_of(format('select decide_approval(%L,%L,true)', oa, req)) = '42501');
  perform t.check('stock unchanged before approval',
    (select quantity from inventory_balances where product_id = pa and location_id = la1) = 70);

  perform set_config('request.jwt.claim.sub', ud::text, true);
  perform t.check('rejection needs a note', t.sqlstate_of(format('select decide_approval(%L,%L,false)', oa, req)) <> 'OK');
  perform decide_approval(oa, req, true, 'Verified by recount');
  select quantity into qty from inventory_balances where product_id = pa and location_id = la1;
  perform t.check('approved adjustment posts to ledger (70 -> 68)', qty = 68, qty::text);
  perform t.check('adjustment marked posted', (select status from stock_adjustments where id = adj) = 'posted');
  perform t.check('count session closed as posted', (select status from stock_count_sessions where id = sess) = 'posted');
  perform t.check('approval cannot be decided twice', t.sqlstate_of(format('select decide_approval(%L,%L,true)', oa, req)) <> 'OK');

  declare s2 uuid;
  begin
    s2 := create_count_session(oa, wa, 'To cancel', 'spot');
    perform cancel_count_session(oa, s2);
    perform t.check('open count can be cancelled', (select status from stock_count_sessions where id = s2) = 'cancelled');
    perform t.check('posted count cannot be cancelled', t.sqlstate_of(format('select cancel_count_session(%L,%L)', oa, sess)) <> 'OK');
    perform set_config('request.jwt.claim.sub', uc::text, true);
    perform t.check('counter cannot cancel counts', t.sqlstate_of(format('select cancel_count_session(%L,%L)', oa, s2)) = '42501');
    perform set_config('request.jwt.claim.sub', ua::text, true);
  end;

  declare sup uuid; po uuid;
  begin
    insert into suppliers (organization_id, name) values (oa, 'Supplier One') returning id into sup;
    insert into purchase_orders (organization_id, po_number, supplier_id, created_by, status) values (oa, 'PO-T-001', sup, ua, 'pending_approval') returning id into po;
    perform t.check('PO creator cannot approve own PO', t.sqlstate_of(format($q$update purchase_orders set status='approved' where id=%L$q$, po)) = '42501');
    perform set_config('request.jwt.claim.sub', ud::text, true);
    perform t.check('another admin can approve the PO', t.sqlstate_of(format($q$update purchase_orders set status='approved' where id=%L$q$, po)) = 'OK');
    perform set_config('request.jwt.claim.sub', ua::text, true);
  end;

  -- Reversal ---------------------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', ua::text, true);
  perform reverse_stock_movement(oa, m2, 'Transfer made in error');
  select quantity into qty from inventory_balances where product_id = pa and location_id = la2;
  perform t.check('reversal restores source and destination', qty = 0, qty::text);
  perform t.check('a movement can only be reversed once',
    t.sqlstate_of(format($q$select reverse_stock_movement(%L,%L,'again')$q$, oa, m2)) <> 'OK');

  -- Subscription gate --------------------------------------------------------------------------------
  reset role;
  update subscriptions set trial_ends_at = now() - interval '1 day' where organization_id = oa;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ua::text, true);
  perform t.check('expired subscription blocks posting',
    t.sqlstate_of(format($q$select post_stock_movement(%L,'receipt','LATE',%L::jsonb)$q$, oa,
      jsonb_build_array(jsonb_build_object('product_id', pa, 'to_location_id', la1, 'quantity', 1))::text)) = 'P0003');
  perform t.check('reads still work with expired subscription', (select count(*) from products) = 2);
  reset role;
  update subscriptions set trial_ends_at = now() + interval '7 days' where organization_id = oa;

  -- Members -----------------------------------------------------------------------------------------------
  perform t.check('last owner cannot be removed',
    t.sqlstate_of(format($q$delete from organization_members where organization_id = %L and role = 'owner'$q$, oa)) = 'P0001');

  -- Integration events -------------------------------------------------------------------------------------
  declare conn uuid; r record; r2 record;
  begin
    insert into integration_connections (organization_id, provider, name) values (oa, 'appsheet', 'AppSheet demo') returning id into conn;
    select * into r from record_integration_event(oa, conn, 'inbound', 'count.captured', 'evt-1', '{"qty":5}');
    select * into r2 from record_integration_event(oa, conn, 'inbound', 'count.captured', 'evt-1', '{"qty":5}');
    perform t.check('first integration event accepted', r.duplicate = false);
    perform t.check('duplicate integration event detected', r2.duplicate = true and r2.event_id = r.event_id);
  end;
  perform t.check('integration secrets not readable by API roles',
    t.sqlstate_of('set local role authenticated; select * from integration_secrets') = '42501');
  reset role;

  -- Public website ---------------------------------------------------------------------------------------------
  set local role anon;
  perform t.check('anon can read published service catalogue', (select count(*) from service_catalogue) = 13);
  perform t.check('anon can submit a consultation request',
    t.sqlstate_of($q$insert into consultation_requests (full_name, email, message) values ('Test Visitor','visitor@example.com','Hello')$q$) = 'OK');
  perform t.check('anon cannot read submitted requests', t.sqlstate_of('select * from consultation_requests') = '42501');
  perform t.check('anon cannot read tenant data', t.sqlstate_of('select * from products') = '42501');
  perform t.check('anon cannot execute RPCs', t.sqlstate_of(format('select create_organization(%L,%L)', 'X', 'x-org')) = '42501');
  perform t.check('invalid email rejected by constraint',
    t.sqlstate_of($q$insert into contact_messages (full_name, email, message) values ('Bad','not-an-email','hello there')$q$) = '23514');
  perform t.check('anon cannot mark a request as won on insert',
    t.sqlstate_of($q$insert into proposal_requests (full_name, email, scope, status) values ('Bad','x@y.com','Some long scope text','won')$q$) = '42501');
  reset role;

  -- Staff vs client --------------------------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', us::text, true);
  set local role authenticated;
  perform t.check('staff can read consultation requests', (select count(*) from consultation_requests) = 1);
  insert into consulting_projects (organization_id, title) values (oa, 'Inventory audit (demo)');
  insert into client_reports (organization_id, title, is_published) values (oa, 'Draft report', false), (oa, 'Final report', true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  perform t.check('client sees only published reports', (select count(*) from client_reports) = 1);
  perform t.check('non-staff cannot read consultation requests', (select count(*) from consultation_requests) = 0);
  perform t.check('non-staff cannot create consulting projects',
    t.sqlstate_of(format($q$insert into consulting_projects (organization_id, title) values (%L,'x')$q$, oa)) = '42501');
  perform set_config('request.jwt.claim.sub', ub::text, true);
  perform t.check('other tenant sees no reports', (select count(*) from client_reports) = 0);

  -- Staff onboarding of a consulting client ---------------------------------------------------------------
  declare co uuid; pr uuid;
  begin
    perform set_config('request.jwt.claim.sub', ua::text, true);
    perform t.check('non-staff cannot create client orgs', t.sqlstate_of($q$select staff_create_client_org('Evil','evil')$q$) = '42501');
    perform set_config('request.jwt.claim.sub', us::text, true);
    co := staff_create_client_org('Client Co (Demo)', 'client-co');
    perform staff_add_client_member(co, 'b@test.local', 'client');
    insert into software_projects (organization_id, name) values (co, 'Demo app') returning id into pr;
    insert into project_deliverables (organization_id, software_project_id, title, status, is_published)
      values (co, pr, 'Design pack', 'in_review', true), (co, pr, 'Internal notes', 'pending', false);
    insert into project_tasks (organization_id, software_project_id, title) values (co, pr, 'Internal task');
    perform set_config('request.jwt.claim.sub', ub::text, true);
    perform t.check('client member sees client org project', (select count(*) from software_projects where organization_id = co) = 1);
    perform t.check('client sees published deliverables only', (select count(*) from project_deliverables where organization_id = co) = 1);
    perform t.check('client cannot see internal tasks', (select count(*) from project_tasks where organization_id = co) = 0);
    perform t.check('client cannot read inventory ledger of a client org', (select count(*) from stock_movements where organization_id = co) = 0);
    perform client_decide(co, 'deliverable', (select id from project_deliverables where organization_id = co and is_published), true);
    perform t.check('client approval recorded', (select status from project_deliverables where organization_id = co and is_published) = 'approved');
    perform set_config('request.jwt.claim.sub', ua::text, true);
    perform t.check('unrelated user cannot see client org project', (select count(*) from software_projects where organization_id = co) = 0);
  end;
  reset role;
end $$;
