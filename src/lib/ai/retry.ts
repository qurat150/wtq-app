import "server-only";

/** Thrown by providers when the AI is overloaded or rate-limited. Safe to retry. */
export class BusyError extends Error {
  constructor(message = "The AI provider is busy") {
    super(message);
    // Shows "BusyError" in logs instead of the generic "Error".
    this.name = "BusyError";
  }
}

// Wait 1s, 2s, 4s between attempts. Lower these if demos feel slow.
const BACKOFF_MS = [1000, 2000, 4000];

// Promise-based sleep: await sleep(1000) pauses this function for 1 second.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls `call(model)` for each model in order.
 * - BusyError: wait and retry the same model, then fall back to the next model.
 * - Any other error (bad key, bad request): fail fast, because retrying won't help.
 *
 * <T> = generic: whatever type `call` returns, withRetry returns the same type.
 */
export async function withRetry<T>(
  models: string[],
  call: (model: string) => Promise<T>
): Promise<T> {
  for (const model of models) {
    // attempt 0..3 = 1 first try + 3 retries (one per BACKOFF_MS entry).
    for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
      try {
        // `return await` (not just `return`) so a rejection is caught by THIS try/catch.
        return await call(model);
      } catch (error) {
        // Not a busy error? Re-throw immediately: no retry.
        if (!(error instanceof BusyError)) throw error;

        const delay = BACKOFF_MS[attempt];
        // BACKOFF_MS[3] is undefined: out of retries, so leave the inner loop.
        if (delay === undefined) break;
        console.warn(`[ai] ${model} is busy, retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
    console.warn(`[ai] ${model} is still busy, falling back to the next model`);
  }
  // Every model is busy: the API route turns this into a friendly 503.
  throw new BusyError();
}
