const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-ES");

const percentFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function formatEuro(value: number): string {
  return euroFormatter.format(Math.round(value));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

export function formatKm(value: number): string {
  return `${formatNumber(value)} km`;
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

export function formatSignedEuro(value: number): string {
  const formatted = formatEuro(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function currentYear(): number {
  return new Date().getFullYear();
}
