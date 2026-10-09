// What lib/ai/index.ts passes to a provider.
export type ProviderRequest = {
  model: string;
  /** Instructions for the AI (system prompt + the JSON shape it must return). */
  system: string;
  /** What the user typed. */
  input: string;
  /** JSON Schema generated from the feature's zod schema. */
  jsonSchema: Record<string, unknown>;
};

export type Provider = {
  name: string;
  /** Tried in order. Later models are fallbacks when earlier ones are busy. */
  models: string[];
  /** Returns the raw text reply. Throws BusyError when the provider is overloaded. */
  call: (request: ProviderRequest) => Promise<string>;
};
