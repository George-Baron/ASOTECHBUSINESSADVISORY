"use server";
import { randomBytes } from "node:crypto";
import { createAdmin } from "@asotech/supabase/server";
import { sha256Hex } from "@asotech/business-logic/server";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid } from "../../../components/core-util";

const PROVIDERS = ["erp_system", "appsheet", "aso_tech_services", "paystack", "pos", "accounting", "hr"];
const NO = "Only owners and administrators can manage integrations.";

async function admin() {
  const c = await ctx();
  if (!c.can("integrations.manage")) back("/integrations", "error", NO);
  return c;
}

export async function saveConnection(fd: FormData) {
  const c = await admin();
  const provider = field(fd, "provider");
  const name = field(fd, "name");
  if (!PROVIDERS.includes(provider)) back("/integrations", "error", "Choose a provider.");
  if (name.length < 2 || name.length > 120) back("/integrations", "error", "Enter a name for this connection.");
  // Non-secret settings only. Secrets are never stored in this field.
  const baseUrl = field(fd, "base_url");
  if (baseUrl && !/^https:\/\/[^\s]+$/i.test(baseUrl)) back("/integrations", "error", "The base URL must start with https://");
  const config = { ...(baseUrl ? { base_url: baseUrl } : {}), ...(field(fd, "notes") ? { notes: field(fd, "notes").slice(0, 500) } : {}) };
  const { error } = await c.sb.from("integration_connections").insert({ organization_id: c.orgId, provider, name, status: "draft", config });
  if (error) back("/integrations", "error", friendly(error));
  back("/integrations", "notice", "Connection saved as a draft. It is not active until it has been set up and verified.");
}

export interface KeyState { error?: string; key?: string; connectionId?: string }

/** Generates a new AppSheet API key. The raw key is returned once; only its SHA-256 hash is stored. */
export async function generateAppSheetKey(_prev: KeyState, fd: FormData): Promise<KeyState> {
  const c = await ctx();
  if (!c.can("integrations.manage")) return { error: NO };
  const id = field(fd, "id");
  if (!isUuid(id)) return { error: "Connection not found." };
  const { data: conn } = await c.sb.from("integration_connections").select("id, provider, status, config").eq("id", id).eq("organization_id", c.orgId).maybeSingle();
  if (!conn || conn.provider !== "appsheet") return { error: "Only AppSheet connections use API keys." };
  const key = `asot_${randomBytes(32).toString("hex")}`;
  const config = { ...(conn.config ?? {}), api_key_hash: sha256Hex(key), api_key_created_at: new Date().toISOString() };
  // A regenerated key must be proven again: back to "configured".
  const { error } = await c.sb.from("integration_connections").update({ config, status: "configured" }).eq("id", id).eq("organization_id", c.orgId);
  if (error) return { error: friendly(error) };
  return { key, connectionId: id };
}

/** Marks an AppSheet connection verified, only after a successful test event has been received. */
export async function markVerified(fd: FormData) {
  const c = await admin();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/integrations", "error", "Connection not found.");
  const { data: conn } = await c.sb.from("integration_connections").select("id, provider, status").eq("id", id).eq("organization_id", c.orgId).maybeSingle();
  if (!conn || conn.provider !== "appsheet") back("/integrations", "error", "Only AppSheet connections can be verified here. Other providers need a developer-built adapter.");
  const { count } = await c.sb.from("integration_events").select("id", { count: "exact", head: true }).eq("organization_id", c.orgId).eq("connection_id", id).eq("event_type", "test.ping").eq("status", "processed");
  if (!count) back("/integrations", "error", "No successful test event yet. Send a test request from AppSheet first (see the instructions on this page).");
  // RLS does not let clients set "verified"; the server does it after the evidence check above.
  const { error } = await createAdmin().from("integration_connections").update({ status: "verified", last_verified_at: new Date().toISOString() }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/integrations", "error", "Could not mark the connection verified.");
  back("/integrations", "notice", "Connection verified. Live counts are now accepted.");
}

export async function disableConnection(fd: FormData) {
  const c = await admin();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/integrations", "error", "Connection not found.");
  const { error } = await c.sb.from("integration_connections").update({ status: "disabled" }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/integrations", "error", friendly(error));
  back("/integrations", "notice", "Connection disabled.");
}
