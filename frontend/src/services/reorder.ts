import type { CatalogProduct, OrderHistoryEntry, OrderLine } from '../types';
import { getProduct } from './api';
import { createLineId } from '../utils/order';

type FetchProduct = (id: string) => Promise<CatalogProduct>;

export interface ReorderResult {
  lines: OrderLine[];
  // Snapshot names of the products that no longer exist (or changed unit).
  missing: string[];
}

// Rebuilds the order lines of a past order with the CURRENT products, so the
// next quote uses current prices.
export async function reorderFromHistory(
  entry: OrderHistoryEntry,
  fetchProduct: FetchProduct = (id) => getProduct<CatalogProduct>(id)
): Promise<ReorderResult> {
  const ids = [...new Set(entry.lines.map((l) => l.productId))];
  const fetched = await Promise.all(
    ids.map((id) => fetchProduct(id).catch(() => null))
  );
  const products = new Map(ids.map((id, i) => [id, fetched[i]]));

  const lines: OrderLine[] = [];
  const missing: string[] = [];

  for (const saved of entry.lines) {
    const product = products.get(saved.productId);
    if (!product || product.unit !== saved.unit) {
      missing.push(saved.name);
    } else if (saved.pieces) {
      lines.push({ id: createLineId(), product, pieces: saved.pieces.map((p) => ({ ...p })) });
    } else {
      lines.push({ id: createLineId(), product, quantity: saved.quantity ?? 1 });
    }
  }

  return { lines, missing };
}
