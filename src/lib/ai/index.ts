import "server-only";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { mockResponse } from "./mock";
import { claude } from "./providers/claude";
import { gemini } from "./providers/gemini";
import { BusyError, withRetry } from "./retry";
import type { Provider } from "./types";

// Lookup table: AI_PROVIDER value -> provider object. Adding a provider = one line here.
const providers: Record<"gemini" | "claude", Provider> = { gemini, claude };

const JSON_REMINDER =
  "IMPORTANT: Your previous reply was not valid. Return ONLY valid JSON matching the schema. No markdown, no extra text.";

export const BUSY_MESSAGE = "The AI is busy right now, please try again in a few seconds";

type GenerateJSONOptions<T> = {
  /** What the AI should do (the feature's SYSTEM_PROMPT). */
  system: string;
  /** What the user typed. */
  input: string;
  /** Zod schema the reply must match. z.ZodType<T> = "a schema that produces a T". */
  schema: z.ZodType<T>;
  /** Fake reply returned when AI_MOCK=true. */
  mock: T;
};

/**
 * Asks the configured AI for JSON and returns it validated and typed.
 * Generic <T>: the return type is inferred from the schema you pass in,
 * so the caller gets a fully typed result with no casting.
 */
export async function generateJSON<T>({
  system,
  input,
  schema,
  mock,
}: GenerateJSONOptions<T>): Promise<T> {
  const env = getEnv();
  if (env.AI_MOCK) return mockResponse(mock);

  const provider = providers[env.AI_PROVIDER];
  const jsonSchema = toJsonSchema(schema);
  // The schema goes in the prompt too, so the AI also sees the .describe() hints.
  const fullSystem = `${system}\n\nRespond with ONLY a JSON object that matches this JSON Schema:\n${JSON.stringify(jsonSchema)}`;

  // Up to 2 attempts: the second adds a stricter reminder.
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? fullSystem : `${fullSystem}\n\n${JSON_REMINDER}`;
    // withRetry handles busy errors (backoff + model fallback) for each attempt.
    const text = await withRetry(provider.models, (model) =>
      provider.call({ model, system: prompt, input, jsonSchema })
    );

    // Parse the text, then validate the shape. Both must pass.
    const result = schema.safeParse(parseJSON(text));
    if (result.success) return result.data; // typed as T
    console.warn(`[ai] ${provider.name} reply failed validation:`, z.prettifyError(result.error));
  }

  throw new Error("The AI returned data in an unexpected format. Please try again.");
}

/** Turns any error into a friendly JSON Response for an API route. */
export function aiErrorResponse(error: unknown): Response {
  if (error instanceof BusyError) {
    // 503 = Service Unavailable: tells the client "temporary, try again".
    return Response.json({ error: BUSY_MESSAGE }, { status: 503 });
  }
  // Full error goes to the SERVER log (terminal / Vercel logs), never to the user.
  console.error("[ai] request failed:", error);
  // Show the real message locally (helps debugging); hide details in production.
  const message =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
  return Response.json({ error: message }, { status: 500 });
}

// JSON.parse throws on invalid text; return undefined instead so
// safeParse fails cleanly and triggers the retry above.
function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Spread into a new object so we can delete a key without touching zod's result.
  const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(schema) };
  delete jsonSchema.$schema; // "$schema" metadata URL; the AI APIs don't need it
  return jsonSchema;
}
