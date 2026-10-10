import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { getEnv, requireKey } from "@/lib/env";
import { UserFacingError } from "../errors";
import { BusyError } from "../retry";
import type { AIFile, Provider } from "../types";

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

// Images and PDFs use different content block types in the Messages API.
function toBlock(file: AIFile): BetaContentBlockParam {
  if (file.mimeType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: file.data },
    };
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: file.mimeType as "image/jpeg" | "image/png",
      data: file.data,
    },
  };
}

export const claude: Provider = {
  name: "claude",
  // Competition rule: only claude-haiku-4-5 is allowed.
  get models() {
    return [getEnv().MODEL_NAME || "claude-haiku-4-5"];
  },

  async call({ model, system, input, jsonSchema, files = [], timeoutMs }) {
    try {
      const response = await getClient().beta.messages.create(
        {
          model,
          max_tokens: 8000, // generous ceiling; too low cuts the JSON off mid-way
          system,
          // Documents first, then the text that refers to them.
          messages: [
            { role: "user", content: [...files.map(toBlock), { type: "text", text: input }] },
          ],
          output_config: {
            // Structured output: Claude's reply MUST match this JSON Schema.
            format: { type: "json_schema", schema: jsonSchema },
          },
          // No server-side model fallback: only the configured model may answer.
        },
        { timeout: timeoutMs },
      );

      // Always check why it stopped BEFORE reading the content.
      if (response.stop_reason === "refusal") {
        throw new UserFacingError("The AI declined this request. Try rephrasing it.");
      }

      // content is an array of blocks (text, thinking, ...). Keep only the text.
      return response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
    } catch (error) {
      if (isBusy(error)) throw new BusyError();
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        throw new UserFacingError("The AI took too long to respond. Please try again.", 504);
      }
      throw error;
    }
  },
};
