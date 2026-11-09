"use server";
import { ctx, back, friendly } from "../../../lib/ctx";

export async function refreshExpiry() {
  const c = await ctx();
  if (!c.can("movements.post")) back("/expiry", "error", "You do not have permission to refresh expiry records.");
  const { data, error } = await c.sb.rpc("refresh_expiry_records", { p_org: c.orgId, p_warning_days: 90 });
  if (error) back("/expiry", "error", friendly(error));
  back("/expiry", "notice", `Expiry records refreshed (${data} batch locations checked).`);
}
