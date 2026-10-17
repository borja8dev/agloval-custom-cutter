// Helpers to work with the Spanish-formatted amounts shown in the UI ("1.234" is never used: "1234,50").

// "87,04" -> 8704 (integer cents, so sums and products stay exact).
export const parseCents = (text: string): number => {
  const match = text.match(/(\d+),(\d{2})/)
  if (!match) throw new Error(`No amount found in "${text}"`)
  return Number(match[1]) * 100 + Number(match[2])
}

// 8704 -> "87,04"
export const formatCents = (cents: number): string =>
  `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`

// Price of the group billed by used area: used m2 x price per m2, rounded once to cents.
export const areaPriceCents = (areaM2: number, pricePerM2Cents: number): number =>
  Math.round(areaM2 * pricePerM2Cents)

// Amount after the "=" sign of a quote group, e.g. "16,00 m² x 5,44 EUR/m² = 87,04 EUR".
export const groupPriceCents = (groupText: string): number => {
  const match = groupText.match(/=\s*(\d+,\d{2}) EUR/)
  if (!match) throw new Error(`No group price found in "${groupText}"`)
  return parseCents(match[1])
}
