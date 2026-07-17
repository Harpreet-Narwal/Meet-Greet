const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹4,990 — Indian digit grouping, no paise. */
export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}
