"use server";
import { staffCtx, back, field, friendly, isUuid, oneOf } from "../../../lib/ctx";
import { REQUEST_STATUSES } from "../../../lib/constants";
import { REQUEST_KINDS, isRequestKind } from "../../../lib/data";

export async function setRequestStatus(fd: FormData) {
  const { sb } = await staffCtx();
  const kind = field(fd, "kind");
  const id = field(fd, "id");
  if (!isRequestKind(kind) || !isUuid(id)) back("/requests", "error", "Request not found.");
  const status = oneOf(field(fd, "status"), REQUEST_STATUSES, "new");
  const { error } = await sb.from(REQUEST_KINDS[kind as keyof typeof REQUEST_KINDS].table).update({ status }).eq("id", id);
  if (error) back(`/requests/${kind}/${id}`, "error", friendly(error));
  back(`/requests/${kind}/${id}`, "notice", "Status updated.");
}
