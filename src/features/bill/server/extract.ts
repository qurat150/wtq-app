import "server-only";
import { generateJSON, type AIFile } from "@/lib/ai";
import { EXTRACTION_INPUT, EXTRACTION_PROMPT } from "../prompts";
import { SAMPLE_EXTRACTION } from "../sample";
import { BillExtractionSchema, type BillExtraction } from "../schema";

/** Level 1 step: the AI transcribes the bill image into structured JSON.
 *  Code (calc.ts) then turns it into the exact scored format. */
export async function extractBill(file: AIFile, note?: string): Promise<BillExtraction> {
  return generateJSON({
    system: EXTRACTION_PROMPT,
    // `note` is used for a second, more careful reading when the totals don't add up.
    input: note ? `${EXTRACTION_INPUT}\n\n${note}` : EXTRACTION_INPUT,
    files: [file],
    schema: BillExtractionSchema,
    mock: SAMPLE_EXTRACTION,
    timeoutMs: 120_000, // the free tier can be slow under load
  });
}
