"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { GeneratorItem, GeneratorResult } from "../schema";

export function ResultCards({ result }: { result: GeneratorResult }) {
  return (
    // aria-live="polite": screen readers announce new results when they appear.
    <section className="space-y-3" aria-live="polite">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {result.title}
      </h2>
      {/* Index as key is OK here: the list is replaced wholesale, never reordered. */}
      {result.items.map((item, index) => (
        <ResultCard key={index} item={item} number={index + 1} />
      ))}
    </section>
  );
}

function ResultCard({ item, number }: { item: GeneratorItem; number: number }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-neutral-900 dark:text-neutral-100">
          <span className="text-violet-600 dark:text-violet-400">{number}.</span> {item.question}
        </p>
        <CopyButton text={`${item.question}\n\n${item.answer}\n\nTip: ${item.tip}`} />
      </div>
      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {item.answer}
      </p>
      <p className="rounded-lg bg-violet-50 p-2.5 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
        <span className="font-semibold">Tip:</span> {item.tip}
      </p>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // The web's Clipboard.setString().
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. non-HTTPS). Failing silently is fine here.
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={copy}
      className="shrink-0 px-2.5 py-1.5 text-xs"
      aria-label="Copy this card"
    >
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}
