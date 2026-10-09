import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { requireKey } from "@/lib/env";
import { BusyError } from "../retry";
import type { Provider } from "../types";

// 429 = rate limited, 503 = overloaded. Retrying these can succeed.
const BUSY_STATUSES = [429, 503];
// Some Gemini errors only carry the status inside the message text.
const BUSY_TEXT = ["429", "503", "unavailable", "resource_exhausted", "overloaded"];

let client: GoogleGenAI | undefined;

// Lazy singleton: create the client on the first call, reuse it afterwards.
// Lazy (not at import time) so the build works without a key, and a missing
// key gives a clear error only when you actually use Gemini.
function getClient() {
  // ??= means "assign only if currently null/undefined".
  client ??= new GoogleGenAI({ apiKey: requireKey("GEMINI_API_KEY") });
  return client;
}

function isBusy(error: unknown) {
  if (error instanceof ApiError && BUSY_STATUSES.includes(error.status)) return true;
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return BUSY_TEXT.some((text) => message.includes(text));
}

export const gemini: Provider = {
  name: "gemini",
  // First = preferred; second = fallback when the first stays busy.
  models: ["gemini-3.5-flash", "gemini-3.1-flash-lite"],

  async call({ model, system, input, jsonSchema }) {
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: input, // what the user typed
        config: {
          systemInstruction: system, // the "how to behave" instructions
          responseMimeType: "application/json", // reply with JSON, not prose
          // Forces the exact shape from the feature's zod schema.
          responseJsonSchema: jsonSchema,
        },
      });
      // .text is a getter that joins the reply's text parts; can be undefined.
      return response.text ?? "";
    } catch (error) {
      if (isBusy(error)) throw new BusyError();
      throw error; // bad key, bad request, etc.: let it fail fast
    }
  },
};
