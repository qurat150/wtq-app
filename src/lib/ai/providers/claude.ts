import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { requireKey } from "@/lib/env";
import { BusyError } from "../retry";
import type { Provider } from "../types";

let client: Anthropic | undefined;

function getClient() {
  // maxRetries: 0 because OUR retry.ts handles retries + model fallback.
  // (The SDK retries twice by default; leaving that on would multiply waits.)
  client ??= new Anthropic({ apiKey: requireKey("ANTHROPIC_API_KEY"), maxRetries: 0 });
  return client;
}

// Use the SDK's typed error classes, not string matching.
// 429 = rate limited, 503 = unavailable, 529 = overloaded.
function isBusy(error: unknown) {
  if (error instanceof Anthropic.RateLimitError) return true;
  return error instanceof Anthropic.APIError && (error.status === 503 || error.status === 529);
}

export const claude: Provider = {
  name: "claude",
  models: ["claude-opus-5-5"],

  async call({ model, system, input, jsonSchema }) {
    try {
      // .beta because the refusal-fallback feature is a beta API.
      const response = await getClient().beta.messages.create({
        model,
        max_tokens: 16000, // generous ceiling; too low cuts the JSON off mid-way
        system,
        messages: [{ role: "user", content: input }],
        output_config: {
          effort: "low", // simple JSON task: fast + cheap. Raise to "medium" for better quality.
          // Structured output: Claude's reply MUST match this JSON Schema.
          format: { type: "json_schema", schema: jsonSchema },
        },
        // If the safety filter declines, the API retries on a fallback model in the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

      // Always check why it stopped BEFORE reading the content.
      if (response.stop_reason === "refusal") {
        throw new Error("The AI declined this request. Try rephrasing it.");
      }

      // content is an array of blocks (text, thinking, ...). Keep only the text.
      return response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
    } catch (error) {
      if (isBusy(error)) throw new BusyError();
      throw error;
    }
  },
};
