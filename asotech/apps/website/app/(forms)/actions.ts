"use server";
import { redirect } from "next/navigation";
import { createServer } from "@asotech/supabase/server";
import { isSupabaseConfigured } from "@asotech/supabase";
import { CONTACT } from "@asotech/configuration";
import { validateConsultation, validateContact, validateProposal, looksLikeBot, type Result } from "@asotech/validation";

const ALLOWED_RETURN = ["/", "/consultation", "/proposal", "/contact"];

function raw(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  fd.forEach((v, k) => { if (typeof v === "string") o[k] = v; });
  return o;
}

function returnPath(fd: FormData): string {
  const r = fd.get("return_to");
  return typeof r === "string" && ALLOWED_RETURN.includes(r) ? r : "/contact";
}

function go(path: string, kind: "sent" | "error", message?: string): never {
  const [p, hash] = [path, path === "/" ? "#consultation" : ""];
  const q = kind === "sent" ? "sent=1" : `error=${encodeURIComponent(message ?? "Something went wrong")}`;
  redirect(`${p}?${q}${hash}`);
  throw new Error("unreachable");
}

const unavailable = `Online requests are not available right now. Please email ${CONTACT.email} or call ${CONTACT.phone}.`;

function firstErrors(r: Extract<Result<unknown>, { ok: false }>): string {
  return Object.values(r.errors).slice(0, 3).join(". ");
}

async function serviceId(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  const sb = await createServer();
  const { data } = await sb.from("service_catalogue").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

async function submit(table: "consultation_requests" | "proposal_requests" | "contact_messages", row: Record<string, unknown>): Promise<boolean> {
  const sb = await createServer();
  // Plain insert: anonymous visitors have INSERT but no SELECT, so RETURNING must not be requested.
  const { error } = await sb.from(table).insert(row);
  return !error;
}

export async function submitConsultation(fd: FormData) {
  const back = returnPath(fd);
  if (looksLikeBot(raw(fd))) go(back, "sent"); // silently accept bots without storing
  if (!isSupabaseConfigured()) go(back, "error", unavailable);
  const r = validateConsultation(raw(fd));
  if (!r.ok) go(back, "error", firstErrors(r));
  const { service_slug, ...v } = r.value;
  const ok = await submit("consultation_requests", { ...v, service_id: await serviceId(service_slug) });
  if (!ok) go(back, "error", `We could not save your request. Please email ${CONTACT.email}.`);
  go(back, "sent");
}

export async function submitProposal(fd: FormData) {
  const back = returnPath(fd);
  if (looksLikeBot(raw(fd))) go(back, "sent");
  if (!isSupabaseConfigured()) go(back, "error", unavailable);
  const r = validateProposal(raw(fd));
  if (!r.ok) go(back, "error", firstErrors(r));
  const { service_slug, ...v } = r.value;
  const ok = await submit("proposal_requests", { ...v, service_id: await serviceId(service_slug) });
  if (!ok) go(back, "error", `We could not save your request. Please email ${CONTACT.email}.`);
  go(back, "sent");
}

export async function submitContact(fd: FormData) {
  const back = returnPath(fd);
  if (looksLikeBot(raw(fd))) go(back, "sent");
  if (!isSupabaseConfigured()) go(back, "error", unavailable);
  const r = validateContact(raw(fd));
  if (!r.ok) go(back, "error", firstErrors(r));
  const ok = await submit("contact_messages", { ...r.value });
  if (!ok) go(back, "error", `We could not send your message. Please email ${CONTACT.email}.`);
  go(back, "sent");
}
