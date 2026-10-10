"use client";
// The client boundary for BillSamaj: upload -> analyse -> report + questions.
// Everything lives in React state (memory only): nothing is saved or uploaded elsewhere.

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button, Card, ErrorBanner, Spinner } from "@/components/ui";
import { computeFacts, type BillFacts } from "../calc";
import { SAMPLE_EXTRACTION } from "../sample";
import { ACCEPTED_TYPES, MAX_FILE_BYTES, type BillExtraction } from "../schema";
import { AskPanel } from "./AskPanel";
import { BillReport } from "./BillReport";

type Result = { extraction: BillExtraction; facts: BillFacts; source: "live" | "sample" };

const STEPS = ["Checking the image", "Reading the bill with AI", "Checking the numbers add up", "Preparing your explanation"];

export function BillApp() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Advance the visible progress steps while the request runs (the last step waits for the server).
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 2)), 2500);
    return () => clearInterval(timer);
  }, [loading]);

  // Demo shortcut: /?sample opens the sample bill straight away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("sample")) {
      loadSample();
    }
  }, []);

  // Free the preview's object URL when it's replaced.
  useEffect(() => () => { if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  async function analyse(file: File) {
    setError(null);
    setResult(null);
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      setError("Please upload a JPG or PNG image of your bill.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("This image is larger than 4 MB. Please use a smaller photo or a screenshot.");
      return;
    }
    setImageUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setLoading(true);
    setStep(1);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/bill/analyze", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "We couldn't read this bill. Please try again.");
      setStep(STEPS.length - 1);
      setResult({ extraction: data.extraction, facts: data.facts, source: "live" });
    } catch (err) {
      setError(err instanceof TypeError ? "Network error. Check your connection and try again." : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setError(null);
    setImageUrl("/samples/KESC_0008.png");
    setFileName("KESC_0008.png (sample)");
    setResult({ extraction: SAMPLE_EXTRACTION, facts: computeFacts(SAMPLE_EXTRACTION), source: "sample" });
  }

  function reset() {
    setResult(null);
    setImageUrl(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) analyse(file);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-3">
        <button type="button" onClick={reset} className="flex items-center gap-2 text-left">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg font-bold text-white" aria-hidden="true">B</span>
          <span>
            <span className="block text-lg font-bold leading-tight text-ink">BillSamaj</span>
            <span className="block text-xs text-muted">Your bill. Finally, understood.</span>
          </span>
        </button>
        {result && (
          <Button variant="secondary" onClick={reset} className="px-3 py-2">
            Analyse another bill
          </Button>
        )}
      </header>

      {!result && !loading && (
        <section className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Understand your electricity bill in a minute.</h1>
          <p className="mt-3 text-base text-muted">
            Upload a K-Electric, LESCO or IESCO bill. BillSamaj reads every charge and tax, checks that the totals add up, and answers your questions in plain language.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
          >
            <p className="font-semibold text-ink">Drop your bill image here</p>
            <p className="mt-1 text-sm text-muted">JPG or PNG, up to 4 MB. A clear photo or screenshot works best.</p>
            <input
              ref={inputRef}
              id="bill-file"
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) analyse(f); }}
            />
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button onClick={() => inputRef.current?.click()}>Choose a bill image</Button>
              <Button variant="secondary" onClick={loadSample}>Try the sample bill</Button>
            </div>
          </div>

          {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

          <p className="mt-6 rounded-xl bg-surface-2 p-4 text-xs leading-relaxed text-muted">
            <strong className="text-ink">Privacy:</strong> your image is sent to our server only to be read by the AI (Google Gemini) for this request. It is not saved, and personal identifiers (names, addresses, account and meter numbers) are never extracted. Results stay in this browser tab and disappear when you close it.
          </p>
        </section>
      )}

      {loading && (
        <Card className="mx-auto max-w-md p-6" aria-live="polite">
          <p className="font-semibold text-ink">Analysing {fileName}</p>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                {i < step ? (
                  <span className="grid size-5 place-items-center rounded-full bg-good text-xs text-white" aria-hidden="true">✓</span>
                ) : i === step ? (
                  <Spinner className="size-5 text-brand" />
                ) : (
                  <span className="size-5 rounded-full border-2 border-line" aria-hidden="true" />
                )}
                <span className={i <= step ? "text-ink" : "text-muted"}>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">This usually takes 10 to 30 seconds.</p>
        </Card>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <aside className="order-2 min-w-0 space-y-4 lg:order-1 lg:sticky lg:top-4 lg:self-start">
            {result.source === "sample" && (
              <p className="rounded-xl border border-caution/30 bg-caution-soft p-3 text-sm text-ink">
                <strong>Sample analysis:</strong> training bill KESC_0008 with its verified values from the participant guide. No AI call was made. Upload a bill for a live reading.
              </p>
            )}
            {imageUrl && (
              <Card className="overflow-hidden p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimisable asset */}
                <img src={imageUrl} alt={`Uploaded bill ${fileName ?? ""}`} className="max-h-[70vh] w-full rounded-lg object-contain" />
              </Card>
            )}
            <AskPanel extraction={result.extraction} />
          </aside>
          <div className="order-1 min-w-0 lg:order-2">
            <BillReport extraction={result.extraction} facts={result.facts} />
          </div>
        </div>
      )}
    </main>
  );
}
