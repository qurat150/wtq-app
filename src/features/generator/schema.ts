import { z } from "zod";

// ── 1. What the browser sends to /api/ai ──────────────────────────────
export const MAX_INPUT_LENGTH = 4000; // also used as the textarea's maxLength

export const GenerateRequestSchema = z.object({
  input: z
    .string()
    .trim() // "   " becomes "", so it fails .min(1) below
    .min(1, "Please describe the role first.") // 2nd arg = the error message the user sees
    .max(MAX_INPUT_LENGTH, `Please keep it under ${MAX_INPUT_LENGTH} characters.`),
});

// ── 2. What the AI must return ────────────────────────────────────────
// EVENT DAY: change this shape first. .describe() text is sent to the AI as a hint.
export const GeneratorResultSchema = z.object({
  title: z.string().describe("Short heading for the results, e.g. the role name"),
  items: z
    .array(
      z.object({
        question: z.string().describe("A likely interview question"),
        answer: z.string().describe("A strong, concise sample answer (2-4 sentences)"),
        tip: z.string().describe("One practical tip for answering this well"),
      })
    )
    .min(1), // an empty list is not a valid answer
});

// Types inferred FROM the schema: change the schema, the types follow.
export type GeneratorResult = z.infer<typeof GeneratorResultSchema>;
// [number] = "the type of one element of this array".
export type GeneratorItem = GeneratorResult["items"][number];

// ── 3. Fake reply used when AI_MOCK=true ──────────────────────────────
// Typed as GeneratorResult, so TypeScript flags it if you change the schema and forget this.
export const MOCK_RESULT: GeneratorResult = {
  title: "Junior React Native Developer",
  items: [
    {
      question: "How do you keep a long list fast in React Native?",
      answer:
        "I use FlatList instead of ScrollView so only visible rows render. I give each row a stable keyExtractor, memoize row components with React.memo, and use getItemLayout when rows have a fixed height.",
      tip: "Mention a real list you optimized and the before/after result.",
    },
    {
      question: "Walk me through how you'd debug a crash that only happens on Android.",
      answer:
        "First I reproduce it and read the native stack trace in Logcat. Then I check recent native dependency changes and Android-specific code paths, and isolate it with a minimal repro before fixing and adding a test.",
      tip: "Show a calm, step-by-step process. Interviewers care more about method than the answer.",
    },
    {
      question: "Tell me about a time you disagreed with a teammate on a technical decision.",
      answer:
        "On a recent project we disagreed about adding a state library. I wrote a short comparison with pros and cons, we agreed to try plain React context for one sprint, and we revisited it with real data.",
      tip: "Use the STAR format: Situation, Task, Action, Result. End on what you learned.",
    },
  ],
};
