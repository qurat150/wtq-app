// Deterministic bill logic. The AI READS the bill; THIS file turns that into
// the exact Level 1 JSON and does every calculation Level 2 answers rely on,
// so numbers never depend on model arithmetic.
// Pure functions with type-only imports, so `node --test` can run them directly.
import type { BillExtraction, Level1 } from "./schema";

// ── Small helpers ──────────────────────────────────────────────────────

export const round2 = (n: number) => Math.round(n * 100) / 100;

function num(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; // rejects 2026-02-31
}

export function isIsoMonth(value: string | null | undefined): value is string {
  return !!value && ISO_MONTH.test(value);
}

const sum = (values: number[]) => round2(values.reduce((a, b) => a + b, 0));

export function pctChange(previous: number | null, current: number | null): number | null {
  if (previous === null || current === null || previous === 0) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

export function daysBetween(from: string | null, to: string | null): number | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2025-07" -> "July 2025" */
export function monthLabel(month: string): string {
  if (!isIsoMonth(month)) return month;
  return `${MONTH_NAMES[+month.slice(5, 7) - 1]} ${month.slice(0, 4)}`;
}

// ── Level 1 ────────────────────────────────────────────────────────────

/** Converts the AI's reading into the exact scored format (section 5 rules):
 *  invalid dates -> null, zero lines dropped, subsidies negative,
 *  payable_after_due_date = the highest printed late amount. */
export function toLevel1(x: BillExtraction): Level1 {
  const latest = x.late_payment_amounts.map((l) => l.amount).filter(Number.isFinite);
  const after = latest.length > 0 ? Math.max(...latest) : null;

  return {
    provider: x.provider,
    tariff: x.tariff?.trim() || null,
    sanctioned_load_kw: num(x.sanctioned_load_kw),
    bill_month: isIsoMonth(x.bill_month) ? x.bill_month : null,
    reading_date: isIsoDate(x.reading_date) ? x.reading_date : null,
    issue_date: isIsoDate(x.issue_date) ? x.issue_date : null,
    due_date: isIsoDate(x.due_date) ? x.due_date : null,
    previous_reading: num(x.previous_reading),
    current_reading: num(x.current_reading),
    units_consumed: num(x.units_consumed),
    charges: x.charges
      .filter((c) => Number.isFinite(c.amount) && c.amount !== 0)
      .map((c) => ({
        type: c.type,
        amount: c.type === "subsidy" ? -Math.abs(c.amount) : c.amount,
      })),
    total_charges: num(x.total_charges),
    taxes: x.taxes
      .filter((t) => Number.isFinite(t.amount) && t.amount !== 0)
      .map((t) => ({ type: t.type, amount: t.amount })),
    total_taxes: num(x.total_taxes),
    current_bill: num(x.current_bill),
    arrears: num(x.arrears),
    payable_within_due_date: num(x.payable_within_due_date),
    payable_after_due_date: after,
  };
}

/** A Level 1 object with every field present and null, for bills that failed. */
export function emptyLevel1(): Level1 {
  return {
    provider: null, tariff: null, sanctioned_load_kw: null, bill_month: null,
    reading_date: null, issue_date: null, due_date: null, previous_reading: null,
    current_reading: null, units_consumed: null, charges: [], total_charges: null,
    taxes: [], total_taxes: null, current_bill: null, arrears: null,
    payable_within_due_date: null, payable_after_due_date: null,
  };
}

// ── Consistency checks (shown for review, never used to "fix" printed values) ──

export type Check = { name: string; ok: boolean | null; detail: string };

const close = (a: number, b: number) => Math.abs(a - b) <= 1; // scoring tolerance is ±1

export function consistencyChecks(x: BillExtraction): Check[] {
  const checks: Check[] = [];
  const chargeSum = sum(x.charges.map((c) => c.amount));
  const taxSum = sum(x.taxes.map((t) => t.amount));

  checks.push(
    x.total_charges === null
      ? { name: "charges_subtotal", ok: null, detail: "No charges subtotal printed" }
      : { name: "charges_subtotal", ok: close(chargeSum, x.total_charges), detail: `Charge lines add up to ${chargeSum}; printed subtotal ${x.total_charges}` },
  );
  checks.push(
    x.total_taxes === null || x.taxes.length === 0
      ? { name: "taxes_subtotal", ok: null, detail: "No tax lines or subtotal to compare" }
      : { name: "taxes_subtotal", ok: close(taxSum, x.total_taxes), detail: `Tax lines add up to ${taxSum}; printed subtotal ${x.total_taxes}` },
  );
  if (x.total_charges !== null && x.total_taxes !== null && x.current_bill !== null) {
    const s = round2(x.total_charges + x.total_taxes);
    checks.push({ name: "current_bill", ok: close(s, x.current_bill), detail: `Charges + taxes = ${s}; printed current bill ${x.current_bill}` });
  }
  if (x.previous_reading !== null && x.current_reading !== null && x.units_consumed !== null) {
    const d = round2(x.current_reading - x.previous_reading);
    checks.push({ name: "meter", ok: d === x.units_consumed || (d > 0 && x.units_consumed % d === 0), detail: `Current − previous reading = ${d}; printed units ${x.units_consumed}` });
  }
  if (x.current_bill !== null && x.payable_within_due_date !== null) {
    const s = round2(x.current_bill + (x.arrears ?? 0));
    checks.push({ name: "payable", ok: Math.abs(s - x.payable_within_due_date) <= 5, detail: `Current bill + arrears = ${s}; printed payable ${x.payable_within_due_date}. A gap can come from items printed separately (e.g. Total FPA, installments, adjustments) or rounding` });
  }
  return checks;
}

// ── Facts for Level 2 (pre-computed so the model never does arithmetic) ──

export type HistoryStats = {
  months: { month: string; label: string; units: number }[];
  count: number;
  average: number;
  max: { month: string; units: number };
  min: { month: string; units: number };
  total: number;
};

function historyStats(points: { month: string; units: number }[]): HistoryStats | null {
  if (points.length === 0) return null;
  const units = points.map((p) => p.units);
  const max = points.reduce((a, b) => (b.units > a.units ? b : a));
  const min = points.reduce((a, b) => (b.units < a.units ? b : a));
  return {
    months: points.map((p) => ({ ...p, label: monthLabel(p.month) })),
    count: points.length,
    average: round2(sum(units) / points.length),
    max: { month: monthLabel(max.month), units: max.units },
    min: { month: monthLabel(min.month), units: min.units },
    total: sum(units),
  };
}

const pct = (part: number, whole: number | null) => (whole ? round2((part / whole) * 100) : null);

export function computeFacts(x: BillExtraction) {
  const level1 = toLevel1(x);
  const chargeLines = sum(x.charges.map((c) => c.amount));
  const taxLines = sum(x.taxes.map((t) => t.amount));
  const totalCharges = x.total_charges ?? (x.charges.length ? chargeLines : null);
  const totalTaxes = x.total_taxes ?? (x.taxes.length ? taxLines : null);
  const units = x.units_consumed;
  const currentBill = x.current_bill;

  const byType = <T extends { type: string; amount: number }>(lines: T[]) => {
    const out: Record<string, number> = {};
    for (const l of lines) out[l.type] = round2((out[l.type] ?? 0) + l.amount);
    return out;
  };

  // History: separate the current month (if the bars include it) from previous months.
  const history = [...x.usage_history].filter((p) => isIsoMonth(p.month) && Number.isFinite(p.units)).sort((a, b) => (a.month < b.month ? -1 : 1));
  const previous = history.filter((p) => p.month !== x.bill_month);
  const prevStats = historyStats(previous);
  const allStats = historyStats(units !== null && x.bill_month && !history.some((p) => p.month === x.bill_month) ? [...history, { month: x.bill_month, units }] : history);
  const lastMonth = previous.at(-1) ?? null;
  const sameMonthLastYear =
    isIsoMonth(x.bill_month) ? previous.find((p) => p.month === `${+x.bill_month!.slice(0, 4) - 1}${x.bill_month!.slice(4)}`) ?? null : null;

  const energyLines = x.charges.filter((c) => c.type === "energy");
  const energyTotal = sum(energyLines.map((c) => c.amount));
  const after = level1.payable_after_due_date;
  const within = x.payable_within_due_date;

  return {
    level1,
    totals: {
      charge_lines_sum: chargeLines,
      tax_lines_sum: taxLines,
      total_charges: totalCharges,
      total_taxes: totalTaxes,
      current_bill: currentBill,
      charges_by_type: byType(x.charges),
      taxes_by_type: byType(x.taxes),
      taxes_pct_of_current_bill: totalTaxes !== null ? pct(totalTaxes, currentBill) : null,
      charges_pct_of_current_bill: totalCharges !== null ? pct(totalCharges, currentBill) : null,
      tax_lines_pct_of_current_bill: x.taxes.map((t) => ({ label: t.label, amount: t.amount, pct: pct(t.amount, currentBill) })),
      charge_lines_pct_of_current_bill: x.charges.map((c) => ({ label: c.label, amount: c.amount, pct: pct(c.amount, currentBill) })),
      subsidies_and_credits: x.charges.filter((c) => c.amount < 0 || c.type === "subsidy").map((c) => ({ label: c.label, amount: c.amount })),
    },
    per_unit: {
      current_bill_per_unit: units && currentBill !== null ? round2(currentBill / units) : null,
      total_charges_per_unit: units && totalCharges !== null ? round2(totalCharges / units) : null,
      energy_charges_total: energyLines.length ? energyTotal : null,
      energy_charges_per_unit: units && energyLines.length ? round2(energyTotal / units) : null,
      payable_within_due_per_unit: units && within !== null ? round2(within / units) : null,
    },
    payment: {
      payable_within_due_date: within,
      payable_after_due_date: after,
      late_payment_extra: after !== null && within !== null ? round2(after - within) : null,
      late_payment_extra_pct: after !== null && within ? round2(((after - within) / within) * 100) : null,
      all_late_amounts: x.late_payment_amounts,
      late_payment_surcharges: x.late_payment_surcharges,
      arrears: x.arrears,
      arrears_note:
        x.arrears === null ? "Arrears not printed / blank" : x.arrears < 0 ? "Negative arrears = a credit carried forward" : x.arrears === 0 ? "No arrears" : "Unpaid previous dues are included in the payable amount",
    },
    dates: {
      bill_month: level1.bill_month,
      reading_date: level1.reading_date,
      issue_date: level1.issue_date,
      due_date: level1.due_date,
      days_issue_to_due: daysBetween(level1.issue_date, level1.due_date),
      days_reading_to_due: daysBetween(level1.reading_date, level1.due_date),
    },
    meter: {
      previous_reading: x.previous_reading,
      current_reading: x.current_reading,
      units_consumed: units,
      reading_difference:
        x.previous_reading !== null && x.current_reading !== null ? round2(x.current_reading - x.previous_reading) : null,
      sanctioned_load_kw: x.sanctioned_load_kw,
      mdi_kw: x.mdi_kw,
    },
    history: {
      previous_months: prevStats,
      including_current_month: allStats,
      current_vs_previous_average_pct: prevStats && units !== null ? pctChange(prevStats.average, units) : null,
      current_minus_previous_average: prevStats && units !== null ? round2(units - prevStats.average) : null,
      last_month: lastMonth ? { month: monthLabel(lastMonth.month), units: lastMonth.units } : null,
      current_vs_last_month_pct: lastMonth && units !== null ? pctChange(lastMonth.units, units) : null,
      same_month_last_year: sameMonthLastYear ? { month: monthLabel(sameMonthLastYear.month), units: sameMonthLastYear.units } : null,
      current_vs_same_month_last_year_pct: sameMonthLastYear && units !== null ? pctChange(sameMonthLastYear.units, units) : null,
      payment_history: x.payment_history,
      average_billed_amount_in_payment_history: x.payment_history.some((p) => p.billed_amount !== null)
        ? round2(sum(x.payment_history.flatMap((p) => (p.billed_amount === null ? [] : [p.billed_amount]))) / x.payment_history.filter((p) => p.billed_amount !== null).length)
        : null,
    },
    checks: consistencyChecks(x),
  };
}
export type BillFacts = ReturnType<typeof computeFacts>;

/** Months in the history above a threshold — exposed for tests and the UI. */
export function monthsAbove(stats: HistoryStats | null, threshold: number) {
  return stats ? stats.months.filter((m) => m.units > threshold) : [];
}

/** Thresholds (step 50) that fall inside the history's range, with counts above each. */
export function thresholdCounts(stats: HistoryStats | null) {
  if (!stats) return [];
  const lo = Math.max(50, Math.floor(stats.min.units / 50) * 50);
  const hi = Math.ceil(stats.max.units / 50) * 50;
  const out: { threshold: number; above: { label: string; units: number }[]; atOrBelow: number }[] = [];
  for (let t = lo; t <= hi && out.length < 30; t += 50) {
    const above = stats.months.filter((m) => m.units > t).map((m) => ({ label: m.label, units: m.units }));
    out.push({ threshold: t, above, atOrBelow: stats.count - above.length });
  }
  return out;
}

/** Key figures as plain sentences: models follow prose more reliably than nested JSON. */
export function factsText(x: BillExtraction, f: BillFacts): string {
  const lines: string[] = [];
  const v = (n: number | string | null, unit = "") => (n === null ? "not shown on the bill" : `${n}${unit}`);
  lines.push(`Units consumed this month (${f.dates.bill_month ?? "bill month not shown"}): ${v(x.units_consumed)}`);
  lines.push(`Current bill (this month's charges + taxes): ${v(x.current_bill)}`);
  lines.push(`Total electricity charges: ${v(f.totals.total_charges)}; total taxes: ${v(f.totals.total_taxes)}`);
  lines.push(`Taxes as % of current bill: ${v(f.totals.taxes_pct_of_current_bill, "%")}; charges as % of current bill: ${v(f.totals.charges_pct_of_current_bill, "%")}`);
  lines.push(`Arrears / previous dues: ${v(x.arrears)} (${f.payment.arrears_note})`);
  lines.push(`Payable within due date (${v(f.dates.due_date)}): ${v(x.payable_within_due_date)}; highest payable after due date: ${v(f.payment.payable_after_due_date)}; extra if paid late: ${v(f.payment.late_payment_extra)} (${v(f.payment.late_payment_extra_pct, "%")})`);
  if (x.payable_within_due_date !== null && x.current_bill !== null) {
    const gap = round2(x.payable_within_due_date - x.current_bill);
    const rest = round2(gap - (x.arrears ?? 0));
    lines.push(`Payable within due date − current bill = ${gap}; of this, arrears/previous dues account for ${x.arrears ?? 0}, leaving ${rest} (rounding of the payable amount, or items printed separately such as FPA, installments or adjustments)`);
  }
  lines.push(`Cost per unit = current bill ÷ units: ${v(f.per_unit.current_bill_per_unit)}; energy charges only ÷ units: ${v(f.per_unit.energy_charges_per_unit)}; payable within due date ÷ units: ${v(f.per_unit.payable_within_due_per_unit)}`);
  lines.push(`Meter: previous ${v(x.previous_reading)}, current ${v(x.current_reading)}, difference ${v(f.meter.reading_difference)}`);
  const prev = f.history.previous_months;
  const all = f.history.including_current_month;
  if (prev) {
    lines.push(`Usage history, previous ${prev.count} months (current month excluded): ${prev.months.map((m) => `${m.label}: ${m.units}`).join(", ")}`);
    lines.push(`Previous months: average ${prev.average}, total ${prev.total}, highest ${prev.max.month} (${prev.max.units}), lowest ${prev.min.month} (${prev.min.units})`);
    lines.push(`This month vs previous-months average: ${v(f.history.current_minus_previous_average)} units (${v(f.history.current_vs_previous_average_pct, "%")})`);
    if (f.history.last_month) lines.push(`Last month ${f.history.last_month.month}: ${f.history.last_month.units} units; change to this month ${v(f.history.current_vs_last_month_pct, "%")}`);
    if (f.history.same_month_last_year) lines.push(`Same month last year ${f.history.same_month_last_year.month}: ${f.history.same_month_last_year.units} units; change ${v(f.history.current_vs_same_month_last_year_pct, "%")}`);
    for (const t of thresholdCounts(prev)) {
      lines.push(`Previous months above ${t.threshold} units: ${t.above.length}${t.above.length ? ` (${t.above.map((m) => `${m.label} ${m.units}`).join(", ")})` : ""}`);
    }
  } else {
    lines.push("Usage history: not shown or unreadable on this bill.");
  }
  if (all && prev && all.count !== prev.count) {
    lines.push(`Including the current month (${all.count} months): average ${all.average}, total ${all.total}`);
  }
  return lines.join("\n");
}

/** Question-specific numbers computed in code, e.g. for "How many months were above 200 units?"
 *  the exact count and months for 200 are attached to that question. */
export function questionHints(question: string, x: BillExtraction, f: BillFacts): string[] {
  const hints: string[] = [];
  const prev = f.history.previous_months;
  const all = f.history.including_current_month;
  // Numbers followed by "unit"/"kwh" or near above/below wording.
  const thresholds = [...question.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:units?|kwh)/gi)].map((m) => Number(m[1].replace(/,/g, "")));
  if (/(above|over|more than|exceed|greater|higher than|below|under|less than|lower than|at least)/i.test(question)) {
    for (const m of question.matchAll(/(\d[\d,]*(?:\.\d+)?)/g)) {
      const n = Number(m[1].replace(/,/g, ""));
      if (n >= 10 && n < 100000 && !(n >= 1900 && n <= 2100)) thresholds.push(n);
    }
  }
  // "If I use 20% more/less units..." -> proportional scenario computed in code.
  for (const m of question.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi)) {
    const p = Number(m[1]);
    const down = /(less|fewer|reduce|lower|decrease|cut|save|drop)/i.test(question);
    const factor = down ? 1 - p / 100 : 1 + p / 100;
    if (x.units_consumed !== null) {
      const units = round2(x.units_consumed * factor);
      const parts = [`ESTIMATE for ${down ? "-" : "+"}${p}% units: ${x.units_consumed} × ${factor} = ${units} units`];
      if (x.current_bill !== null) parts.push(`proportional bill estimate = current bill ${x.current_bill} × ${factor} = ${round2(x.current_bill * factor)} (assumes every charge and tax scales with units; real bills have fixed charges and slab rates, so treat as rough)`);
      if (f.per_unit.current_bill_per_unit !== null) parts.push(`same per-unit cost ${f.per_unit.current_bill_per_unit} × ${units} = ${round2(f.per_unit.current_bill_per_unit * units)}`);
      hints.push(parts.join("; "));
    }
  }
  for (const t of [...new Set(thresholds)]) {
    for (const [name, stats] of [["previous months (current month excluded)", prev], ["all months including the current month", all]] as const) {
      if (!stats) continue;
      const above = stats.months.filter((mo) => mo.units > t);
      const atLeast = stats.months.filter((mo) => mo.units >= t);
      const below = stats.months.filter((mo) => mo.units < t);
      hints.push(
        `${name}, ${stats.count} months: above ${t} units: ${above.length}${above.length ? ` (${above.map((mo) => `${mo.label} ${mo.units}`).join(", ")})` : ""}; ` +
          `${t} or more: ${atLeast.length}; below ${t}: ${below.length}`,
      );
    }
    if (x.units_consumed !== null) hints.push(`current month ${f.dates.bill_month ?? ""}: ${x.units_consumed} units (${x.units_consumed > t ? "above" : x.units_consumed === t ? "equal to" : "not above"} ${t})`);
  }
  return hints;
}
