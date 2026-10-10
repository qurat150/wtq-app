/**
 * Batch runner: reads a folder of bill images + the two CSV templates and writes
 * the completed level1.csv and level2.csv.
 *
 *   npm run batch -- --bills test/bills --csv test/csv --out output
 *
 * Without --csv it processes every image in --bills with the guide's sample
 * questions (useful on the training bills).
 *
 * Results are cached in <out>/.cache, so re-running after a failure only redoes
 * the missing work. Use --force to ignore the cache.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import Papa from "papaparse";
import { computeFacts, emptyLevel1 } from "@/features/bill/calc";
import type { BillExtraction, Question } from "@/features/bill/schema";
import { answerQuestions } from "@/features/bill/server/answer";
import { extractBill } from "@/features/bill/server/extract";
import type { AIFile } from "@/lib/ai";

// Load .env.local / .env (Node's built-in loader; no dotenv dependency).
for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

const { values: args } = parseArgs({
  options: {
    bills: { type: "string" },
    csv: { type: "string" },
    out: { type: "string", default: "output" },
    concurrency: { type: "string", default: "2" },
    force: { type: "boolean", default: false },
  },
});
if (!args.bills) {
  console.error("Usage: npm run batch -- --bills <folder> [--csv <folder with level1.csv & level2.csv>] [--out output]");
  process.exit(1);
}

const BILLS_DIR = args.bills;
const OUT_DIR = args.out!;
const CACHE_DIR = path.join(OUT_DIR, ".cache");
const CONCURRENCY = Math.max(1, Number(args.concurrency) || 2);
mkdirSync(CACHE_DIR, { recursive: true });

const SAMPLE_QUESTIONS: Question[] = [
  { question_id: "Q1", question: "How much of my bill is taxes?" },
  { question_id: "Q2", question: "How many months in my history went above 200 units?" },
  { question_id: "Q3", question: "How much extra will I pay if I pay after the due date?" },
  { question_id: "Q4", question: "What is my average cost per unit this month?" },
];

// ── helpers ────────────────────────────────────────────────────────────

type Row = Record<string, string>;

function readCsv(file: string): { rows: Row[]; fields: string[] } {
  const text = readFileSync(file, "utf8").replace(/^﻿/, "");
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  return { rows: parsed.data, fields: parsed.meta.fields ?? [] };
}

function writeCsv(file: string, fields: string[], rows: Row[]) {
  // papaparse quotes cells containing commas/quotes/newlines and doubles inner quotes.
  writeFileSync(file, Papa.unparse({ fields, data: rows.map((r) => fields.map((f) => r[f] ?? "")) }, { newline: "\n" }) + "\n", "utf8");
}

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

function findImage(billId: string): string | null {
  const match = readdirSync(BILLS_DIR).find(
    (f) => path.parse(f).name === billId && MIME[path.extname(f).toLowerCase()],
  );
  return match ? path.join(BILLS_DIR, match) : null;
}

function loadImage(file: string): AIFile {
  return { mimeType: MIME[path.extname(file).toLowerCase()], data: readFileSync(file).toString("base64") };
}

function cached<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const file = path.join(CACHE_DIR, name);
  if (!args.force && existsSync(file)) return Promise.resolve(JSON.parse(readFileSync(file, "utf8")) as T);
  return fn().then((value) => {
    writeFileSync(file, JSON.stringify(value, null, 2));
    return value;
  });
}

/** Runs `fn` over items with a small concurrency limit (free-tier rate limits). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

const errorText = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

/** Reads the bill; if its own totals don't add up (charges + taxes vs current bill, or
 *  line items vs subtotals), reads it once more telling the model which figures disagree,
 *  and keeps the reading that passes more consistency checks. Printed values are never altered. */
const SELF_CHECKS = ["current_bill", "charges_subtotal", "taxes_subtotal"];
async function extractWithSelfCheck(image: AIFile): Promise<BillExtraction> {
  const failed = (x: BillExtraction) => computeFacts(x).checks.filter((c) => SELF_CHECKS.includes(c.name) && c.ok === false);
  const first = await extractBill(image);
  const problems = failed(first);
  if (problems.length === 0) return first;
  const note =
    "CAREFUL SECOND READING: in a first reading these printed figures did not add up: " +
    problems.map((c) => c.detail).join("; ") +
    ". Re-read each of these amounts digit by digit (watch for 3/8, 1/7, 5/6 confusions, folds and handwriting). If the bill itself is inconsistent, still copy exactly what is printed.";
  try {
    const second = await extractBill(image, note);
    return failed(second).length < problems.length ? second : first;
  } catch {
    return first;
  }
}

// ── main ───────────────────────────────────────────────────────────────

async function main() {
  // 1. Work out which bills and questions to process.
  let level1: { rows: Row[]; fields: string[] };
  let level2: { rows: Row[]; fields: string[] };
  if (args.csv) {
    level1 = readCsv(path.join(args.csv, "level1.csv"));
    level2 = readCsv(path.join(args.csv, "level2.csv"));
  } else {
    const ids = readdirSync(BILLS_DIR).filter((f) => MIME[path.extname(f).toLowerCase()]).map((f) => path.parse(f).name).sort();
    level1 = { fields: ["bill_id", "json"], rows: ids.map((bill_id) => ({ bill_id, json: "" })) };
    level2 = {
      fields: ["bill_id", "question_id", "question", "answer"],
      rows: ids.flatMap((bill_id) => SAMPLE_QUESTIONS.map((q) => ({ bill_id, ...q, answer: "" }))),
    };
  }
  const billIds = [...new Set([...level1.rows.map((r) => r.bill_id), ...level2.rows.map((r) => r.bill_id)])];
  console.log(`Bills: ${billIds.length}, Level 2 questions: ${level2.rows.length}, concurrency ${CONCURRENCY}`);

  // 2. Level 1: extract every bill (cached).
  const extractions = new Map<string, BillExtraction>();
  const images = new Map<string, AIFile>();
  await mapLimit(billIds, CONCURRENCY, async (billId) => {
    const file = findImage(billId);
    if (!file) {
      console.error(`✗ ${billId}: image not found in ${BILLS_DIR}`);
      return;
    }
    const image = loadImage(file);
    images.set(billId, image);
    const started = Date.now();
    try {
      const extraction = await cached(`${billId}.extraction.json`, () => extractWithSelfCheck(image));
      extractions.set(billId, extraction);
      const failed = computeFacts(extraction).checks.filter((c) => c.ok === false);
      console.log(`✓ ${billId} extracted (${((Date.now() - started) / 1000).toFixed(1)}s)${failed.length ? `  ⚠ check: ${failed.map((c) => c.detail).join(" | ")}` : ""}`);
    } catch (error) {
      console.error(`✗ ${billId}: extraction failed: ${errorText(error)}`);
    }
  });

  for (const row of level1.rows) {
    const extraction = extractions.get(row.bill_id);
    row.json = JSON.stringify(extraction ? computeFacts(extraction).level1 : emptyLevel1());
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeCsv(path.join(OUT_DIR, "level1.csv"), level1.fields, level1.rows);
  console.log(`→ wrote ${path.join(OUT_DIR, "level1.csv")}`);

  // 3. Level 2: answer each bill's questions in one call (cached per bill).
  const byBill = new Map<string, Row[]>();
  for (const row of level2.rows) byBill.set(row.bill_id, [...(byBill.get(row.bill_id) ?? []), row]);

  await mapLimit([...byBill.entries()], CONCURRENCY, async ([billId, rows]) => {
    const extraction = extractions.get(billId);
    if (!extraction) {
      for (const row of rows) row.answer = "The bill image could not be read automatically, so this question cannot be answered from it.";
      return;
    }
    const questions = rows.map((r) => ({ question_id: r.question_id, question: r.question }));
    try {
      const answers = await cached(`${billId}.answers.json`, async () => {
        const map = await answerQuestions(extraction, questions, images.get(billId));
        // Retry once for any question the model skipped.
        const missing = questions.filter((q) => !map.get(q.question_id));
        if (missing.length) for (const [id, a] of await answerQuestions(extraction, missing, images.get(billId))) map.set(id, a);
        return Object.fromEntries(map);
      });
      for (const row of rows) {
        row.answer = answers[row.question_id] || "This question could not be answered automatically from the bill.";
      }
      console.log(`✓ ${billId} answered ${rows.length} questions`);
    } catch (error) {
      console.error(`✗ ${billId}: answering failed: ${errorText(error)}`);
      for (const row of rows) row.answer ||= "This question could not be answered automatically because the AI service failed.";
    }
  });

  writeCsv(path.join(OUT_DIR, "level2.csv"), level2.fields, level2.rows);
  console.log(`→ wrote ${path.join(OUT_DIR, "level2.csv")}`);

  const failed = billIds.filter((id) => !extractions.has(id));
  if (failed.length) {
    console.error(`\n${failed.length} bill(s) failed: ${failed.join(", ")}. Re-run the same command to retry only those.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(errorText(error));
  process.exit(1);
});
