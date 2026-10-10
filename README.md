# BillSamaj: Utility Bill Decoder

**Your bill. Finally, understood.** BillSamaj reads Pakistani electricity bills (K-Electric, LESCO, IESCO) from a photo, scan or screenshot, extracts every charge, tax and payable amount (Level 1), and answers customer questions about the bill in plain English (Level 2).

It has two entry points that share the same core:

- **Batch CLI** (`npm run batch`): reads a folder of bill images and the CSV templates, then writes `level1.csv` and `level2.csv`.
- **Web app** (`npm run dev`): upload a bill to see the extracted fields, a charge breakdown, usage history, consistency checks, and a Q&A panel.

## Requirements

- **Node.js 22 or later** (developed and tested on Node.js 26.7). `npm test` needs Node.js 23.6+, which runs TypeScript test files natively.
- A Google AI Studio API key (free): https://aistudio.google.com/apikey

## Setup

```bash
npm ci                          # exact versions from package-lock.json
cp .env.example .env.local      # then put your key in GEMINI_API_KEY
```

| Variable | Purpose | Value used |
|---|---|---|
| `AI_PROVIDER` | Model provider | `gemini` |
| `MODEL_NAME` | Model ID | `gemini-3.5-flash-lite` |
| `GEMINI_API_KEY` | Google AI Studio key | your key |
| `ANTHROPIC_API_KEY` | Only if `AI_PROVIDER=claude` (uses `claude-haiku-4-5`) | not used |
| `AI_MOCK` | `true` = no API calls (returns the built-in sample bill) | `false` |

## Generate the CSV files (scored output)

```bash
# test/bills/*.png|jpg  +  test/csv/level1.csv, test/csv/level2.csv  ->  output/level1.csv, output/level2.csv
npm run batch -- --bills test/bills --csv test/csv --out output
```

- Rows, row order, `bill_id`, `question_id` and `question` are copied from the templates unchanged. The CSVs are written with papaparse (UTF-8, correct quoting, one JSON object per line).
- Results are cached per bill in `output/.cache/`. If a bill fails (for example because the free tier is rate-limited), **re-run the same command** and only the missing work is redone. `--force` ignores the cache.
- A bill that still fails gets a Level 1 object with every field set to `null`, and Level 2 answers that say the bill couldn't be read. No cell is ever left empty.
- Without `--csv`, every image in `--bills` is processed with a few sample questions: `npm run batch -- --bills data/train/bills --out output/train`.
- `--concurrency 2` (the default) keeps within the free tier's 15 requests/minute.

Package the submission ZIP (`output/` + `source/`, with a secret scan):

```bash
npm run package     # -> submission.zip
```

## Run the web app

```bash
npm run dev         # http://localhost:3000  (http://localhost:3000/?sample opens the sample bill, no AI call)
```

## Other commands

```bash
npm test            # unit tests for the deterministic bill maths (node:test)
npm run lint
npm run build
```

## How it works

```
bill image ──► Gemini (vision, JSON schema) ──► BillExtraction ──► calc.ts (code) ──► Level 1 JSON
                                                      │                  │
                                                      │                  └─► facts: totals, %s, per-unit cost,
                                                      │                      late fee, history stats, threshold counts,
                                                      │                      consistency checks
                                                      ▼
                     questions ──► Gemini (bill image + extraction + code-computed facts) ──► Level 2 answers
```

**AI design: the model reads, code calculates.**

1. **Extraction (one call per bill).** The model returns a JSON-Schema-constrained object generated from a zod schema (`src/features/bill/schema.ts`). It contains the Level 1 fields plus printed labels, usage history, payment history and other printed facts. The prompt (`prompts.ts`) encodes the guide's rules (exact values, `CR` → negative, `DD MON YY` dates, null instead of guessing, no personal identifiers), how the K-Electric and LESCO/IESCO layouts map to fields, and the guide's KESC_0008 worked example.
2. **Deterministic post-processing** (`calc.ts`, unit-tested). Converts to the exact Level 1 format: date validation, zero lines dropped, subsidies forced negative, `payable_after_due_date` set to the highest printed late amount. It also runs consistency checks: charge lines vs subtotal, taxes vs subtotal, charges + taxes vs current bill, and meter difference vs units.
3. **Answers (one call per bill, all 12 questions together).** The model gets the bill image, the extraction, a plain-text **KEY FIGURES** block computed in code, and, for each question that mentions a unit threshold, a **computed** block with the exact count and the months. The model explains numbers instead of calculating them. Rules: ground answers in the bill only, label estimates, state the interpretation used, and say clearly when the bill doesn't show something.
4. **Reliability.** Every response is validated with zod, with one retry using a stricter reminder. Rate-limit and overload errors (429/503) use exponential backoff and then fall back from `gemini-3.5-flash-lite` to `gemini-3.1-flash-lite`. Requests time out after 120 s. Results are cached per bill.

**Privacy.** Images are processed in memory and never written to disk by the web app. Names, addresses, account, reference, consumer and meter numbers are never extracted. Logs contain error names and field paths only, never bill contents. API keys are read server-side only (`import "server-only"`).

### Project structure

```
scripts/batch.ts                    CLI: images + CSV templates -> level1.csv, level2.csv
scripts/package.sh                  builds submission.zip
src/lib/ai/                         provider-agnostic AI layer: generateJSON, retry/backoff/fallback, mock mode
src/lib/env.ts                      validated environment variables (server-only)
src/features/bill/schema.ts         zod schemas: extraction, Level 1 type, answers, requests
src/features/bill/prompts.ts        extraction + answering prompts
src/features/bill/calc.ts           Level 1 conversion, facts, consistency checks (+ calc.test.ts)
src/features/bill/server/           extractBill, answerQuestions, upload validation
src/features/bill/components/       web UI: BillApp, BillReport, AskPanel
src/app/api/bill/{analyze,ask}/     API routes for the web UI
src/components/ui/                  small design-system components
```

## AI usage

- **Models used by the solution:** `gemini-3.5-flash-lite` (primary) and `gemini-3.1-flash-lite` (automatic fallback when the primary is overloaded), both through the Google Gemini API. The code also contains an optional Anthropic adapter, locked to `claude-haiku-4-5` and used only if `AI_PROVIDER=claude`. It was not used to produce our results.
- **APIs:** Google Gemini API (Google AI Studio) via the official `@google/genai` SDK.
- **Other services:** none. No OCR services, invoice or receipt extraction agents, or Azure services.
- **AI tools used to write the code:** Claude Code (Anthropic), with the model Claude Opus 5.5, as a coding assistant.
