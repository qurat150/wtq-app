import "server-only";
import { generateJSON } from "@/lib/ai";
import { SYSTEM_PROMPT } from "../prompt";
import {
  GeneratorResultSchema,
  MOCK_RESULT,
  type GeneratorResult,
} from "../schema";

// Runs only on the server (called from app/api/ai/route.ts).
export async function generate(input: string): Promise<GeneratorResult> {
  return generateJSON({
    system: SYSTEM_PROMPT,
    // Label the input so the AI knows what it is looking at.
    // Delimit user text so the AI treats it as data, not instructions.
    input: `<role_description>\n${input}\n</role_description>`,
    schema: GeneratorResultSchema, // T is inferred from this: GeneratorResult
    mock: MOCK_RESULT,
  });
}
