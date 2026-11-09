-- =====================================================================
-- ASOTECH Business Advisory — core schema (PostgreSQL 15+ / Supabase)
-- Order of execution:
--   schema.sql -> triggers/*.sql -> functions/*.sql -> policies/row-level-security.sql -> seed.sql
-- Multi-tenant: every tenant row carries organization_id. Cross-tenant references
-- inside the inventory core are prevented with composite foreign keys.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
create type org_role as enum ('owner','admin','manager','stock_counter','auditor','viewer','client');
create type staff_role as enum ('admin','consultant','developer','support');
create type org_kind as enum ('saas','consulting_client','internal');
create type movement_type as enum (
  'opening_balance','receipt','issue','transfer',
  'adjustment_in','adjustment_out','return_in','return_out'
);
create type approval_state as enum ('not_required','pending','approved','rejected');
create type request_status as enum ('new','in_review','contacted','scheduled','proposal_sent','won','lost','closed');

-- ---------------------------------------------------------------------
-- Identity, tenancy, RBAC
-- ---------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind org_kind not null default 'saas',
  country text not null default 'NG',
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  allow_negative_stock boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on organization_members (user_id) where is_active;

-- ASOTECH's own staff (consultants, developers). Granted only by service role.
create table platform_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_role staff_role not null default 'consultant',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table roles (
  key text primary key,
  description text not null
);
create table permissions (
  key text primary key,
  description text not null
);
create table role_permissions (
  role_key text not null references roles(key) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

-- Helper functions used by RLS and RPCs --------------------------------
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_staff where user_id = auth.uid() and is_active);
$$;

create or replace function is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where organization_id = org and user_id = auth.uid() and is_active
  );
$$;

create or replace function org_role_in(org uuid, roles org_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where organization_id = org and user_id = auth.uid() and is_active and role = any(roles)
  );
$$;

-- ---------------------------------------------------------------------
-- Catalogue: units, categories, products, barcodes
-- ---------------------------------------------------------------------
create table units_of_measure (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 20),
  name text not null,
  unique (organization_id, code),
  unique (organization_id, id)
);

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  parent_id uuid references product_categories(id) on delete set null,
  name text not null,
  unique (organization_id, name),
  unique (organization_id, id)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 64),
  name text not null check (char_length(name) between 1 and 300),
  description text,
  category_id uuid references product_categories(id) on delete set null,
  uom_id uuid references units_of_measure(id) on delete set null,
  track_batches boolean not null default false,
  track_expiry boolean not null default false,
  reorder_level numeric(18,4) not null default 0 check (reorder_level >= 0),
  cost_price numeric(18,4) not null default 0 check (cost_price >= 0),
  sale_price numeric(18,4) not null default 0 check (sale_price >= 0),
  is_active boolean not null default true,
  external_ref text,                       -- id in an external ERP / POS system
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku),
  unique (organization_id, id),
  check (not track_expiry or track_batches)
);
create index on products (organization_id, name);
create index on products (organization_id, external_ref) where external_ref is not null;

create table product_barcodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null,
  barcode text not null check (char_length(barcode) between 3 and 64),
  symbology text not null default 'EAN13',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, barcode),
  foreign key (organization_id, product_id) references products (organization_id, id) on delete cascade
);
create index on product_barcodes (organization_id, product_id);

-- ---------------------------------------------------------------------
-- Warehouses, locations, batches
-- ---------------------------------------------------------------------
create table warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  address text,
  is_active boolean not null default true,
  external_ref text,
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  warehouse_id uuid not null,
  code text not null,
  name text,
  location_type text not null default 'bin' check (location_type in ('bin','zone','receiving','quarantine','dispatch','shop_floor')),
  is_active boolean not null default true,
  external_ref text,
  created_at timestamptz not null default now(),
  unique (organization_id, warehouse_id, code),
  unique (organization_id, id),
  foreign key (organization_id, warehouse_id) references warehouses (organization_id, id) on delete cascade
);
create index on locations (organization_id, warehouse_id);

create table batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null,
  batch_no text not null,
  manufactured_on date,
  expiry_date date,
  created_at timestamptz not null default now(),
  unique (organization_id, product_id, batch_no),
  unique (organization_id, id),
  foreign key (organization_id, product_id) references products (organization_id, id) on delete cascade,
  check (expiry_date is null or manufactured_on is null or expiry_date >= manufactured_on)
);
create index on batches (organization_id, expiry_date);

-- ---------------------------------------------------------------------
-- Integration events (declared early: referenced by the ledger)
-- ---------------------------------------------------------------------
create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('erp_system','appsheet','aso_tech_services','paystack','pos','accounting','hr')),
  name text not null,
  status text not null default 'draft' check (status in ('draft','configured','verified','disabled')),
  config jsonb not null default '{}'::jsonb,   -- non-secret settings only
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

-- Secrets live apart, with no RLS policy and no grants: service role only.
create table integration_secrets (
  connection_id uuid primary key references integration_connections(id) on delete cascade,
  secret_ciphertext bytea not null,
  key_version int not null default 1,
  updated_at timestamptz not null default now()
);

create table integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  connection_id uuid not null,
  direction text not null check (direction in ('inbound','outbound')),
  event_type text not null,
  idempotency_key text not null,           -- duplicate prevention
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processed','failed','ignored')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (organization_id, connection_id, idempotency_key),
  unique (organization_id, id),
  foreign key (organization_id, connection_id) references integration_connections (organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Inventory ledger (authoritative, immutable) and balances (derived)
-- ---------------------------------------------------------------------
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  movement_type movement_type not null,
  reference text not null,
  approval approval_state not null default 'not_required',
  idempotency_key text,
  integration_event_id uuid,
  reverses_movement_id uuid references stock_movements(id),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, integration_event_id) references integration_events (organization_id, id)
);
create index on stock_movements (organization_id, created_at desc);
create index on stock_movements (organization_id, reference);

create table stock_movement_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  movement_id uuid not null,
  product_id uuid not null,
  batch_id uuid,
  from_location_id uuid,
  to_location_id uuid,
  quantity numeric(18,4) not null check (quantity > 0),
  unit_cost numeric(18,4) check (unit_cost is null or unit_cost >= 0),
  created_at timestamptz not null default now(),
  foreign key (organization_id, movement_id) references stock_movements (organization_id, id) on delete restrict,
  foreign key (organization_id, product_id) references products (organization_id, id) on delete restrict,
  foreign key (organization_id, batch_id) references batches (organization_id, id) on delete restrict,
  foreign key (organization_id, from_location_id) references locations (organization_id, id) on delete restrict,
  foreign key (organization_id, to_location_id) references locations (organization_id, id) on delete restrict,
  check (from_location_id is not null or to_location_id is not null),
  check (from_location_id is distinct from to_location_id)
);
create index on stock_movement_lines (organization_id, product_id, created_at desc);
create index on stock_movement_lines (organization_id, movement_id);

create table inventory_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  product_id uuid not null,
  location_id uuid not null,
  batch_id uuid,
  batch_key uuid generated always as (coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  quantity numeric(18,4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id, location_id, batch_key),
  foreign key (organization_id, product_id) references products (organization_id, id) on delete restrict,
  foreign key (organization_id, location_id) references locations (organization_id, id) on delete restrict,
  foreign key (organization_id, batch_id) references batches (organization_id, id) on delete restrict
);
create index on inventory_balances (organization_id, location_id);

create table expiry_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  batch_id uuid not null,
  location_id uuid not null,
  quantity numeric(18,4) not null,
  expiry_date date not null,
  status text not null check (status in ('ok','near_expiry','expired','written_off')),
  checked_at timestamptz not null default now(),
  unique (organization_id, batch_id, location_id),
  foreign key (organization_id, batch_id) references batches (organization_id, id) on delete cascade,
  foreign key (organization_id, location_id) references locations (organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Stocktaking, cycle counting, reconciliation, adjustments, approvals
-- ---------------------------------------------------------------------
create table stock_count_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  warehouse_id uuid not null,
  name text not null,
  count_type text not null default 'full' check (count_type in ('full','cycle','spot')),
  status text not null default 'draft'
    check (status in ('draft','counting','review','reconciling','approved','posted','cancelled')),
  blind_count boolean not null default true,
  snapshot_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, warehouse_id) references warehouses (organization_id, id) on delete restrict
);

create table stock_count_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  session_id uuid not null,
  product_id uuid not null,
  location_id uuid not null,
  batch_id uuid,
  snapshot_qty numeric(18,4) not null,
  first_count_qty numeric(18,4),            -- original value, never overwritten
  counted_qty numeric(18,4),                -- latest accepted value
  variance_qty numeric(18,4) generated always as (counted_qty - snapshot_qty) stored,
  status text not null default 'pending' check (status in ('pending','counted','recount','verified')),
  assigned_to uuid references auth.users(id) on delete set null,
  counted_by uuid references auth.users(id) on delete set null,
  counted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, session_id) references stock_count_sessions (organization_id, id) on delete cascade,
  foreign key (organization_id, product_id) references products (organization_id, id) on delete restrict,
  foreign key (organization_id, location_id) references locations (organization_id, id) on delete restrict,
  foreign key (organization_id, batch_id) references batches (organization_id, id) on delete restrict
);
create index on stock_count_lines (organization_id, session_id, status);
create unique index stock_count_lines_unique
  on stock_count_lines (session_id, product_id, location_id, coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Every entry ever made for a line: original count and all recounts.
create table stock_count_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  line_id uuid not null,
  entry_no int not null,
  quantity numeric(18,4) not null check (quantity >= 0),
  entered_by uuid references auth.users(id) on delete set null,
  entered_at timestamptz not null default now(),
  source text not null default 'web' check (source in ('web','appsheet','import','scanner')),
  note text,
  unique (line_id, entry_no),
  foreign key (organization_id, line_id) references stock_count_lines (organization_id, id) on delete cascade
);

create table reconciliation_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  count_session_id uuid not null,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','posted')),
  prepared_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, count_session_id) references stock_count_sessions (organization_id, id) on delete restrict
);

create table reconciliation_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  reconciliation_id uuid not null,
  count_line_id uuid not null,
  product_id uuid not null,
  location_id uuid not null,
  batch_id uuid,
  system_qty numeric(18,4) not null,
  counted_qty numeric(18,4) not null,
  variance_qty numeric(18,4) generated always as (counted_qty - system_qty) stored,
  variance_value numeric(18,4),
  reason_code text check (reason_code in ('miscount','damage','theft','expiry','receiving_error','issue_error','unrecorded_transfer','data_error','other')),
  explanation text,
  action text not null default 'adjust' check (action in ('adjust','investigate','ignore')),
  foreign key (organization_id, reconciliation_id) references reconciliation_sessions (organization_id, id) on delete cascade,
  foreign key (organization_id, count_line_id) references stock_count_lines (organization_id, id) on delete restrict
);

create table stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reconciliation_id uuid,
  reference text not null,
  reason text,
  status text not null default 'pending_approval' check (status in ('draft','pending_approval','approved','rejected','posted')),
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  movement_ids uuid[] not null default '{}',   -- ledger movements posted on approval (in and/or out)
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, reference)
);

create table stock_adjustment_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  adjustment_id uuid not null,
  product_id uuid not null,
  location_id uuid not null,
  batch_id uuid,
  quantity_delta numeric(18,4) not null check (quantity_delta <> 0),
  unit_cost numeric(18,4),
  foreign key (organization_id, adjustment_id) references stock_adjustments (organization_id, id) on delete cascade,
  foreign key (organization_id, product_id) references products (organization_id, id) on delete restrict,
  foreign key (organization_id, location_id) references locations (organization_id, id) on delete restrict,
  foreign key (organization_id, batch_id) references batches (organization_id, id) on delete restrict
);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('stock_adjustment','reconciliation','purchase_order','quotation','deliverable','milestone')),
  entity_id uuid not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (status = 'pending' or decided_at is not null)
);
create unique index approval_one_pending on approval_requests (entity_type, entity_id) where status = 'pending';
create index on approval_requests (organization_id, status);

-- ---------------------------------------------------------------------
-- Procurement
-- ---------------------------------------------------------------------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  is_active boolean not null default true,
  external_ref text,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  po_number text not null,
  supplier_id uuid not null,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','partially_received','received','cancelled')),
  expected_date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, po_number),
  unique (organization_id, id),
  foreign key (organization_id, supplier_id) references suppliers (organization_id, id) on delete restrict
);

create table purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  purchase_order_id uuid not null,
  product_id uuid not null,
  quantity numeric(18,4) not null check (quantity > 0),
  received_quantity numeric(18,4) not null default 0 check (received_quantity >= 0),
  unit_cost numeric(18,4) not null check (unit_cost >= 0),
  unique (organization_id, id),
  foreign key (organization_id, purchase_order_id) references purchase_orders (organization_id, id) on delete cascade,
  foreign key (organization_id, product_id) references products (organization_id, id) on delete restrict
);

create table goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  receipt_no text not null,
  purchase_order_id uuid,
  status text not null default 'draft' check (status in ('draft','posted','cancelled')),
  movement_id uuid references stock_movements(id),
  received_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  unique (organization_id, receipt_no),
  unique (organization_id, id),
  foreign key (organization_id, purchase_order_id) references purchase_orders (organization_id, id) on delete restrict
);

create table goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  goods_receipt_id uuid not null,
  po_line_id uuid,
  product_id uuid not null,
  location_id uuid not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit_cost numeric(18,4) check (unit_cost is null or unit_cost >= 0),
  batch_no text,
  expiry_date date,
  foreign key (organization_id, goods_receipt_id) references goods_receipts (organization_id, id) on delete cascade,
  foreign key (organization_id, po_line_id) references purchase_order_lines (organization_id, id) on delete restrict,
  foreign key (organization_id, product_id) references products (organization_id, id) on delete restrict,
  foreign key (organization_id, location_id) references locations (organization_id, id) on delete restrict
);

-- ---------------------------------------------------------------------
-- Audit, subscriptions, billing
-- ---------------------------------------------------------------------
create table audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index on audit_logs (organization_id, created_at desc);
create index on audit_logs (table_name, record_id);

-- Prices are NULL until set through business planning and market validation.
create table subscription_plans (
  key text primary key check (key in ('starter','professional','enterprise','consulting_bundle')),
  name text not null,
  description text,
  monthly_price_kobo bigint check (monthly_price_kobo is null or monthly_price_kobo >= 0),
  annual_price_kobo bigint check (annual_price_kobo is null or annual_price_kobo >= 0),
  limits jsonb not null default '{}'::jsonb,
  is_published boolean not null default false
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_key text not null references subscription_plans(key),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','cancelled','expired')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  paystack_customer_code text,
  paystack_subscription_code text,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index one_live_subscription on subscriptions (organization_id) where status in ('trialing','active','past_due');

create table billing_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  currency text not null default 'NGN',
  status text not null check (status in ('pending','paid','failed','refunded')),
  paystack_reference text unique,
  description text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Public website: service catalogue and inbound requests
-- ---------------------------------------------------------------------
create table service_catalogue (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category text not null,
  title text not null,
  summary text not null,
  description text,
  offerings text[] not null default '{}',
  deliverables text[] not null default '{}',
  sort_order int not null default 100,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  subject text check (subject is null or char_length(subject) <= 200),
  message text not null check (char_length(message) between 5 and 5000),
  status request_status not null default 'new',
  created_at timestamptz not null default now()
);

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references service_catalogue(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  company text check (company is null or char_length(company) <= 200),
  message text check (message is null or char_length(message) <= 5000),
  status request_status not null default 'new',
  created_at timestamptz not null default now()
);

create table consultation_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references service_catalogue(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  company text check (company is null or char_length(company) <= 200),
  preferred_date date,
  preferred_time text check (preferred_time is null or preferred_time in ('morning','afternoon','evening')),
  meeting_mode text not null default 'video' check (meeting_mode in ('video','phone','in_person')),
  message text check (message is null or char_length(message) <= 5000),
  status request_status not null default 'new',
  created_at timestamptz not null default now()
);

create table proposal_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references service_catalogue(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  company text check (company is null or char_length(company) <= 200),
  budget_range text check (budget_range is null or char_length(budget_range) <= 60),
  timeline text check (timeline is null or char_length(timeline) <= 60),
  scope text not null check (char_length(scope) between 10 and 8000),
  status request_status not null default 'new',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Consulting delivery and client portal
-- ---------------------------------------------------------------------
create table consulting_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,   -- the client organisation
  service_id uuid references service_catalogue(id) on delete set null,
  title text not null,
  summary text,
  status text not null default 'planned' check (status in ('planned','active','on_hold','completed','cancelled')),
  lead_user_id uuid references auth.users(id) on delete set null,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table client_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  consulting_project_id uuid,
  title text not null,
  report_type text not null default 'general' check (report_type in ('general','audit','reconciliation','status','final')),
  storage_path text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, consulting_project_id) references consulting_projects (organization_id, id) on delete set null (consulting_project_id)
);

create table audit_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  consulting_project_id uuid,
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','accepted')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, consulting_project_id) references consulting_projects (organization_id, id) on delete set null (consulting_project_id)
);

create table corrective_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  finding_id uuid not null,
  description text not null,
  owner_name text,
  due_date date,
  status text not null default 'open' check (status in ('open','in_progress','done','overdue')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (organization_id, finding_id) references audit_findings (organization_id, id) on delete cascade
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 200),
  body text not null check (char_length(body) between 3 and 8000),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','waiting_client','resolved','closed')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Software development project management
-- ---------------------------------------------------------------------
create table software_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,   -- the client organisation
  name text not null,
  description text,
  stage text not null default 'discovery' check (stage in ('discovery','design','development','testing','deployment','support')),
  status text not null default 'planned' check (status in ('planned','active','on_hold','completed','cancelled')),
  project_manager uuid references auth.users(id) on delete set null,
  starts_on date,
  target_date date,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table project_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  software_project_id uuid not null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','must')),
  status text not null default 'proposed' check (status in ('proposed','agreed','in_progress','done','dropped')),
  created_at timestamptz not null default now(),
  foreign key (organization_id, software_project_id) references software_projects (organization_id, id) on delete cascade
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  software_project_id uuid,
  quote_number text not null,
  currency text not null default 'NGN',
  line_items jsonb not null default '[]'::jsonb,
  total_amount numeric(18,2) not null default 0 check (total_amount >= 0),
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired')),
  valid_until date,
  created_at timestamptz not null default now(),
  unique (organization_id, quote_number),
  foreign key (organization_id, software_project_id) references software_projects (organization_id, id) on delete set null (software_project_id)
);

create table project_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  software_project_id uuid not null,
  title text not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','done','approved')),
  unique (organization_id, id),
  foreign key (organization_id, software_project_id) references software_projects (organization_id, id) on delete cascade
);

create table project_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  software_project_id uuid not null,
  milestone_id uuid,
  title text not null,
  kind text not null default 'document' check (kind in ('document','design','code','build','test_report','training')),
  status text not null default 'pending' check (status in ('pending','in_review','approved','changes_requested')),
  storage_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (organization_id, software_project_id) references software_projects (organization_id, id) on delete cascade,
  foreign key (organization_id, milestone_id) references project_milestones (organization_id, id) on delete set null (milestone_id)
);

create table project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  software_project_id uuid not null,
  milestone_id uuid,
  title text not null,
  stage text not null default 'development' check (stage in ('discovery','design','development','testing','deployment','support')),
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','review','done')),
  assignee uuid references auth.users(id) on delete set null,
  estimate_hours numeric(8,2) check (estimate_hours is null or estimate_hours >= 0),
  due_date date,
  created_at timestamptz not null default now(),
  foreign key (organization_id, software_project_id) references software_projects (organization_id, id) on delete cascade,
  foreign key (organization_id, milestone_id) references project_milestones (organization_id, id) on delete set null (milestone_id)
);
create index on project_tasks (organization_id, software_project_id, status);

create table client_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  visibility text not null default 'client' check (visibility in ('client','internal')),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Operational views (security_invoker: RLS of the caller still applies)
-- ---------------------------------------------------------------------
create view v_stock_on_hand with (security_invoker = true) as
  select b.organization_id, b.product_id, p.sku, p.name as product_name,
         sum(b.quantity) as quantity, p.reorder_level,
         (sum(b.quantity) <= p.reorder_level) as is_low
  from inventory_balances b
  join products p on p.organization_id = b.organization_id and p.id = b.product_id
  group by b.organization_id, b.product_id, p.sku, p.name, p.reorder_level;

create view v_fefo_pick with (security_invoker = true) as
  select b.organization_id, b.product_id, b.location_id, b.batch_id, bt.batch_no, bt.expiry_date, b.quantity,
         row_number() over (partition by b.organization_id, b.product_id
                            order by bt.expiry_date asc nulls last, bt.batch_no) as pick_rank
  from inventory_balances b
  join batches bt on bt.organization_id = b.organization_id and bt.id = b.batch_id
  where b.quantity > 0 and (bt.expiry_date is null or bt.expiry_date >= current_date);
