"use client";

import { EXAMPLE_INPUTS } from "../prompt";

type ExamplePromptsProps = {
  onPick: (text: string) => void;
  disabled?: boolean;
};

// Tapping a chip only fills the textarea. The AI runs when the user taps Generate.
export function ExamplePrompts({ onPick, disabled }: ExamplePromptsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Try an example
      </p>
      {/* flex-wrap = chips flow onto the next line, like flexWrap: "wrap" in RN */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_INPUTS.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(example.text)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-violet-500 dark:hover:bg-violet-950/40"
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  );
}
