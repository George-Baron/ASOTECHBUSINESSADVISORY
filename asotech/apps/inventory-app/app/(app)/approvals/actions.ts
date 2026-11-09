"use server";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid } from "../../../components/core-util";

export async function decide(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/approvals", "error", "Request not found.");
  const approve = field(fd, "decision") === "approve";
  const note = field(fd, "note");
  if (!approve && note.length < 3) back("/approvals", "error", "Enter a note explaining the rejection.");
  const { error } = await c.sb.rpc("decide_approval", { p_org: c.orgId, p_request: id, p_approve: approve, p_note: note || null });
  if (error) back("/approvals", "error", friendly(error));
  back("/approvals", "notice", approve ? "Approved. The adjustment was posted to the ledger." : "Rejected. The count is back in review.");
}
