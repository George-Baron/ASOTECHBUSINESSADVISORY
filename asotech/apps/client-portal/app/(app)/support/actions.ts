"use server";
import { validateUpload } from "@asotech/validation";
import { back, ctx, field, friendly } from "../../../lib/ctx";

export async function createTicket(fd: FormData) {
  const { sb, orgId } = await ctx();
  const subject = field(fd, "subject");
  const body = field(fd, "body");
  const priority = field(fd, "priority") || "normal";
  if (subject.length < 3 || subject.length > 200) back("/support", "error", "Subject must be 3 to 200 characters");
  if (body.length < 3 || body.length > 8000) back("/support", "error", "Describe your request (3 to 8000 characters)");
  if (!["low", "normal", "high", "urgent"].includes(priority)) back("/support", "error", "Choose a valid priority");
  const { error } = await sb.from("support_tickets").insert({ organization_id: orgId, subject, body, priority, status: "open" });
  if (error) back("/support", "error", friendly(error));
  back("/support", "notice", "Your request has been sent to ASOTECH support.");
}

export async function uploadDocument(fd: FormData) {
  const { sb, orgId, session } = await ctx();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) back("/support", "error", "Choose a file to upload");
  const f = file as File;
  const check = validateUpload({ name: f.name, size: f.size, type: f.type });
  if (!check.ok) back("/support", "error", Object.values(check.errors)[0] ?? "That file is not allowed");
  const safe = f.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
  const path = `${orgId}/${crypto.randomUUID()}-${safe}`;
  const up = await sb.storage.from("client-documents").upload(path, f, { contentType: f.type, upsert: false });
  if (up.error) back("/support", "error", "The file could not be uploaded. Please try again.");
  const { error } = await sb.from("client_documents").insert({
    organization_id: orgId, name: f.name.slice(0, 200), storage_path: path, mime_type: f.type, size_bytes: f.size, visibility: "client", uploaded_by: session.userId,
  });
  if (error) {
    await sb.storage.from("client-documents").remove([path]);
    back("/support", "error", friendly(error));
  }
  back("/support", "notice", "File uploaded.");
}
