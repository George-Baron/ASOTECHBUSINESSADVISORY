-- =====================================================================
-- Row Level Security and privileges
-- Principles
--   * Deny by default: RLS is enabled on every table in public.
--   * Tenant isolation: members only ever see rows of their own organisations.
--   * Ledger, balances and approvals are read-only for clients of the API;
--     they change only through the SECURITY DEFINER functions in rpc.sql.
--   * ASOTECH staff (platform_staff) manage consulting and project data.
--   * Public website forms are insert-only for anonymous visitors.
-- =====================================================================

-- 1. Enable RLS everywhere -------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 2. Baseline privileges: nothing for anon, then grant per table ------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Read-only (via RLS) for signed-in users
grant select on
  organizations, user_profiles, organization_members, roles, permissions, role_permissions,
  units_of_measure, product_categories, products, product_barcodes, warehouses, locations, batches,
  stock_movements, stock_movement_lines, inventory_balances, expiry_records,
  stock_count_sessions, stock_count_lines, stock_count_entries,
  reconciliation_sessions, reconciliation_lines, stock_adjustments, stock_adjustment_lines, approval_requests,
  suppliers, purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines,
  audit_logs, subscription_plans, subscriptions, billing_records,
  integration_connections, integration_events,
  service_catalogue, contact_messages, service_requests, consultation_requests, proposal_requests,
  consulting_projects, client_reports, audit_findings, corrective_actions, support_tickets,
  software_projects, project_requirements, quotations, project_milestones, project_deliverables,
  project_tasks, client_documents
to authenticated;
grant select on service_catalogue, subscription_plans to anon;

-- Master data and planning tables that managers edit directly
grant insert, update, delete on
  units_of_measure, product_categories, products, product_barcodes, warehouses, locations, batches,
  suppliers, purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines,
  integration_connections, organization_members
to authenticated;

-- Column-limited updates
grant update (name, country, currency, allow_negative_stock) on organizations to authenticated;
grant update (full_name, phone, avatar_url) on user_profiles to authenticated;
grant update (reason_code, explanation, action) on reconciliation_lines to authenticated;

-- Staff-managed delivery tables
grant insert, update, delete on
  service_catalogue, subscription_plans, consulting_projects, client_reports, audit_findings,
  corrective_actions, software_projects, project_requirements, quotations, project_milestones,
  project_deliverables, project_tasks, contact_messages, service_requests, consultation_requests,
  proposal_requests
to authenticated;
grant insert, update on support_tickets, client_documents to authenticated;

-- Public forms: insert only
grant insert on contact_messages, service_requests, consultation_requests, proposal_requests to anon, authenticated;

-- Never exposed to API roles: platform_staff, integration_secrets (no grants at all)

-- 3. Policies ----------------------------------------------------------------

-- Organisations & membership
create policy orgs_select on organizations for select to authenticated
  using (is_org_member(id) or is_staff());
create policy orgs_update on organizations for update to authenticated
  using (org_role_in(id, array['owner','admin']::org_role[]))
  with check (org_role_in(id, array['owner','admin']::org_role[]));

create policy members_select on organization_members for select to authenticated
  using (user_id = auth.uid() or is_org_member(organization_id) or is_staff());
create policy members_insert on organization_members for insert to authenticated
  with check (
    org_role_in(organization_id, array['owner']::org_role[])
    or (org_role_in(organization_id, array['admin']::org_role[]) and role not in ('owner','admin'))
  );
create policy members_update on organization_members for update to authenticated
  using (
    org_role_in(organization_id, array['owner']::org_role[])
    or (org_role_in(organization_id, array['admin']::org_role[]) and role not in ('owner','admin'))
  )
  with check (
    org_role_in(organization_id, array['owner']::org_role[])
    or (org_role_in(organization_id, array['admin']::org_role[]) and role not in ('owner','admin'))
  );
create policy members_delete on organization_members for delete to authenticated
  using (
    org_role_in(organization_id, array['owner']::org_role[])
    or (org_role_in(organization_id, array['admin']::org_role[]) and role not in ('owner','admin'))
  );

create policy profiles_select on user_profiles for select to authenticated
  using (id = auth.uid() or is_staff() or exists (
    select 1 from organization_members me
    join organization_members them on them.organization_id = me.organization_id
    where me.user_id = auth.uid() and me.is_active and them.user_id = user_profiles.id and them.is_active));
create policy profiles_update on user_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy roles_select on roles for select to authenticated using (true);
create policy permissions_select on permissions for select to authenticated using (true);
create policy role_permissions_select on role_permissions for select to authenticated using (true);

-- Master data: members read, owner/admin/manager write ------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'units_of_measure','product_categories','products','product_barcodes','warehouses','locations','batches',
    'suppliers','purchase_orders','purchase_order_lines','goods_receipts','goods_receipt_lines'
  ] loop
    execute format('create policy %1$s_select on %1$I for select to authenticated
                    using (is_org_member(organization_id) or is_staff())', t);
    execute format('create policy %1$s_insert on %1$I for insert to authenticated
                    with check (org_role_in(organization_id, array[''owner'',''admin'',''manager'']::org_role[]))', t);
    execute format('create policy %1$s_update on %1$I for update to authenticated
                    using (org_role_in(organization_id, array[''owner'',''admin'',''manager'']::org_role[]))
                    with check (org_role_in(organization_id, array[''owner'',''admin'',''manager'']::org_role[]))', t);
    execute format('create policy %1$s_delete on %1$I for delete to authenticated
                    using (org_role_in(organization_id, array[''owner'',''admin'']::org_role[]))', t);
  end loop;
end $$;

-- Posted documents cannot be edited or removed through the API
drop policy goods_receipts_update on goods_receipts;
create policy goods_receipts_update on goods_receipts for update to authenticated
  using (status = 'draft' and org_role_in(organization_id, array['owner','admin','manager']::org_role[]))
  with check (status = 'draft' and org_role_in(organization_id, array['owner','admin','manager']::org_role[]));
drop policy goods_receipts_delete on goods_receipts;
create policy goods_receipts_delete on goods_receipts for delete to authenticated
  using (status = 'draft' and org_role_in(organization_id, array['owner','admin']::org_role[]));

-- Ledger and derived tables: read-only through the API. Stock counters and clients are excluded
-- so blind counts cannot be defeated by reading system balances. -----------------
do $$
declare t text;
begin
  foreach t in array array[
    'stock_movements','stock_movement_lines','inventory_balances','expiry_records',
    'stock_adjustments','stock_adjustment_lines','approval_requests',
    'stock_count_sessions','reconciliation_sessions','stock_count_entries'
  ] loop
    execute format('create policy %1$s_select on %1$I for select to authenticated
                    using (org_role_in(organization_id, array[''owner'',''admin'',''manager'',''auditor'',''viewer'']::org_role[]) or is_staff())', t);
  end loop;
end $$;

-- Count lines: stock counters use the v_count_sheet view (blind counts hide system quantity)
create policy count_lines_select on stock_count_lines for select to authenticated
  using (org_role_in(organization_id, array['owner','admin','manager','auditor','viewer']::org_role[]) or is_staff());

create policy recon_lines_select on reconciliation_lines for select to authenticated
  using (org_role_in(organization_id, array['owner','admin','manager','auditor','viewer']::org_role[]) or is_staff());
create policy recon_lines_update on reconciliation_lines for update to authenticated
  using (org_role_in(organization_id, array['owner','admin','manager']::org_role[])
         and exists (select 1 from reconciliation_sessions r where r.id = reconciliation_id and r.status = 'draft'))
  with check (org_role_in(organization_id, array['owner','admin','manager']::org_role[]));

create or replace view v_count_sheet as
  select l.id, l.organization_id, l.session_id, l.product_id, p.sku, p.name as product_name,
         l.location_id, loc.code as location_code, l.batch_id, l.status, l.assigned_to,
         l.counted_qty,
         case when s.blind_count then null else l.snapshot_qty end as snapshot_qty
    from stock_count_lines l
    join stock_count_sessions s on s.organization_id = l.organization_id and s.id = l.session_id
    join products p on p.organization_id = l.organization_id and p.id = l.product_id
    join locations loc on loc.organization_id = l.organization_id and loc.id = l.location_id
   where is_org_member(l.organization_id)
     and (l.assigned_to = auth.uid()
          or org_role_in(l.organization_id, array['owner','admin','manager','auditor']::org_role[]));
grant select on v_count_sheet to authenticated;
grant select on v_stock_on_hand, v_fefo_pick to authenticated;

-- Audit logs, billing, subscriptions, integrations ------------------------------
create policy audit_select on audit_logs for select to authenticated
  using (org_role_in(organization_id, array['owner','admin','auditor']::org_role[]) or is_staff());
create policy plans_select_public on subscription_plans for select to anon
  using (is_published);
create policy plans_select_auth on subscription_plans for select to authenticated
  using (is_published or is_staff());
create policy plans_staff_write on subscription_plans for all to authenticated
  using (is_staff()) with check (is_staff());
create policy subs_select on subscriptions for select to authenticated
  using (org_role_in(organization_id, array['owner','admin']::org_role[]) or is_staff());
create policy billing_select on billing_records for select to authenticated
  using (org_role_in(organization_id, array['owner','admin']::org_role[]) or is_staff());

create policy integ_conn_select on integration_connections for select to authenticated
  using (org_role_in(organization_id, array['owner','admin']::org_role[]) or is_staff());
create policy integ_conn_insert on integration_connections for insert to authenticated
  with check (org_role_in(organization_id, array['owner','admin']::org_role[]) and status in ('draft','configured'));
create policy integ_conn_update on integration_connections for update to authenticated
  using (org_role_in(organization_id, array['owner','admin']::org_role[]))
  with check (org_role_in(organization_id, array['owner','admin']::org_role[]) and status in ('draft','configured','disabled'));
create policy integ_conn_delete on integration_connections for delete to authenticated
  using (org_role_in(organization_id, array['owner','admin']::org_role[]));
create policy integ_events_select on integration_events for select to authenticated
  using (org_role_in(organization_id, array['owner','admin']::org_role[]) or is_staff());

-- Public website -----------------------------------------------------------------
create policy catalogue_public on service_catalogue for select to anon
  using (is_published);
create policy catalogue_auth on service_catalogue for select to authenticated
  using (is_published or is_staff());
create policy catalogue_staff_write on service_catalogue for all to authenticated
  using (is_staff()) with check (is_staff());

do $$
declare t text;
begin
  foreach t in array array['contact_messages','service_requests','consultation_requests','proposal_requests'] loop
    execute format('create policy %1$s_submit on %1$I for insert to anon, authenticated
                    with check (status = ''new'')', t);
    execute format('create policy %1$s_staff_select on %1$I for select to authenticated using (is_staff())', t);
    execute format('create policy %1$s_staff_update on %1$I for update to authenticated
                    using (is_staff()) with check (is_staff())', t);
    execute format('create policy %1$s_staff_delete on %1$I for delete to authenticated using (is_staff())', t);
  end loop;
end $$;

-- Consulting delivery and client portal --------------------------------------------
create policy cproj_select on consulting_projects for select to authenticated
  using (is_org_member(organization_id) or is_staff());
create policy cproj_staff on consulting_projects for all to authenticated
  using (is_staff()) with check (is_staff());

do $$
declare t text;
begin
  foreach t in array array['client_reports','audit_findings','corrective_actions'] loop
    execute format('create policy %1$s_select on %1$I for select to authenticated
                    using (is_staff() or (is_org_member(organization_id) and is_published))', t);
    execute format('create policy %1$s_staff on %1$I for all to authenticated
                    using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

create policy tickets_select on support_tickets for select to authenticated
  using (is_org_member(organization_id) or is_staff());
create policy tickets_insert on support_tickets for insert to authenticated
  with check (is_org_member(organization_id) and created_by = auth.uid() and status = 'open');
create policy tickets_update on support_tickets for update to authenticated
  using (is_staff()) with check (is_staff());

create policy sproj_select on software_projects for select to authenticated
  using (is_org_member(organization_id) or is_staff());
create policy sproj_staff on software_projects for all to authenticated
  using (is_staff()) with check (is_staff());

create policy reqs_select on project_requirements for select to authenticated
  using (is_org_member(organization_id) or is_staff());
create policy reqs_staff on project_requirements for all to authenticated
  using (is_staff()) with check (is_staff());

create policy miles_select on project_milestones for select to authenticated
  using (is_org_member(organization_id) or is_staff());
create policy miles_staff on project_milestones for all to authenticated
  using (is_staff()) with check (is_staff());

create policy delivs_select on project_deliverables for select to authenticated
  using (is_staff() or (is_org_member(organization_id) and is_published));
create policy delivs_staff on project_deliverables for all to authenticated
  using (is_staff()) with check (is_staff());

create policy tasks_staff on project_tasks for all to authenticated
  using (is_staff()) with check (is_staff());
create policy tasks_member_select on project_tasks for select to authenticated
  using (org_role_in(organization_id, array['owner','admin','manager','viewer']::org_role[]));

create policy quotes_select on quotations for select to authenticated
  using (is_staff() or (is_org_member(organization_id) and status <> 'draft'));
create policy quotes_staff on quotations for all to authenticated
  using (is_staff()) with check (is_staff());

create policy docs_select on client_documents for select to authenticated
  using (is_staff() or (is_org_member(organization_id) and visibility = 'client'));
create policy docs_insert on client_documents for insert to authenticated
  with check (is_staff() or (is_org_member(organization_id) and visibility = 'client' and uploaded_by = auth.uid()));
create policy docs_update on client_documents for update to authenticated
  using (is_staff()) with check (is_staff());

-- 4. Storage (Supabase): private bucket, first path segment must be the organisation id ----
do $$
begin
  if to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('client-documents', 'client-documents', false, 20971520,
            array['application/pdf','image/png','image/jpeg','text/csv','text/plain',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    on conflict (id) do nothing;

    execute $p$create policy "client docs read" on storage.objects for select to authenticated
      using (bucket_id = 'client-documents'
             and (public.is_staff() or public.is_org_member(((storage.foldername(name))[1])::uuid)))$p$;
    execute $p$create policy "client docs upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'client-documents'
             and (public.is_staff() or public.is_org_member(((storage.foldername(name))[1])::uuid)))$p$;
  end if;
end $$;
