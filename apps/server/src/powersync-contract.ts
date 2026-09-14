import { MAX_UPLOAD_BYTES, uploadPayloadSchema, type UploadPayload } from "@callus/db";

export { MAX_UPLOAD_BYTES, uploadOperationSchema, uploadPayloadSchema } from "@callus/db";
export type { UploadOperation, UploadPayload } from "@callus/db";

export type ParsedUploadPayload = { ok: true; data: UploadPayload } | { ok: false; error: string };

export function parseUploadPayload(rawBody: string): ParsedUploadPayload {
  if (new TextEncoder().encode(rawBody).byteLength > MAX_UPLOAD_BYTES)
    return { ok: false, error: "Payload too large" };

  let parsed: ReturnType<typeof uploadPayloadSchema.safeParse>;
  try {
    parsed = uploadPayloadSchema.safeParse(JSON.parse(rawBody));
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (!parsed.success) return { ok: false, error: "Invalid upload payload" };
  return { ok: true, data: parsed.data };
}
