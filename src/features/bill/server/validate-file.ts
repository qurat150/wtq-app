import "server-only";
import { UserFacingError, type AIFile } from "@/lib/ai";
import { ACCEPTED_TYPES, MAX_FILE_BYTES } from "../schema";

// First bytes of each accepted format. We check the bytes, not just the
// browser-supplied type, so a renamed file can't slip through.
const SIGNATURES: Record<(typeof ACCEPTED_TYPES)[number], number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
};

/** Validates an uploaded bill and returns it as base64, in memory only (never written to disk). */
export async function readBillUpload(value: FormDataEntryValue | null): Promise<AIFile> {
  if (!(value instanceof File) || value.size === 0) {
    throw new UserFacingError("Please choose a bill image to upload.", 400);
  }
  if (value.size > MAX_FILE_BYTES) {
    throw new UserFacingError("This file is larger than 4 MB. Please upload a smaller photo or screenshot.", 413);
  }
  const bytes = new Uint8Array(await value.arrayBuffer());
  const type = ACCEPTED_TYPES.find((t) => SIGNATURES[t].every((b, i) => bytes[i] === b));
  if (!type) {
    throw new UserFacingError("Only JPG and PNG bill images are supported.", 415);
  }
  return { mimeType: type, data: Buffer.from(bytes).toString("base64") };
}
