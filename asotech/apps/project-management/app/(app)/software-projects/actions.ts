"use server";
import { staffCtx, back, field, friendly, isUuid, optUuid, dateField, numField, oneOf } from "../../../lib/ctx";
import { PROJECT_STATUSES, STAGES, REQ_PRIORITIES, REQ_STATUSES, MILESTONE_STAFF_STATUSES, DELIVERABLE_KINDS, DELIVERABLE_STAFF_STATUSES, TASK_STATUSES } from "../../../lib/constants";
import { fileFrom, uploadToBucket } from "../../../lib/storage";

const L = "/software-projects";

/** Common guard: project id + organisation id from hidden fields (composite FKs reject mismatches in the DB). */
function ids(fd: FormData): { project: string; org: string } {
  const project = field(fd, "project_id");
  const org = field(fd, "organization_id");
  if (!isUuid(project) || !isUuid(org)) back(L, "error", "Project not found.");
  return { project, org };
}

export async function createSoftware(fd: FormData) {
  const { sb, session } = await staffCtx();
  const org = field(fd, "organization_id");
  const name = field(fd, "name");
  if (!isUuid(org)) back(L, "error", "Choose a client.");
  if (name.length < 3) back(L, "error", "Enter a project name (3+ characters).");
  const { data, error } = await sb.from("software_projects").insert({
    organization_id: org, name, description: field(fd, "description") || null, stage: oneOf(field(fd, "stage"), STAGES, "discovery"),
    status: oneOf(field(fd, "status"), PROJECT_STATUSES, "planned"), project_manager: session.userId,
    starts_on: dateField(fd, "starts_on"), target_date: dateField(fd, "target_date"),
  }).select("id").single();
  if (error || !data) back(L, "error", friendly(error));
  back(`${L}/${data.id}`, "notice", "Software project created.");
}

export async function updateSoftware(fd: FormData) {
  const { sb } = await staffCtx();
  const { project } = ids(fd);
  const { error } = await sb.from("software_projects").update({
    stage: oneOf(field(fd, "stage"), STAGES, "discovery"), status: oneOf(field(fd, "status"), PROJECT_STATUSES, "planned"),
    description: field(fd, "description") || null, target_date: dateField(fd, "target_date"),
  }).eq("id", project);
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Project updated.");
}

export async function addRequirement(fd: FormData) {
  const { sb } = await staffCtx();
  const { project, org } = ids(fd);
  const title = field(fd, "title");
  if (title.length < 3) back(`${L}/${project}`, "error", "Enter a requirement title.");
  const { error } = await sb.from("project_requirements").insert({ organization_id: org, software_project_id: project, title, description: field(fd, "description") || null, priority: oneOf(field(fd, "priority"), REQ_PRIORITIES, "medium") });
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Requirement added.");
}

export async function setRequirementStatus(fd: FormData) {
  const { sb } = await staffCtx();
  const { project } = ids(fd);
  const id = field(fd, "id");
  if (!isUuid(id)) back(`${L}/${project}`, "error", "Requirement not found.");
  const { error } = await sb.from("project_requirements").update({ status: oneOf(field(fd, "status"), REQ_STATUSES, "proposed") }).eq("id", id);
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Requirement updated.");
}

export async function addMilestone(fd: FormData) {
  const { sb } = await staffCtx();
  const { project, org } = ids(fd);
  const title = field(fd, "title");
  if (title.length < 3) back(`${L}/${project}`, "error", "Enter a milestone title.");
  const { error } = await sb.from("project_milestones").insert({ organization_id: org, software_project_id: project, title, due_date: dateField(fd, "due_date") });
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Milestone added.");
}

export async function setMilestoneStatus(fd: FormData) {
  const { sb } = await staffCtx();
  const { project } = ids(fd);
  const id = field(fd, "id");
  if (!isUuid(id)) back(`${L}/${project}`, "error", "Milestone not found.");
  // 'approved' is a client decision (client_decide); staff cannot set or undo it from here.
  const { data: cur } = await sb.from("project_milestones").select("status").eq("id", id).maybeSingle();
  if (cur?.status === "approved") back(`${L}/${project}`, "error", "The client has approved this milestone; it can no longer be changed.");
  const { error } = await sb.from("project_milestones").update({ status: oneOf(field(fd, "status"), MILESTONE_STAFF_STATUSES, "pending") }).eq("id", id);
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Milestone updated.");
}

export async function addDeliverable(fd: FormData) {
  const { sb } = await staffCtx();
  const { project, org } = ids(fd);
  const title = field(fd, "title");
  if (title.length < 3) back(`${L}/${project}`, "error", "Enter a deliverable title.");
  let path: string | null = null;
  const f = fileFrom(fd, "file");
  if (f) {
    const up = await uploadToBucket(sb, org, `deliverables/${project}`, f);
    if ("error" in up) back(`${L}/${project}`, "error", up.error);
    path = up.path;
  }
  const { error } = await sb.from("project_deliverables").insert({
    organization_id: org, software_project_id: project, milestone_id: optUuid(fd, "milestone_id"), title,
    kind: oneOf(field(fd, "kind"), DELIVERABLE_KINDS, "document"), storage_path: path,
  });
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Deliverable added (not yet visible to the client).");
}

/** Publish for client review = is_published + status in_review. Unpublish resets to pending unless the client already decided. */
export async function setDeliverable(fd: FormData) {
  const { sb } = await staffCtx();
  const { project } = ids(fd);
  const id = field(fd, "id");
  if (!isUuid(id)) back(`${L}/${project}`, "error", "Deliverable not found.");
  const { data: cur } = await sb.from("project_deliverables").select("status, storage_path").eq("id", id).maybeSingle();
  if (!cur) back(`${L}/${project}`, "error", "Deliverable not found.");
  if (cur.status === "approved") back(`${L}/${project}`, "error", "The client has approved this deliverable; it is locked.");
  const publish = field(fd, "publish") === "1";
  if (publish && !cur.storage_path) back(`${L}/${project}`, "error", "Attach a file before sending for client review.");
  const status = publish ? oneOf("in_review", DELIVERABLE_STAFF_STATUSES, "in_review") : "pending";
  const { error } = await sb.from("project_deliverables").update({ is_published: publish, status }).eq("id", id);
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", publish ? "Sent to the client for review." : "Withdrawn from the client.");
}

export async function addTask(fd: FormData) {
  const { sb } = await staffCtx();
  const { project, org } = ids(fd);
  const title = field(fd, "title");
  if (title.length < 3) back(`${L}/${project}`, "error", "Enter a task title.");
  const est = numField(fd, "estimate_hours");
  if (est !== null && (Number.isNaN(est) || est < 0)) back(`${L}/${project}`, "error", "Estimate must be a positive number of hours.");
  const { error } = await sb.from("project_tasks").insert({
    organization_id: org, software_project_id: project, milestone_id: optUuid(fd, "milestone_id"), title,
    stage: oneOf(field(fd, "stage"), STAGES, "development"), assignee: optUuid(fd, "assignee"), estimate_hours: est, due_date: dateField(fd, "due_date"),
  });
  if (error) back(`${L}/${project}`, "error", friendly(error));
  back(`${L}/${project}`, "notice", "Task added.");
}

export async function moveTask(fd: FormData) {
  const { sb } = await staffCtx();
  const id = field(fd, "id");
  const ret = field(fd, "return") || "/tasks";
  if (!isUuid(id)) back("/tasks", "error", "Task not found.");
  const { error } = await sb.from("project_tasks").update({ status: oneOf(field(fd, "status"), TASK_STATUSES, "todo") }).eq("id", id);
  if (error) back(ret, "error", friendly(error));
  back(ret, "notice", "Task moved.");
}
