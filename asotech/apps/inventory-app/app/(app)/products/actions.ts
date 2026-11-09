"use server";
import { redirect } from "next/navigation";
import { validateProduct } from "@asotech/validation";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid } from "../../../components/core-util";

const NO = "You do not have permission to manage products.";

export async function saveProduct(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  const here = id ? `/products/${id}` : "/products/new";
  if (!c.can("products.manage")) back(here, "error", NO);
  if (id && !isUuid(id)) back("/products", "error", "Product not found.");
  const raw = Object.fromEntries(Array.from(fd.entries()).filter(([, v]) => typeof v === "string"));
  const res = validateProduct(raw);
  if (!res.ok) back(here, "error", Object.values(res.errors).join(". "));
  const v = res.value;
  const catRaw = field(fd, "category_id");
  const category_id = isUuid(catRaw) ? catRaw : null;
  let uom_id: string | null = null;
  if (v.uom_code) {
    const { data } = await c.sb.from("units_of_measure").select("id").eq("organization_id", c.orgId).eq("code", v.uom_code).maybeSingle();
    if (!data) back(here, "error", `Unit of measure "${v.uom_code}" does not exist.`);
    uom_id = data.id as string;
  }
  const fields = { sku: v.sku, name: v.name, description: v.description, category_id, uom_id, track_batches: v.track_batches, track_expiry: v.track_expiry, reorder_level: v.reorder_level, cost_price: v.cost_price, sale_price: v.sale_price };
  if (id) {
    const { error } = await c.sb.from("products").update(fields).eq("id", id).eq("organization_id", c.orgId);
    if (error) back(here, "error", error.code === "23505" ? "A product with that SKU already exists." : friendly(error));
    back(here, "notice", "Product saved.");
  }
  const { data, error } = await c.sb.from("products").insert({ organization_id: c.orgId, ...fields }).select("id").single();
  if (error) back(here, "error", error.code === "23505" ? "A product with that SKU already exists." : friendly(error));
  if (v.barcode) {
    const { error: be } = await c.sb.from("product_barcodes").insert({ organization_id: c.orgId, product_id: data.id, barcode: v.barcode, is_primary: true });
    if (be) redirect(`/products/${data.id}?error=${encodeURIComponent(be.code === "23505" ? "Product created, but that barcode is already used by another product." : "Product created, but the barcode could not be saved.")}`);
  }
  redirect(`/products/${data.id}?notice=${encodeURIComponent("Product created.")}`);
}

export async function setProductActive(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/products", "error", "Product not found.");
  if (!c.can("products.manage")) back(`/products/${id}`, "error", NO);
  const active = field(fd, "active") === "true";
  const { error } = await c.sb.from("products").update({ is_active: active }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back(`/products/${id}`, "error", friendly(error));
  back(`/products/${id}`, "notice", active ? "Product reactivated." : "Product deactivated.");
}

export async function addBarcode(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "product_id");
  const barcode = field(fd, "barcode");
  if (!isUuid(id)) back("/products", "error", "Product not found.");
  if (!c.can("products.manage")) back(`/products/${id}`, "error", NO);
  if (barcode.length < 3 || barcode.length > 64) back(`/products/${id}`, "error", "A barcode must be 3 to 64 characters.");
  const { count } = await c.sb.from("product_barcodes").select("id", { count: "exact", head: true }).eq("organization_id", c.orgId).eq("product_id", id);
  const { error } = await c.sb.from("product_barcodes").insert({ organization_id: c.orgId, product_id: id, barcode, is_primary: !count });
  if (error) back(`/products/${id}`, "error", error.code === "23505" ? "That barcode is already assigned to a product." : friendly(error));
  back(`/products/${id}`, "notice", "Barcode added.");
}

export async function removeBarcode(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "product_id");
  const bid = field(fd, "id");
  if (!isUuid(id) || !isUuid(bid)) back("/products", "error", "Barcode not found.");
  const { error } = await c.sb.from("product_barcodes").delete().eq("id", bid).eq("organization_id", c.orgId);
  if (error) back(`/products/${id}`, "error", friendly(error));
  back(`/products/${id}`, "notice", "Barcode removed.");
}

export async function addCategory(fd: FormData) {
  const c = await ctx();
  if (!c.can("products.manage")) back("/products/categories", "error", NO);
  const name = field(fd, "name");
  const parent = field(fd, "parent_id");
  if (name.length < 1 || name.length > 120) back("/products/categories", "error", "Enter a category name.");
  const { error } = await c.sb.from("product_categories").insert({ organization_id: c.orgId, name, parent_id: isUuid(parent) ? parent : null });
  if (error) back("/products/categories", "error", error.code === "23505" ? "That category already exists." : friendly(error));
  back("/products/categories", "notice", "Category added.");
}

export async function deleteCategory(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/products/categories", "error", "Category not found.");
  const { error } = await c.sb.from("product_categories").delete().eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/products/categories", "error", friendly(error));
  back("/products/categories", "notice", "Category deleted. Its products are now uncategorised.");
}

export async function addUom(fd: FormData) {
  const c = await ctx();
  if (!c.can("products.manage")) back("/products/categories", "error", NO);
  const code = field(fd, "code").toUpperCase();
  const name = field(fd, "name");
  if (code.length < 1 || code.length > 20 || name.length < 1) back("/products/categories", "error", "Enter a unit code (up to 20 characters) and a name.");
  const { error } = await c.sb.from("units_of_measure").insert({ organization_id: c.orgId, code, name });
  if (error) back("/products/categories", "error", error.code === "23505" ? "That unit code already exists." : friendly(error));
  back("/products/categories", "notice", "Unit added.");
}

export async function deleteUom(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/products/categories", "error", "Unit not found.");
  const { error } = await c.sb.from("units_of_measure").delete().eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/products/categories", "error", friendly(error));
  back("/products/categories", "notice", "Unit deleted.");
}
