import { validateUpload } from "@asotech/validation";
import { BUCKET } from "./constants";
import type { Row } from "./ctx";

export interface UploadedFile { name: string; size: number; type: string }

/** Returns the uploaded file from a form (or null when none was chosen). */
export function fileFrom(fd: FormData, key: string): UploadedFile | null {
  const v = fd.get(key) as unknown;
  if (v && typeof v === "object" && "size" in (v as object) && "name" in (v as object) && (v as UploadedFile).size > 0) return v as UploadedFile;
  return null;
}

export const safeName = (n: string): string => n.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 120) || "file";

/** Validates and uploads to the private client-documents bucket at `${orgId}/${folder}/${uuid}-${name}`. */
export async function uploadToBucket(sb: any, orgId: string, folder: string, file: UploadedFile): Promise<{ path: string } | { error: string }> {
  const v = validateUpload({ name: file.name, size: file.size, type: file.type });
  if (!v.ok) return { error: Object.values(v.errors)[0] ?? "That file is not allowed" };
  const path = `${orgId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file as unknown as Blob, { contentType: file.type, upsert: false });
  if (error) return { error: "The file could not be uploaded. Please try again." };
  return { path };
}

/** Short-lived download links for private files (5 minutes). */
export async function signedUrls(sb: any, paths: Array<string | null | undefined>): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(paths.filter((p): p is string => !!p).map(async (p) => {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(p, 300);
    if (data?.signedUrl) out.set(p, data.signedUrl as string);
  }));
  return out;
}
export type { Row };
