"use server";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid } from "../../../components/core-util";

const NO = "You do not have permission to manage warehouses.";
const TYPES = ["bin", "zone", "receiving", "quarantine", "dispatch", "shop_floor"];

export async function addWarehouse(fd: FormData) {
  const c = await ctx();
  if (!c.can("warehouses.manage")) back("/warehouses", "error", NO);
  const code = field(fd, "code").toUpperCase();
  const name = field(fd, "name");
  const address = field(fd, "address") || null;
  if (!/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(code)) back("/warehouses", "error", "Use a short code of letters, numbers, dash or underscore (up to 20 characters).");
  if (name.length < 2 || name.length > 120) back("/warehouses", "error", "Enter a warehouse name.");
  const { error } = await c.sb.from("warehouses").insert({ organization_id: c.orgId, code, name, address });
  if (error) back("/warehouses", "error", error.code === "23505" ? "A warehouse with that code already exists." : friendly(error));
  back("/warehouses", "notice", "Warehouse added.");
}

export async function addLocation(fd: FormData) {
  const c = await ctx();
  if (!c.can("warehouses.manage")) back("/warehouses", "error", NO);
  const warehouse_id = field(fd, "warehouse_id");
  const code = field(fd, "code").toUpperCase();
  const name = field(fd, "name") || null;
  const location_type = field(fd, "location_type") || "bin";
  if (!isUuid(warehouse_id)) back("/warehouses", "error", "Choose a warehouse.");
  if (!/^[A-Z0-9][A-Z0-9._-]{0,29}$/.test(code)) back("/warehouses", "error", "Use a bin code of letters, numbers, dot, dash or underscore (up to 30 characters).");
  if (!TYPES.includes(location_type)) back("/warehouses", "error", "Choose a valid location type.");
  const { error } = await c.sb.from("locations").insert({ organization_id: c.orgId, warehouse_id, code, name, location_type });
  if (error) back("/warehouses", "error", error.code === "23505" ? "That bin code already exists in this warehouse." : friendly(error));
  back("/warehouses", "notice", "Location added.");
}

export async function setWarehouseActive(fd: FormData) {
  const c = await ctx();
  if (!c.can("warehouses.manage")) back("/warehouses", "error", NO);
  const id = field(fd, "id");
  if (!isUuid(id)) back("/warehouses", "error", "Warehouse not found.");
  const { error } = await c.sb.from("warehouses").update({ is_active: field(fd, "active") === "true" }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/warehouses", "error", friendly(error));
  back("/warehouses", "notice", "Warehouse updated.");
}

export async function setLocationActive(fd: FormData) {
  const c = await ctx();
  if (!c.can("warehouses.manage")) back("/warehouses", "error", NO);
  const id = field(fd, "id");
  if (!isUuid(id)) back("/warehouses", "error", "Location not found.");
  const { error } = await c.sb.from("locations").update({ is_active: field(fd, "active") === "true" }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/warehouses", "error", friendly(error));
  back("/warehouses", "notice", "Location updated.");
}
