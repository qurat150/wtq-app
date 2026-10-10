import { z } from "zod";

// ── Level 1: the exact JSON the competition scores ─────────────────────
export const PROVIDERS = ["KE", "LESCO", "IESCO"] as const;
export const CHARGE_TYPES = [
  "energy",
  "fixed",
  "fpa",
  "quarterly_adjustment",
  "surcharge",
  "meter_rent",
  "subsidy",
  "other",
] as const;
export const TAX_TYPES = ["gst", "electricity_duty", "income_tax", "municipal_tax", "other_tax"] as const;

export type ChargeType = (typeof CHARGE_TYPES)[number];
export type TaxType = (typeof TAX_TYPES)[number];

/** Section 5.1 of the participant guide. Key order matters for readability only. */
export type Level1 = {
  provider: (typeof PROVIDERS)[number] | null;
  tariff: string | null;
  sanctioned_load_kw: number | null;
  bill_month: string | null; // YYYY-MM
  reading_date: string | null; // YYYY-MM-DD
  issue_date: string | null;
  due_date: string | null;
  previous_reading: number | null;
  current_reading: number | null;
  units_consumed: number | null;
  charges: { type: ChargeType; amount: number }[];
  total_charges: number | null;
  taxes: { type: TaxType; amount: number }[];
  total_taxes: number | null;
  current_bill: number | null;
  arrears: number | null;
  payable_within_due_date: number | null;
  payable_after_due_date: number | null;
};

// ── What the AI returns when reading a bill ─────────────────────────────
// Level 1 fields PLUS extra printed details (labels, usage history, payment
// history...) that Level 2 answers and the UI need. Code converts it to Level 1.

const num = (description: string) => z.number().nullable().describe(description);

export const BillExtractionSchema = z.object({
  provider: z.enum(PROVIDERS).nullable().describe("KE for K-Electric (KESC), LESCO, or IESCO"),
  tariff: z.string().nullable().describe("Tariff code exactly as printed, e.g. 'A1-R' or 'A-1a(01)'"),
  sanctioned_load_kw: num("Sanctioned load in kW (labelled Sanc Load, S.Load, San Load)"),
  connected_load_kw: num("Connected load in kW, if printed"),

  bill_month: z.string().nullable().describe("Billing month as YYYY-MM, e.g. 'Apr-26' -> '2026-04'"),
  reading_date: z.string().nullable().describe("Meter reading date as YYYY-MM-DD"),
  issue_date: z.string().nullable().describe("Issue date as YYYY-MM-DD"),
  due_date: z.string().nullable().describe("Due date (last day without late surcharge) as YYYY-MM-DD"),

  previous_reading: num("Previous meter reading as printed"),
  current_reading: num("Current meter reading as printed"),
  units_consumed: num("Units billed for the current month as printed"),
  mdi_kw: num("MDI (maximum demand indicator) in kW, if printed"),

  charges: z
    .array(
      z.object({
        label: z.string().describe("Line label exactly as printed, e.g. 'Variable Upto 100 Units (Protected)'"),
        type: z.enum(CHARGE_TYPES),
        amount: z.number().describe("PKR as printed; credits/subsidies negative (38209CR -> -38209)"),
        units: num("Units column for this line, if printed"),
        rate: num("Rate column for this line, if printed"),
      }),
    )
    .describe("One entry per non-zero line in the CHARGES section (not taxes)"),
  total_charges: num("Printed charges subtotal (e.g. 'Electricity Charges'), null if none printed"),

  taxes: z
    .array(
      z.object({
        label: z.string().describe("Line label exactly as printed, e.g. 'Sales Tax u/s 3(1)'"),
        type: z.enum(TAX_TYPES),
        amount: z.number(),
      }),
    )
    .describe("One entry per non-zero line in the TAX / GOVT section. [] if only a combined amount is printed"),
  total_taxes: num("Printed tax subtotal, null if none printed"),

  current_bill: num("Printed amount for this month's bill"),
  arrears: num("Previous dues / arrears carried forward, with printed sign (credit -> negative). null if blank"),
  payable_within_due_date: num("Amount payable within/by the due date"),
  late_payment_amounts: z
    .array(z.object({ label: z.string(), amount: z.number() }))
    .describe("EVERY printed 'payable after due date' amount with its label/date range"),
  late_payment_surcharges: z
    .array(z.object({ label: z.string(), amount: z.number() }))
    .describe("Printed late payment surcharge (LPS) amounts, e.g. 'Late Payment Surcharge (5%)'"),

  usage_history: z
    .array(z.object({ month: z.string().describe("YYYY-MM"), units: z.number() }))
    .describe("Printed monthly usage/units history bars or table, oldest first, INCLUDING the current month if shown"),
  payment_history: z
    .array(
      z.object({
        month: z.string().describe("YYYY-MM"),
        billed_amount: num("Billed amount"),
        paid_amount: num("Payment amount"),
        paid_date: z.string().nullable().describe("YYYY-MM-DD if printed"),
      }),
    )
    .describe("Printed billing/payment history table, oldest first. [] if none"),

  other_printed_facts: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("Other useful printed facts: percentage splits (e.g. energy 83.39% / taxes 16.61%), number of months billed, reading days, notices/messages, protected/non-protected status, subsidy notes. No personal identifiers."),
  unreadable_fields: z.array(z.string()).describe("Field names that are hidden by grey boxes, blurry or cut off"),
});
export type BillExtraction = z.infer<typeof BillExtractionSchema>;

// ── Level 2: answers ───────────────────────────────────────────────────
export const AnswersSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string(),
      answer: z.string().describe("Plain-English answer grounded in the bill, with exact figures"),
    }),
  ),
});
export type Answers = z.infer<typeof AnswersSchema>;

export type Question = { question_id: string; question: string };

// ── Web API requests ───────────────────────────────────────────────────
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is ~4.5 MB
export const ACCEPTED_TYPES = ["image/jpeg", "image/png"] as const;

export const AskRequestSchema = z.object({
  question: z.string().trim().min(1, "Please type a question.").max(500, "Please keep it under 500 characters."),
  extraction: BillExtractionSchema,
});
