// POST /api/bill/analyze — multipart form with a "file" field (JPG/PNG bill).
// Returns the AI's reading of the bill plus the code-computed Level 1 JSON and facts.
import { computeFacts } from "@/features/bill/calc";
import { extractBill } from "@/features/bill/server/extract";
import { readBillUpload } from "@/features/bill/server/validate-file";
import { aiErrorResponse } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => null);
    const file = await readBillUpload(form?.get("file") ?? null);
    const extraction = await extractBill(file);
    return Response.json({ extraction, facts: computeFacts(extraction) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
