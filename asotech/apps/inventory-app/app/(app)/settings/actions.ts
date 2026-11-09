"use server";
import { createAdmin } from "@asotech/supabase/server";
import type { OrgRole } from "@asotech/types";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid } from "../../../components/core-util";

const MANAGEABLE: OrgRole[] = ["owner", "admin", "manager", "stock_counter", "auditor", "viewer"];
/** Roles the current user may grant: owners any role, administrators only non-privileged ones. */
const grantable = (role: OrgRole): OrgRole[] => (role === "owner" ? MANAGEABLE : role === "admin" ? ["manager", "stock_counter", "auditor", "viewer"] : []);

export async function saveOrganisation(fd: FormData) {
  const c = await ctx();
  if (c.role !== "owner" && c.role !== "admin") back("/settings", "error", "Only owners and administrators can change organisation settings.");
  const name = field(fd, "name");
  const currency = field(fd, "currency").toUpperCase();
  if (name.length < 2 || name.length > 200) back("/settings", "error", "Enter the business name.");
  if (!/^[A-Z]{3}$/.test(currency)) back("/settings", "error", "Currency must be a 3-letter code such as NGN.");
  const { error } = await c.sb.from("organizations").update({ name, currency, allow_negative_stock: field(fd, "allow_negative_stock") === "on" }).eq("id", c.orgId);
  if (error) back("/settings", "error", friendly(error));
  back("/settings", "notice", "Settings saved.");
}

export async function changeRole(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  const role = field(fd, "role") as OrgRole;
  if (!isUuid(id) || !grantable(c.role).includes(role)) back("/settings", "error", "You cannot assign that role.");
  // RLS repeats these rules in the database; the last-owner trigger protects the organisation.
  const { error } = await c.sb.from("organization_members").update({ role }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/settings", "error", friendly(error));
  back("/settings", "notice", "Role updated.");
}

export async function setMemberActive(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/settings", "error", "Member not found.");
  const { error } = await c.sb.from("organization_members").update({ is_active: field(fd, "active") === "true" }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/settings", "error", friendly(error));
  back("/settings", "notice", "Member updated.");
}

/** Adds an already-registered user by email. Uses the service role, so authorisation is checked here first. */
export async function addMember(fd: FormData) {
  const c = await ctx();
  const email = field(fd, "email").toLowerCase();
  const role = field(fd, "role") as OrgRole;
  if (!c.can("members.manage")) back("/settings", "error", "You do not have permission to add members.");
  if (!grantable(c.role).includes(role)) back("/settings", "error", "You cannot assign that role.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back("/settings", "error", "Enter a valid email address.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) back("/settings", "error", "Adding members needs the server key (SUPABASE_SERVICE_ROLE_KEY) to be configured. Ask your administrator.");
  const admin = createAdmin();
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) back("/settings", "error", "Could not look up that user.");
    const hit = data.users.find((u: { id: string; email?: string }) => u.email?.toLowerCase() === email);
    if (hit) userId = hit.id;
    if (data.users.length < 200) break;
  }
  // Same message either way: do not reveal which emails have accounts.
  if (!userId) back("/settings", "error", "No registered user with that email. Ask them to create an account at the sign-in page first, then add them here.");
  const { error } = await admin.from("organization_members").upsert({ organization_id: c.orgId, user_id: userId, role, is_active: true }, { onConflict: "organization_id,user_id" });
  if (error) back("/settings", "error", "Could not add the member.");
  back("/settings", "notice", "Member added.");
}
