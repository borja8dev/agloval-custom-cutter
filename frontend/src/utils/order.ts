import type {
  CatalogProduct,
  OrderBoardLine,
  OrderLine,
  OrderPiece,
  QuoteLineRequest,
  QuoteRequest
} from '../types';

let lineCounter = 0;

// Local, session-unique id for a line (never sent to the API).
export function createLineId(): string {
  lineCounter += 1;
  return `line_${Date.now().toString(36)}_${lineCounter}`;
}

export function isBoardLine(line: OrderLine): line is OrderBoardLine {
  return 'pieces' in line;
}

function samePiece(a: OrderPiece, b: OrderPiece): boolean {
  return a.width === b.width && a.height === b.height;
}

// Adds a piece to a list, merging it with an identical one (same size).
function mergePiece(pieces: OrderPiece[], piece: OrderPiece): OrderPiece[] {
  const index = pieces.findIndex((p) => samePiece(p, piece));
  if (index === -1) {
    return [...pieces, piece];
  }
  return pieces.map((p, i) =>
    i === index ? { ...p, quantity: p.quantity + piece.quantity } : p
  );
}

export function addPiece(
  lines: OrderLine[],
  product: CatalogProduct,
  piece: OrderPiece,
  genId: () => string = createLineId
): OrderLine[] {
  const existing = lines.find((l) => l.product.id === product.id && isBoardLine(l));
  if (!existing || !isBoardLine(existing)) {
    return [...lines, { id: genId(), product, pieces: [{ ...piece }] }];
  }
  return lines.map((l) =>
    l.id === existing.id && isBoardLine(l)
      ? { ...l, pieces: mergePiece(l.pieces, { ...piece }) }
      : l
  );
}

export function addQuantity(
  lines: OrderLine[],
  product: CatalogProduct,
  quantity: number,
  genId: () => string = createLineId
): OrderLine[] {
  const existing = lines.find((l) => l.product.id === product.id && !isBoardLine(l));
  if (!existing) {
    return [...lines, { id: genId(), product, quantity }];
  }
  return lines.map((l) =>
    l.id === existing.id && !isBoardLine(l) ? { ...l, quantity: l.quantity + quantity } : l
  );
}

// Replaces the piece at `index`; if it becomes equal to another piece, they merge.
export function updatePiece(
  lines: OrderLine[],
  lineId: string,
  index: number,
  piece: OrderPiece
): OrderLine[] {
  return lines.map((l) => {
    if (l.id !== lineId || !isBoardLine(l) || index < 0 || index >= l.pieces.length) {
      return l;
    }
    const others = l.pieces.filter((_, i) => i !== index);
    const merged = mergePiece(others, { ...piece });
    // Keep the edited piece in place when it did not merge with another one.
    const pieces =
      merged.length === l.pieces.length
        ? l.pieces.map((p, i) => (i === index ? { ...piece } : p))
        : merged;
    return { ...l, pieces };
  });
}

export function removePiece(lines: OrderLine[], lineId: string, index: number): OrderLine[] {
  return lines.flatMap((l) => {
    if (l.id !== lineId || !isBoardLine(l)) return [l];
    const pieces = l.pieces.filter((_, i) => i !== index);
    return pieces.length === 0 ? [] : [{ ...l, pieces }];
  });
}

export function updateQuantity(lines: OrderLine[], lineId: string, quantity: number): OrderLine[] {
  return lines.flatMap((l) => {
    if (l.id !== lineId || isBoardLine(l)) return [l];
    return quantity > 0 ? [{ ...l, quantity }] : [];
  });
}

export function removeLine(lines: OrderLine[], lineId: string): OrderLine[] {
  return lines.filter((l) => l.id !== lineId);
}

// How many items of each product are already in the order.
export function countsByProduct(lines: OrderLine[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of lines) {
    const amount = isBoardLine(line)
      ? line.pieces.reduce((sum, p) => sum + p.quantity, 0)
      : line.quantity;
    counts[line.product.id] = (counts[line.product.id] ?? 0) + amount;
  }
  return counts;
}

export function toQuoteRequest(lines: OrderLine[]): QuoteRequest {
  return {
    lines: lines.map((line): QuoteLineRequest =>
      isBoardLine(line)
        ? {
            productId: line.product.id,
            pieces: line.pieces.map((p) => ({
              width: p.width,
              height: p.height,
              quantity: p.quantity
            }))
          }
        : { productId: line.product.id, quantity: line.quantity }
    )
  };
}
