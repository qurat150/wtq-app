"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, ErrorBanner, Textarea } from "@/components/ui";
import type { BillExtraction } from "../schema";

const SUGGESTED = [
  "Why do I have to pay this much?",
  "How much of my bill is taxes?",
  "What does FPA mean on my bill?",
  "How much extra if I pay late?",
  "Is my usage higher than usual?",
  "What should I check if I think my bill is wrong?",
];

type Message = { role: "user" | "assistant"; text: string };

export function AskPanel({ extraction }: { extraction: BillExtraction }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const response = await fetch("/api/bill/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, extraction }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch (err) {
      setError(err instanceof TypeError ? "Network error. Check your connection." : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink">Ask about your bill</h2>
      <p className="text-sm text-muted">Answers use only what&apos;s on this bill, with numbers calculated in code.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => ask(s)}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:bg-brand-soft disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {messages.length > 0 && (
        <ol className="mt-4 space-y-3" aria-live="polite">
          {messages.map((m, i) => (
            <li
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm text-white"
                  : "w-fit max-w-[95%] rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2 text-sm leading-relaxed text-ink"
              }
            >
              {m.text}
            </li>
          ))}
          {loading && <li className="w-fit rounded-2xl bg-surface-2 px-3.5 py-2 text-sm text-muted">Reading your bill…</li>}
        </ol>
      )}

      {error && <div className="mt-3"><ErrorBanner message={error} /></div>}

      <form onSubmit={onSubmit} className="mt-4 flex items-end gap-2">
        <label htmlFor="bill-question" className="sr-only">Your question</label>
        <Textarea
          id="bill-question"
          rows={1}
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
          placeholder="e.g. Why is my bill higher than last month?"
          className="min-h-11 resize-none"
        />
        <Button type="submit" loading={loading} disabled={!question.trim()} className="shrink-0">
          Ask
        </Button>
      </form>
    </Card>
  );
}
