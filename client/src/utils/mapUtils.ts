export const CHOROPLETH_STEPS = ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a20"];

export function amountToColor(amount: number, max: number): string {
  const t = Math.sqrt(amount / max);
  const last = CHOROPLETH_STEPS.length - 1;
  return CHOROPLETH_STEPS[Math.min(Math.floor(t * last), last - 1)];
}

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}
