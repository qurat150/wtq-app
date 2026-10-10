import "server-only";

/** An error whose message is safe to show to users, even in production. */
export class UserFacingError extends Error {
  /** HTTP status the API route should answer with. */
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
  }
}

/** True when a provider call was aborted by our timeout. */
export function isTimeout(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}
