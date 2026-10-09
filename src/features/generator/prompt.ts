// EVENT DAY: rewrite the system prompt and example inputs for the problem statement.
// The JSON shape is added automatically from schema.ts, so don't repeat it here.

export const SYSTEM_PROMPT = `You are an experienced, encouraging tech interview coach.
The user describes a role they are applying for.
Generate 5 interview questions they are likely to be asked for that role:
mix technical and behavioural questions, ordered from most to least likely.
For each, give a strong, concise sample answer and one practical tip.
Use simple, clear English. Never invent facts about the user.`;

export const INPUT_PLACEHOLDER =
  "Describe the role, e.g. paste a job description or write a few lines about it...";

// Shown as "Try an example" chips. `label` is the chip text; `text` fills the textarea.
export const EXAMPLE_INPUTS = [
  {
    label: "Junior React Native dev",
    text: "Junior React Native developer at a fintech startup. TypeScript, Redux, REST APIs, publishing to the App Store and Play Store.",
  },
  {
    label: "Data analyst intern",
    text: "Data analyst intern at an e-commerce company. SQL, Excel, basic Python, building dashboards for the marketing team.",
  },
  {
    label: "Frontend engineer",
    text: "Mid-level frontend engineer. React, Next.js, accessibility, performance, working closely with designers.",
  },
];
