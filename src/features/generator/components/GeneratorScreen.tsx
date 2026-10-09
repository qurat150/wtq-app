"use client";
// ↑ THE client boundary. This file and everything it imports run in the browser.

import { useState } from "react";
import { Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { useGenerate } from "../hooks/useGenerate";
import { ExamplePrompts } from "./ExamplePrompts";
import { InputForm } from "./InputForm";
import { ResultCards } from "./ResultCards";

export function GeneratorScreen() {
  const [input, setInput] = useState("");
  const { result, loading, error, generate } = useGenerate();

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Interview Prep</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Describe a role and get likely interview questions, sample answers and tips.
        </p>
      </header>

      <InputForm value={input} onChange={setInput} onSubmit={() => generate(input)} loading={loading} />
      <ExamplePrompts onPick={setInput} disabled={loading} />

      {/* The 4 UI states, same pattern as an RN screen: */}
      {error && <ErrorBanner message={error} />}

      {loading && (
        <Card className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
          <Spinner className="text-violet-600" /> Thinking...
        </Card>
      )}

      {result && <ResultCards result={result} />}

      {!result && !loading && !error && (
        <EmptyState
          title="Your results will appear here"
          description="Type above or pick an example, then tap Generate."
        />
      )}
    </main>
  );
}
