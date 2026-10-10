import type { BillExtraction } from "./schema";

// The guide's worked example (training bill KESC_0008, section 5.5-5.7 and 6.2).
// Used for AI_MOCK=true and as the offline demo bill in the UI.
// Values copied from the published correct JSON and the printed history on that bill.
export const SAMPLE_EXTRACTION: BillExtraction = {
  provider: "KE",
  tariff: "A1-R",
  sanctioned_load_kw: 3,
  connected_load_kw: 3,
  bill_month: "2026-04",
  reading_date: "2026-04-03",
  issue_date: "2026-04-07",
  due_date: "2026-04-21",
  previous_reading: 8819,
  current_reading: 8970,
  units_consumed: 151,
  mdi_kw: null,
  charges: [
    { label: "Fixed Charges", type: "fixed", amount: 900, units: 3, rate: 300 },
    { label: "Variable Upto 100 Units (Protected)", type: "energy", amount: 1054, units: 100, rate: 10.54 },
    { label: "Variable Upto 200 Units (Protected)", type: "energy", amount: 663.51, units: 51, rate: 13.01 },
    { label: "Uniform Quarterly Adjustment", type: "quarterly_adjustment", amount: 52.91, units: 151, rate: 0.3504 },
    { label: "FCA Feb-26", type: "fpa", amount: 125.27, units: 88, rate: 1.4235 },
    { label: "Additional Surcharge (PHL)", type: "surcharge", amount: 64.93, units: 151, rate: 0.43 },
  ],
  total_charges: 2860.62,
  taxes: [
    { label: "Electricity Duty", type: "electricity_duty", amount: 29.41 },
    { label: "Sales Tax u/s 3(1)", type: "gst", amount: 520.21 },
    { label: "MUCT (KMC)", type: "municipal_tax", amount: 20 },
  ],
  total_taxes: 569.62,
  current_bill: 3430.24,
  arrears: -0.53,
  payable_within_due_date: 3430,
  late_payment_amounts: [
    { label: "Amount Payable from 22-Apr - 24-Apr with 5% LPS", amount: 3574 },
    { label: "Amount Payable after 24-Apr-26 with 10% LPS", amount: 3716 },
  ],
  late_payment_surcharges: [
    { label: "Late Payment Surcharge (5%)", amount: 143.03 },
    { label: "Late Payment Surcharge (10%)", amount: 286.06 },
  ],
  usage_history: [
    { month: "2025-04", units: 141 }, { month: "2025-05", units: 138 }, { month: "2025-06", units: 197 },
    { month: "2025-07", units: 239 }, { month: "2025-08", units: 203 }, { month: "2025-09", units: 179 },
    { month: "2025-10", units: 173 }, { month: "2025-11", units: 187 }, { month: "2025-12", units: 124 },
    { month: "2026-01", units: 96 }, { month: "2026-02", units: 88 }, { month: "2026-03", units: 115 },
    { month: "2026-04", units: 151 },
  ],
  payment_history: [
    { month: "2026-01", billed_amount: 2780.55, paid_amount: 2780, paid_date: "2026-01-15" },
    { month: "2026-02", billed_amount: 2782.51, paid_amount: 2783, paid_date: "2026-02-19" },
    { month: "2026-03", billed_amount: 2577.31, paid_amount: 2577, paid_date: "2026-03-16" },
  ],
  other_printed_facts: [
    { label: "Energy charges share", value: "83.39% (PKR 2,860.62)" },
    { label: "Taxes and duties share", value: "16.61% (PKR 569.62)" },
    { label: "No. of Month(s)", value: "1" },
    { label: "Message", value: "FCA of XWDISCOs is also being charged to KE consumers as part of Uniform FCA starting from the month of Jun 25" },
  ],
  unreadable_fields: [],
};
