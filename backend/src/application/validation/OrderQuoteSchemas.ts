import { z } from 'zod';
import { PieceSchema } from './CalculationSchemas';

/** A piece plus how many identical copies of it the order needs. */
const OrderPieceSchema = PieceSchema.extend({
  quantity: z
    .number()
    .int('Piece quantity must be an integer')
    .min(1, 'Piece quantity must be at least 1')
    .max(10000, 'Piece quantity cannot exceed 10000')
    .default(1),
});

/**
 * Shape only: whether a line needs `pieces` or `quantity` depends on the
 * product's unit and is checked by the use case once the product is loaded.
 */
export const OrderLineSchema = z
  .object({
    productId: z.cuid(),
    pieces: z
      .array(OrderPieceSchema)
      .min(1, 'At least one piece must be provided')
      .max(200, 'Maximum 200 pieces per line')
      .optional(),
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(100000, 'Quantity cannot exceed 100000')
      .optional(),
  })
  .refine((line) => (line.pieces === undefined) !== (line.quantity === undefined), {
    message: 'A line needs either pieces (M2 products) or quantity (UD and ML products), not both',
  });

export const OrderQuoteRequestSchema = z.object({
  lines: z
    .array(OrderLineSchema)
    .min(1, 'At least one line must be provided')
    .max(100, 'Maximum 100 lines per order'),
});

export type OrderQuoteRequestInput = z.infer<typeof OrderQuoteRequestSchema>;
