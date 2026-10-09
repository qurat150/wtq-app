import "server-only";

const MOCK_DELAY_MS = 800;

/** Returns a copy of the fixture after a short delay, so loading states are visible. */
export async function mockResponse<T>(fixture: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  // structuredClone = deep copy, so nobody can accidentally mutate the shared fixture.
  return structuredClone(fixture);
}
