import { useState } from "react";
import type { GeneratorResult } from "../schema";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

export function useGenerate() {
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(input: string) {
    if (loading || !input.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? FALLBACK_ERROR);
      setResult(data as GeneratorResult);
    } catch (err) {
      const offline = err instanceof TypeError;
      setError(
        offline
          ? "Network error. Check your connection."
          : (err as Error).message || FALLBACK_ERROR,
      );
    } finally {
      setLoading(false);
    }
  }

  return { result, loading, error, generate };
}
