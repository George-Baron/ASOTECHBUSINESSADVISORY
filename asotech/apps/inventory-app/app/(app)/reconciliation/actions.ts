"use server";
import { redirect } from "next/navigation";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid } from "../../../components/core-util";

const REASONS = ["miscount", "damage", "theft", "expiry", "receiving_error", "issue_error", "unrecorded_transfer", "data_error", "other"];
const ACTIONS = ["adjust", "investigate", "ignore"];

/** Saves reason code, explanation and action for every variance line on the form (fields r_/e_/a_<lineId>). */
export async function saveReconciliation(fd: FormData) {
  const c = await ctx();
  const rid = field(fd, "reconciliation_id");
  const here = `/reconciliation/${rid}`;
  if (!isUuid(rid)) back("/reconciliation", "error", "Reconciliation not found.");
  if (!c.can("reconciliation.prepare")) back(here, "error", "You do not have permission to edit this reconciliation.");
  const ids = new Set<string>();
  for (const k of fd.keys()) if (k.startsWith("a_")) ids.add(k.slice(2));
  let n = 0;
  for (const lineId of ids) {
    if (!isUuid(lineId)) continue;
    const action = field(fd, `a_${lineId}`);
    const reason = field(fd, `r_${lineId}`);
    const explanation = field(fd, `e_${lineId}`).slice(0, 500);
    if (!ACTIONS.includes(action)) back(here, "error", "Choose an action for every variance line.");
    if (reason && !REASONS.includes(reason)) back(here, "error", "Choose a valid reason code.");
    const { error } = await c.sb.from("reconciliation_lines").update({ action, reason_code: reason || null, explanation: explanation || null }).eq("id", lineId).eq("reconciliation_id", rid).eq("organization_id", c.orgId);
    if (error) back(here, "error", friendly(error));
    n++;
  }
  back(here, "notice", `Saved ${n} line(s).`);
}

export async function submitReconciliation(fd: FormData) {
  const c = await ctx();
  const rid = field(fd, "reconciliation_id");
  if (!isUuid(rid)) back("/reconciliation", "error", "Reconciliation not found.");
  const { data, error } = await c.sb.rpc("submit_reconciliation", { p_org: c.orgId, p_reconciliation: rid });
  if (error) back(`/reconciliation/${rid}`, "error", friendly(error));
  if (!data) back(`/reconciliation/${rid}`, "notice", "No adjustments were needed. The count is closed.");
  redirect(`/approvals?notice=${encodeURIComponent("Submitted. An administrator other than you must approve the adjustment before stock changes.")}`);
}
