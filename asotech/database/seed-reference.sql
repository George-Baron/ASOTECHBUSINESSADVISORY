-- Reference data required in every environment (no demo records).

insert into roles (key, description) values
  ('owner','Full control of the organisation, billing and members'),
  ('admin','Manages members, settings, integrations and approvals'),
  ('manager','Manages master data, movements, stocktakes and reconciliations'),
  ('stock_counter','Captures physical counts on assigned lines only'),
  ('auditor','Read-only access including audit logs and reconciliation'),
  ('viewer','Read-only access to operational data'),
  ('client','ASOTECH consulting or project client: published deliverables only')
on conflict (key) do nothing;

insert into permissions (key, description) values
  ('products.manage','Create and edit products, barcodes, categories'),
  ('warehouses.manage','Create and edit warehouses and locations'),
  ('movements.post','Post stock movements'),
  ('stocktake.run','Create and close stock count sessions'),
  ('stocktake.count','Capture counts on assigned lines'),
  ('reconciliation.prepare','Prepare and submit reconciliations'),
  ('approvals.decide','Approve or reject stock adjustments'),
  ('procurement.manage','Manage suppliers, purchase orders and receipts'),
  ('members.manage','Invite and manage members'),
  ('integrations.manage','Configure integrations'),
  ('billing.view','View subscription and billing'),
  ('audit.view','View audit logs'),
  ('reports.view','View reports and dashboards')
on conflict (key) do nothing;

insert into role_permissions (role_key, permission_key) values
  ('owner','products.manage'),('owner','warehouses.manage'),('owner','movements.post'),('owner','stocktake.run'),
  ('owner','reconciliation.prepare'),('owner','approvals.decide'),('owner','procurement.manage'),
  ('owner','members.manage'),('owner','integrations.manage'),('owner','billing.view'),('owner','audit.view'),('owner','reports.view'),
  ('admin','products.manage'),('admin','warehouses.manage'),('admin','movements.post'),('admin','stocktake.run'),
  ('admin','reconciliation.prepare'),('admin','approvals.decide'),('admin','procurement.manage'),
  ('admin','members.manage'),('admin','integrations.manage'),('admin','billing.view'),('admin','audit.view'),('admin','reports.view'),
  ('manager','products.manage'),('manager','warehouses.manage'),('manager','movements.post'),('manager','stocktake.run'),
  ('manager','reconciliation.prepare'),('manager','procurement.manage'),('manager','reports.view'),
  ('stock_counter','stocktake.count'),
  ('auditor','audit.view'),('auditor','reports.view'),('auditor','reconciliation.prepare'),
  ('viewer','reports.view')
on conflict do nothing;

-- Plans exist but are unpublished and unpriced until pricing is validated by the business.
insert into subscription_plans (key, name, description, limits, is_published) values
  ('starter','Starter','Single-business inventory control for small teams','{"max_users":3,"max_warehouses":1}', false),
  ('professional','Professional','Multi-branch inventory, stocktaking and approvals','{"max_users":15,"max_warehouses":10}', false),
  ('enterprise','Enterprise','Unlimited scale, integrations and priority support','{}', false),
  ('consulting_bundle','Consulting + Software','Software subscription bundled with ASOTECH consulting delivery','{}', false)
on conflict (key) do nothing;
