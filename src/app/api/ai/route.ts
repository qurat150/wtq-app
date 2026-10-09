// route.ts = an API endpoint (no UI). Lives at src/app/api/ai/ -> handles /api/ai.
// Always runs on the server, so API keys are safe here.
import { GenerateRequestSchema } from "@/features/generator";
import { generate } from "@/features/generator/server/generate";
import { aiErrorResponse } from "@/lib/ai";

// Max seconds this function may run on Vercel (time for retries + model fallback).
export const maxDuration = 60;

// Function name = HTTP method. `request` is the standard web Request object.
export async function POST(request: Request) {
  // Invalid JSON body -> null instead of a crash; zod then rejects it below.
  const body = await request.json().catch(() => null);

  // Validate the request: never trust what the client sends.
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      // Send back the first zod message, e.g. "Please describe the role first."
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }, // 400 = the client's fault
    );
  }

  try {
    // parsed.data.input is trimmed and typed as string.
    return Response.json(await generate(parsed.data.input));
  } catch (error) {
    return aiErrorResponse(error); // 503 if busy, 500 otherwise
  }
}
