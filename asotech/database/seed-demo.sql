-- =====================================================================
-- DEMO DATA ONLY. Every record is labelled "Demo". Never load in production.
-- Requires a signed-up auth user: set :demo_user to their auth.users id, e.g.
--   psql -v demo_user="'<uuid>'" -f database/seed-demo.sql
-- =====================================================================
select set_config('app.demo_user', :demo_user, false);

do $$
declare
  u uuid := current_setting('app.demo_user')::uuid;
  o uuid;
  w uuid; l1 uuid; l2 uuid; l3 uuid;
  uom uuid;
  p1 uuid; p2 uuid; p3 uuid;
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  o := create_organization('Demo Retail Ltd (Demo)', 'demo-retail-' || substr(gen_random_uuid()::text,1,6));
  select id into uom from units_of_measure where organization_id = o and code = 'EA';

  insert into warehouses (organization_id, code, name) values (o, 'WH-DEMO', 'Demo Main Warehouse') returning id into w;
  insert into locations (organization_id, warehouse_id, code, name) values (o, w, 'A-01', 'Demo Bin A-01') returning id into l1;
  insert into locations (organization_id, warehouse_id, code, name) values (o, w, 'A-02', 'Demo Bin A-02') returning id into l2;
  insert into locations (organization_id, warehouse_id, code, name) values (o, w, 'B-01', 'Demo Bin B-01') returning id into l3;

  insert into products (organization_id, sku, name, uom_id, reorder_level, cost_price, sale_price)
    values (o, 'DEMO-001', 'Demo Product One', uom, 20, 1000, 1500) returning id into p1;
  insert into products (organization_id, sku, name, uom_id, reorder_level, cost_price, sale_price)
    values (o, 'DEMO-002', 'Demo Product Two', uom, 10, 2500, 3500) returning id into p2;
  insert into products (organization_id, sku, name, uom_id, reorder_level, cost_price, sale_price)
    values (o, 'DEMO-003', 'Demo Product Three', uom, 5, 400, 650) returning id into p3;

  insert into product_barcodes (organization_id, product_id, barcode, is_primary) values
    (o, p1, '0000000000017', true), (o, p2, '0000000000024', true), (o, p3, '0000000000031', true);

  perform post_stock_movement(o, 'opening_balance', 'DEMO-OPEN-1', jsonb_build_array(
    jsonb_build_object('product_id', p1, 'to_location_id', l1, 'quantity', 120, 'unit_cost', 1000),
    jsonb_build_object('product_id', p2, 'to_location_id', l2, 'quantity', 45,  'unit_cost', 2500),
    jsonb_build_object('product_id', p3, 'to_location_id', l3, 'quantity', 8,   'unit_cost', 400)
  ), 'demo-open-1', 'Demo opening balance');
end $$;
