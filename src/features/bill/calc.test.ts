// Run with: npm test  (Node's built-in test runner; Node strips the TypeScript types)
import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFacts, daysBetween, isIsoDate, monthsAbove, pctChange, thresholdCounts, toLevel1 } from "./calc.ts";
import { SAMPLE_EXTRACTION } from "./sample.ts";

test("toLevel1 reproduces the guide's correct JSON for KESC_0008", () => {
  const level1 = toLevel1(SAMPLE_EXTRACTION);
  assert.equal(level1.provider, "KE");
  assert.equal(level1.payable_after_due_date, 3716); // highest late amount
  assert.deepEqual(level1.charges.map((c) => c.type), ["fixed", "energy", "energy", "quarterly_adjustment", "fpa", "surcharge"]);
  assert.deepEqual(level1.taxes.map((t) => t.amount), [29.41, 520.21, 20]);
  assert.equal(level1.arrears, -0.53);
  assert.deepEqual(Object.keys(level1).length, 18); // every field present
});

test("toLevel1 drops zero lines, forces subsidies negative and nulls bad dates", () => {
  const level1 = toLevel1({
    ...SAMPLE_EXTRACTION,
    due_date: "2026-02-31",
    bill_month: "Apr-26",
    late_payment_amounts: [],
    charges: [
      { label: "Meter Rent", type: "meter_rent", amount: 0, units: null, rate: null },
      { label: "Subsidy", type: "subsidy", amount: 3332, units: null, rate: null },
    ],
  });
  assert.deepEqual(level1.charges, [{ type: "subsidy", amount: -3332 }]);
  assert.equal(level1.due_date, null);
  assert.equal(level1.bill_month, null);
  assert.equal(level1.payable_after_due_date, null);
});

test("facts match the guide's Level 2 sample answers", () => {
  const facts = computeFacts(SAMPLE_EXTRACTION);
  assert.equal(facts.totals.taxes_pct_of_current_bill, 16.61);
  const above200 = monthsAbove(facts.history.previous_months, 200);
  assert.deepEqual(above200.map((m) => m.label), ["July 2025", "August 2025"]);
  assert.equal(facts.history.previous_months?.count, 12);
  assert.equal(facts.payment.late_payment_extra, 286);
  assert.equal(facts.per_unit.current_bill_per_unit, 22.72);
  assert.ok(facts.checks.every((c) => c.ok !== false), "all consistency checks pass");
});

test("threshold counts cover the history range", () => {
  const counts = thresholdCounts(computeFacts(SAMPLE_EXTRACTION).history.previous_months);
  assert.equal(counts.find((c) => c.threshold === 200)?.above.length, 2);
  assert.equal(counts.find((c) => c.threshold === 100)?.above.length, 10);
});

test("helpers", () => {
  assert.equal(pctChange(100, 125), 25);
  assert.equal(pctChange(0, 5), null);
  assert.equal(daysBetween("2026-04-07", "2026-04-21"), 14);
  assert.ok(isIsoDate("2026-04-21"));
  assert.ok(!isIsoDate("21-04-2026"));
});
