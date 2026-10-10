"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { BillFacts } from "../calc";
import { CHARGE_EXPLAINERS, CHARGE_LABELS, date, number, pkr } from "../format";
import type { BillExtraction } from "../schema";

type Props = { extraction: BillExtraction; facts: BillFacts };

export function BillReport({ extraction, facts }: Props) {
  return (
    <div className="space-y-5">
      <AtAGlance extraction={extraction} facts={facts} />
      <MoneyBreakdown extraction={extraction} facts={facts} />
      <UsageHistory facts={facts} />
      <ThingsToKnow extraction={extraction} facts={facts} />
      <Level1Json facts={facts} />
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

// ── A. Bill at a glance ────────────────────────────────────────────────
function AtAGlance({ extraction: x, facts }: Props) {
  const stats = [
    { label: "Current bill", value: pkr(x.current_bill) },
    { label: "Units used", value: x.units_consumed === null ? "Not shown" : `${number(x.units_consumed)} units` },
    { label: "Previous dues", value: pkr(x.arrears, "None shown"), hint: facts.payment.arrears !== null && facts.payment.arrears < 0 ? "Credit carried forward" : undefined },
    { label: "After due date", value: pkr(facts.payment.payable_after_due_date, "Not shown"), hint: facts.payment.late_payment_extra ? `+${pkr(facts.payment.late_payment_extra)} if late` : undefined },
  ];
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Pay by {date(x.due_date)}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-ink tabular-nums">{pkr(x.payable_within_due_date)}</p>
          <p className="mt-1 text-sm text-muted">
            {x.provider ?? "Provider not shown"} · {date(x.bill_month)} bill · Tariff {x.tariff ?? "not shown"}
          </p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">Electricity</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs font-medium text-muted">{s.label}</dt>
            <dd className="mt-1 text-base font-semibold text-ink tabular-nums">{s.value}</dd>
            {s.hint && <dd className="text-xs text-muted">{s.hint}</dd>}
          </div>
        ))}
      </dl>
    </Card>
  );
}

// ── B. Where is your money going? ──────────────────────────────────────
function MoneyBreakdown({ extraction: x, facts }: Props) {
  const rows = [
    ...x.charges.map((c) => ({ ...c, group: "Charge" as const })),
    ...x.taxes.map((t) => ({ ...t, units: null, rate: null, group: "Tax" as const })),
  ];
  const positive = rows.filter((r) => r.amount > 0);
  const max = Math.max(1, ...positive.map((r) => r.amount));
  const credits = rows.filter((r) => r.amount < 0);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Card className="p-5">
      <SectionTitle hint="Every line as printed on your bill. Tap a line to see what it means.">Where is your money going?</SectionTitle>

      {positive.length === 0 ? (
        <p className="text-sm text-muted">No itemised lines could be read from this bill.</p>
      ) : (
        <ul className="space-y-1">
          {positive.map((r, i) => (
            <li key={`${r.label}-${i}`}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="w-full rounded-lg px-2 py-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink">
                    {r.label}
                    <span className="ml-2 text-xs text-muted">{r.group === "Tax" ? "Tax" : CHARGE_LABELS[r.type]}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink tabular-nums">{pkr(r.amount)}</span>
                </div>
                {/* Thin bar: length = share of the largest line */}
                <div className="mt-1.5 h-2 rounded-full bg-surface-2" aria-hidden="true">
                  <div
                    className={r.group === "Tax" ? "h-2 rounded-full bg-accent" : "h-2 rounded-full bg-brand"}
                    style={{ width: `${Math.max(2, (r.amount / max) * 100)}%` }}
                  />
                </div>
              </button>
              {open === i && (
                <p className="mx-2 mb-2 rounded-lg bg-brand-soft p-3 text-sm text-ink">
                  {CHARGE_EXPLAINERS[r.type]}
                  {r.units !== null && r.rate !== null && (
                    <span className="mt-1 block text-xs text-muted">
                      On the bill: {number(r.units)} units × {number(r.rate)} = {pkr(r.amount)}
                    </span>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {credits.length > 0 && (
        <div className="mt-4 rounded-xl border border-good/30 bg-good-soft p-3 text-sm">
          <p className="font-medium text-ink">Reductions on this bill</p>
          <ul className="mt-1 space-y-0.5">
            {credits.map((c, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{c.label}</span>
                <span className="font-semibold tabular-nums">{pkr(c.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Electricity charges</dt>
          <dd className="font-semibold tabular-nums">{pkr(facts.totals.total_charges)}</dd>
        </div>
        <div>
          <dt className="text-muted">Taxes &amp; duties</dt>
          <dd className="font-semibold tabular-nums">
            {pkr(facts.totals.total_taxes)}
            {facts.totals.taxes_pct_of_current_bill !== null && <span className="ml-1 font-normal text-muted">({facts.totals.taxes_pct_of_current_bill}% of current bill)</span>}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Cost per unit</dt>
          <dd className="font-semibold tabular-nums">{facts.per_unit.current_bill_per_unit === null ? "Not available" : `${pkr(facts.per_unit.current_bill_per_unit)} / unit`}</dd>
        </div>
      </dl>
    </Card>
  );
}

// ── C. Usage history ───────────────────────────────────────────────────
function UsageHistory({ facts }: { facts: BillFacts }) {
  const all = facts.history.including_current_month;
  const prev = facts.history.previous_months;
  if (!all || all.count < 2) {
    return (
      <Card className="p-5">
        <SectionTitle>Has my usage changed?</SectionTitle>
        <p className="text-sm text-muted">This bill doesn&apos;t show a readable usage history, so we can&apos;t compare months. Upload a bill with a history table to see trends.</p>
      </Card>
    );
  }
  const max = Math.max(1, ...all.months.map((m) => Math.abs(m.units)));
  const current = all.months.at(-1)!;
  const change = facts.history.current_vs_previous_average_pct;

  return (
    <Card className="p-5">
      <SectionTitle hint="Units per month, from the history printed on your bill.">Has my usage changed?</SectionTitle>
      <p className="mb-4 text-sm text-ink">
        This month: <strong>{number(current.units)} units</strong>.
        {prev && change !== null && (
          <>
            {" "}That is <strong>{Math.abs(change)}% {change >= 0 ? "higher" : "lower"}</strong> than your average of {number(prev.average)} units over the previous {prev.count} months.
          </>
        )}
      </p>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Monthly units: ${all.months.map((m) => `${m.label} ${m.units}`).join(", ")}`}>
        {all.months.map((m, i) => {
          const isCurrent = i === all.months.length - 1;
          return (
            <div key={m.month} className="group relative flex h-full flex-1 flex-col justify-end">
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-xs text-white group-hover:block">
                {m.label}: {m.units}
              </span>
              <div
                className={isCurrent ? "rounded-t bg-brand" : "rounded-t bg-slate-300"}
                style={{ height: `${Math.max(3, (Math.abs(m.units) / max) * 100)}%` }}
              />
              <span className="mt-1 text-center text-[10px] text-muted">{m.label.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
      {prev && (
        <p className="mt-3 text-xs text-muted">
          Highest: {prev.max.month} ({prev.max.units} units) · Lowest: {prev.min.month} ({prev.min.units} units)
        </p>
      )}
    </Card>
  );
}

// ── D. Important things to know ────────────────────────────────────────
function ThingsToKnow({ extraction: x, facts }: Props) {
  const items: { tone: "info" | "caution"; text: string }[] = [];
  if (facts.payment.late_payment_extra && facts.payment.late_payment_extra > 0) {
    items.push({ tone: "caution", text: `Paying after ${date(x.due_date)} adds ${pkr(facts.payment.late_payment_extra)} (${facts.payment.late_payment_extra_pct}%) as a late payment surcharge.` });
  }
  if (x.arrears !== null && x.arrears > 0) {
    items.push({ tone: "caution", text: `This bill includes ${pkr(x.arrears)} of unpaid previous dues. Check your last payment receipt if you believe it was paid.` });
  }
  if (x.arrears !== null && x.arrears < 0) {
    items.push({ tone: "info", text: `You have a credit of ${pkr(Math.abs(x.arrears))} carried forward from previous bills.` });
  }
  for (const c of facts.checks) {
    if (c.ok === false) items.push({ tone: "caution", text: `Please double-check: ${c.detail}. This may be a reading error by the AI, so compare it with your paper bill.` });
  }
  if (x.unreadable_fields.length) {
    items.push({ tone: "info", text: `Some details were hidden or unreadable: ${x.unreadable_fields.join(", ")}. We left them empty instead of guessing.` });
  }
  for (const f of x.other_printed_facts.slice(0, 4)) items.push({ tone: "info", text: `${f.label}: ${f.value}` });

  return (
    <Card className="p-5">
      <SectionTitle>Important things to know</SectionTitle>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing unusual found. The printed totals add up.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className={item.tone === "caution" ? "rounded-xl border border-caution/30 bg-caution-soft p-3 text-sm text-ink" : "rounded-xl bg-surface-2 p-3 text-sm text-ink"}>
              <span className="mr-1.5 font-semibold">{item.tone === "caution" ? "⚠ Check" : "ℹ Note"}</span>
              {item.text}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-4 space-y-1 text-xs text-muted">
        {facts.checks.filter((c) => c.ok === true).map((c) => (
          <li key={c.name}>✓ {c.detail}</li>
        ))}
      </ul>
    </Card>
  );
}

// ── E. The scored Level 1 JSON ─────────────────────────────────────────
function Level1Json({ facts }: { facts: BillFacts }) {
  const json = JSON.stringify(facts.level1, null, 2);
  const [copied, setCopied] = useState(false);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle hint="The structured extraction (no personal identifiers).">Extracted data (Level 1 JSON)</SectionTitle>
        <Button
          variant="secondary"
          className="shrink-0 px-3 py-1.5 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? "Copied!" : "Copy JSON"}
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-xl bg-ink p-4 font-mono text-xs leading-relaxed text-slate-100">{json}</pre>
    </Card>
  );
}
