import "server-only";
import { generateJSON } from "@/lib/ai";
import { SYSTEM_PROMPT } from "../prompt";
import { GeneratorResultSchema, MOCK_RESULT, type GeneratorResult } from "../schema";

// Runs only on the server (called from app/api/ai/route.ts).
export async function generate(input: string): Promise<GeneratorResult> {
  return generateJSON({
    system: SYSTEM_PROMPT,
    // Label the input so the AI knows what it is looking at.
    input: `Role description:\n${input}`,
    schema: GeneratorResultSchema, // T is inferred from this: GeneratorResult
    mock: MOCK_RESULT,
  });
}
