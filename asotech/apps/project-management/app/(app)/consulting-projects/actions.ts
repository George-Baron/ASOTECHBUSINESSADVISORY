"use server";
import { staffCtx, back, field, friendly, isUuid, optUuid, dateField, oneOf } from "../../../lib/ctx";
import { PROJECT_STATUSES, REPORT_TYPES, SEVERITIES, FINDING_STATUSES, ACTION_STATUSES } from "../../../lib/constants";
import { fileFrom, uploadToBucket } from "../../../lib/storage";

const L = "/consulting-projects";

export async function createConsulting(fd: FormData) {
  const { sb, session } = await staffCtx();
  const org = field(fd, "organization_id");
  const title = field(fd, "title");
  if (!isUuid(org)) back(L, "error", "Choose a client.");
  if (title.length < 3) back(L, "error", "Enter a project title (3+ characters).");
  const { data, error } = await sb.from("consulting_projects").insert({
    organization_id: org, title, summary: field(fd, "summary") || null, service_id: optUuid(fd, "service_id"),
    status: oneOf(field(fd, "status"), PROJECT_STATUSES, "planned"), lead_user_id: session.userId,
    starts_on: dateField(fd, "starts_on"), ends_on: dateField(fd, "ends_on"),
  }).select("id").single();
  if (error || !data) back(L, "error", friendly(error));
  back(`${L}/${data.id}`, "notice", "Consulting project created.");
}

export async function updateConsulting(fd: FormData) {
  const { sb } = await staffCtx();
  const id = field(fd, "id");
  if (!isUuid(id)) back(L, "error", "Project not found.");
  const { error } = await sb.from("consulting_projects").update({ status: oneOf(field(fd, "status"), PROJECT_STATUSES, "planned"), summary: field(fd, "summary") || null }).eq("id", id);
  if (error) back(`${L}/${id}`, "error", friendly(error));
  back(`${L}/${id}`, "notice", "Project updated.");
}

export async function addReport(fd: FormData) {
  const { sb, session } = await staffCtx();
  const id = field(fd, "project_id");
  const org = field(fd, "organization_id");
  if (!isUuid(id) || !isUuid(org)) back(L, "error", "Project not found.");
  const title = field(fd, "title");
  if (title.length < 3) back(`${L}/${id}`, "error", "Enter a report title.");
  let path: string | null = null;
  const f = fileFrom(fd, "file");
  if (f) {
    const up = await uploadToBucket(sb, org, `reports/${id}`, f);
    if ("error" in up) back(`${L}/${id}`, "error", up.error);
    path = up.path;
  }
  const publish = field(fd, "publish") === "on";
  const { error } = await sb.from("client_reports").insert({
    organization_id: org, consulting_project_id: id, title, storage_path: path, report_type: oneOf(field(fd, "report_type"), REPORT_TYPES, "general"),
    is_published: publish && !!path, published_at: publish && path ? new Date().toISOString() : null, created_by: session.userId,
  });
  if (error) back(`${L}/${id}`, "error", friendly(error));
  back(`${L}/${id}`, "notice", publish && !path ? "Report saved as a draft (a file is needed before it can be published)." : "Report saved.");
}

export async function toggleReport(fd: FormData) {
  const { sb } = await staffCtx();
  const id = field(fd, "id");
  const project = field(fd, "project_id");
  if (!isUuid(id) || !isUuid(project)) back(L, "error", "Report not found.");
  const publish = field(fd, "publish") === "1";
  const { data: r } = await sb.from("client_reports").select("storage_path").eq("id", id).maybeSingle();
  if (publish && !r?.storage_path) back(`${L}/${project}`, "error", "Upload a file before publishing.");
  const { error } = await sb.from("client_reports").update({ is_published: publish, published_at: publish ? new Date().toISOString() : null }).eq("id", id);
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", publish ? "Report published to the client." : "Report hidden from the client.");
}

export async function addFinding(fd: FormData) {
  const { sb } = await staffCtx();
  const id = field(fd, "project_id");
  const org = field(fd, "organization_id");
  if (!isUuid(id) || !isUuid(org)) back(L, "error", "Project not found.");
  const title = field(fd, "title");
  if (title.length < 3) back(`${L}/${id}`, "error", "Enter a finding title.");
  const { error } = await sb.from("audit_findings").insert({
    organization_id: org, consulting_project_id: id, title, description: field(fd, "description") || null,
    severity: oneOf(field(fd, "severity"), SEVERITIES, "medium"), is_published: field(fd, "publish") === "on",
  });
  if (error) back(`${L}/${id}`, "error", friendly(error));
  back(`${L}/${id}`, "notice", "Finding added.");
}

export async function updateFinding(fd: FormData) {
  const { sb } = await staffCtx();
  const id = field(fd, "id");
  const project = field(fd, "project_id");
  if (!isUuid(id) || !isUuid(project)) back(L, "error", "Finding not found.");
  const { error } = await sb.from("audit_findings").update({ status: oneOf(field(fd, "status"), FINDING_STATUSES, "open"), is_published: field(fd, "publish") === "on" }).eq("id", id);
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Finding updated.");
}

export async function addAction(fd: FormData) {
  const { sb } = await staffCtx();
  const project = field(fd, "project_id");
  const org = field(fd, "organization_id");
  const finding = field(fd, "finding_id");
  if (!isUuid(project) || !isUuid(org) || !isUuid(finding)) back(L, "error", "Finding not found.");
  const description = field(fd, "description");
  if (description.length < 3) back(`${L}/${project}`, "error", "Describe the corrective action.");
  const { error } = await sb.from("corrective_actions").insert({
    organization_id: org, finding_id: finding, description, owner_name: field(fd, "owner_name") || null,
    due_date: dateField(fd, "due_date"), is_published: field(fd, "publish") === "on",
  });
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Corrective action added.");
}

export async function updateAction(fd: FormData) {
  const { sb } = await staffCtx();
  const id = field(fd, "id");
  const project = field(fd, "project_id");
  if (!isUuid(id) || !isUuid(project)) back(L, "error", "Action not found.");
  const { error } = await sb.from("corrective_actions").update({ status: oneOf(field(fd, "status"), ACTION_STATUSES, "open"), is_published: field(fd, "publish") === "on" }).eq("id", id);
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Action updated.");
}
