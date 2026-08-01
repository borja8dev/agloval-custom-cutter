/**
 * Input contract: what the client sends.
 *
 * MIGRATION: Changing this DTO requires an API + frontend migration.
 * If Agloval's real BD has different field names, map them at the
 * infrastructure boundary, not here.
 */
export interface CalculationRequestDTO {
  /** Product ID (from catalog). Must exist in the database. */
  productId: string;

  /** Pieces to calculate. Units: cm. */
  requestedPieces: Array<{
    width: number;
    height: number;
  }>;

  /** User ID if authenticated. Absent/null: treat as a guest calculation. */
  userId?: string | null;

  /** Optional metadata for tracking. */
  metadata?: {
    source?: string; // "web", "mobile", "api"
    userEmail?: string;
  };
}
