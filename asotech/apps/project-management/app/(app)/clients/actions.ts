"use server";
import { staffCtx, back, field, friendly, isUuid, oneOf } from "../../../lib/ctx";
import { MEMBER_ROLES, TICKET_STATUSES } from "../../../lib/constants";
import { slugify } from "@asotech/utilities";

export async function createClient(fd: FormData) {
  const { sb } = await staffCtx();
  const name = field(fd, "name");
  if (name.length < 2) back("/clients", "error", "Enter the client organisation name.");
  const slug = slugify(field(fd, "slug") || name);
  if (!slug) back("/clients", "error", "Enter a valid short name (letters and numbers).");
  const { data, error } = await sb.rpc("staff_create_client_org", { p_name: name, p_slug: slug });
  if (error || !data) back("/clients", "error", friendly(error));
  back(`/clients/${data}`, "notice", "Client organisation created. Add the client's users below.");
}

export async function addMember(fd: FormData) {
  const { sb } = await staffCtx();
  const org = field(fd, "org");
  if (!isUuid(org)) back("/clients", "error", "Client not found.");
  const email = field(fd, "email").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back(`/clients/${org}`, "error", "Enter a valid email address.");
  const role = oneOf(field(fd, "role"), MEMBER_ROLES, "client");
  const { error } = await sb.rpc("staff_add_client_member", { p_org: org, p_email: email, p_role: role });
  if (error) back(`/clients/${org}`, "error", friendly(error));
  back(`/clients/${org}`, "notice", "Member added.");
}

export async function setTicketStatus(fd: FormData) {
  const { sb } = await staffCtx();
  const org = field(fd, "org");
  const id = field(fd, "id");
  if (!isUuid(org) || !isUuid(id)) back("/clients", "error", "Ticket not found.");
  const status = oneOf(field(fd, "status"), TICKET_STATUSES, "open");
  const { error } = await sb.from("support_tickets").update({ status }).eq("id", id).eq("organization_id", org);
  if (error) back(`/clients/${org}`, "error", friendly(error));
  back(`/clients/${org}`, "notice", "Ticket updated.");
}
