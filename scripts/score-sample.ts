// Compares our Level 1 output for KESC_0008 with the guide's published correct JSON (section 5.7).
// Usage: npx tsx scripts/score-sample.ts output/train/.cache/KESC_0008.extraction.json
import { readFileSync } from "node:fs";
import { toLevel1 } from "@/features/bill/calc";

const EXPECTED = {
  provider: "KE", tariff: "A1-R", sanctioned_load_kw: 3, bill_month: "2026-04", reading_date: "2026-04-03",
  issue_date: "2026-04-07", due_date: "2026-04-21", previous_reading: 8819, current_reading: 8970, units_consumed: 151,
  charges: [{ type: "fixed", amount: 900 }, { type: "energy", amount: 1054 }, { type: "energy", amount: 663.51 },
    { type: "quarterly_adjustment", amount: 52.91 }, { type: "fpa", amount: 125.27 }, { type: "surcharge", amount: 64.93 }],
  total_charges: 2860.62,
  taxes: [{ type: "electricity_duty", amount: 29.41 }, { type: "gst", amount: 520.21 }, { type: "municipal_tax", amount: 20 }],
  total_taxes: 569.62, current_bill: 3430.24, arrears: -0.53, payable_within_due_date: 3430, payable_after_due_date: 3716,
} as Record<string, unknown>;

const got = toLevel1(JSON.parse(readFileSync(process.argv[2], "utf8"))) as Record<string, unknown>;
let ok = 0;
for (const [key, want] of Object.entries(EXPECTED)) {
  const same = typeof want === "number" ? Math.abs((got[key] as number) - want) <= 1 : JSON.stringify(got[key]) === JSON.stringify(want);
  if (same) ok++;
  else console.log(`✗ ${key}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got[key])}`);
}
console.log(`${ok}/${Object.keys(EXPECTED).length} fields correct`);
