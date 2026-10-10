// Display formatting shared by the UI (pure, no React).

const pkrFormat = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 });

/** 3430.24 -> "PKR 3,430.24"; -0.53 -> "PKR -0.53"; null -> "Not shown" */
export function pkr(value: number | null | undefined, empty = "Not shown") {
  return value === null || value === undefined ? empty : `PKR ${pkrFormat.format(value)}`;
}

export function number(value: number | null | undefined, empty = "Not shown") {
  return value === null || value === undefined ? empty : pkrFormat.format(value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-04-21" -> "21 Apr 2026"; "2026-04" -> "Apr 2026" */
export function date(value: string | null | undefined, empty = "Not shown") {
  if (!value) return empty;
  const [y, m, d] = value.split("-");
  const month = MONTHS[Number(m) - 1];
  if (!month) return value;
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
}

export const CHARGE_LABELS: Record<string, string> = {
  energy: "Energy (units used)",
  fixed: "Fixed charges",
  fpa: "Fuel price adjustment (FPA)",
  quarterly_adjustment: "Quarterly adjustment (QTA)",
  surcharge: "Surcharge",
  meter_rent: "Meter rent",
  subsidy: "Subsidy",
  other: "Other charge",
  gst: "Sales tax (GST)",
  electricity_duty: "Electricity duty",
  income_tax: "Income tax",
  municipal_tax: "Municipal tax",
  other_tax: "Other tax",
};

/** Plain-language one-liners for each charge/tax type (general meaning, not official rates). */
export const CHARGE_EXPLAINERS: Record<string, string> = {
  energy: "The cost of the electricity units you used this month. Higher usage usually means a higher rate slab.",
  fixed: "A fixed monthly amount based on your connection/sanctioned load, charged even if you use few units.",
  fpa: "Fuel price adjustment: a change passed on when the actual cost of fuel used to generate power differed from the reference cost for an earlier month.",
  quarterly_adjustment: "Quarterly tariff adjustment: a periodic correction to the tariff, applied per unit. It can be positive or a credit.",
  surcharge: "An additional per-unit surcharge added on top of the tariff.",
  meter_rent: "A monthly rent for the meter or service.",
  subsidy: "A government subsidy or relief that reduces your bill.",
  other: "A charge that doesn't fit the standard categories; check its label on the bill.",
  gst: "General sales tax charged on your electricity charges.",
  electricity_duty: "A provincial duty charged on electricity use.",
  income_tax: "Advance income tax collected through the bill (usually when the bill is large or you are not on the tax filer list).",
  municipal_tax: "A local/municipal charge collected through the electricity bill.",
  other_tax: "Another government tax or fee, such as extra tax, further tax or the TV fee.",
};
