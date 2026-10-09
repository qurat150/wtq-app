// Makes the build FAIL if a client component ever imports this file
// (directly or indirectly). That's how keys can't leak into the browser.
import "server-only";
import { z } from "zod";

// The shape process.env must have. Everything in process.env is a string or missing.
const EnvSchema = z.object({
  // Only these two values allowed; defaults to "gemini" if missing.
  AI_PROVIDER: z.enum(["gemini", "claude"]).default("gemini"),
  // Env vars are strings, so convert "true" -> true, anything else -> false.
  AI_MOCK: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  // Optional here: you only need the key for the provider you actually use.
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

// TypeScript type generated FROM the schema. No duplicate interface to keep in sync.
// Hover over Env in VS Code: AI_MOCK is boolean, AI_PROVIDER is "gemini" | "claude".
export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

// Read lazily (when first called, not when the file is imported), so
// `npm run build` works on Vercel even before keys are configured.
export function getEnv(): Env {
  if (cached) return cached;
  // safeParse never throws: returns { success: true, data } or { success: false, error }.
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    // prettifyError (Zod v4) turns the issues into a readable multi-line message.
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  cached = result.data;
  return cached;
}

// Used by each provider: returns the key, or throws a message that tells you how to fix it.
export function requireKey(name: "GEMINI_API_KEY" | "ANTHROPIC_API_KEY"): string {
  const value = getEnv()[name];
  // "" (an empty line in .env.local) is falsy too, so it also counts as missing.
  if (!value) {
    throw new Error(
      `${name} is missing. Add it to .env.local (or Vercel env vars), or set AI_MOCK=true.`
    );
  }
  return value;
}
