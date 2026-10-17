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

// Boards are bought whole: boards = ceil(used / board area) (minimum 1, same 1e-9 tolerance as the backend),
// price per board = board area x price per m2 rounded to cents, total = boards x price per board.
// Areas are passed in integer cm2 so no float noise creeps in.
export const wholeBoardsPrice = (
  usedAreaCm2: number,
  boardWidthCm: number,
  boardHeightCm: number,
  pricePerM2Cents: number
): { boards: number; pricePerBoardCents: number; totalCents: number } => {
  const boardAreaCm2 = boardWidthCm * boardHeightCm
  const boards = Math.max(1, Math.ceil(usedAreaCm2 / boardAreaCm2 - 1e-9))
  const pricePerBoardCents = Math.round((boardAreaCm2 * pricePerM2Cents) / 10000)
  return { boards, pricePerBoardCents, totalCents: boards * pricePerBoardCents }
}

// Amount after the "=" sign of a quote group, e.g. "3 tableros x 85,94 EUR = 257,82 EUR".
export const groupPriceCents = (groupText: string): number => {
  const match = groupText.match(/=\s*(\d+,\d{2}) EUR/)
  if (!match) throw new Error(`No group price found in "${groupText}"`)
  return parseCents(match[1])
}
