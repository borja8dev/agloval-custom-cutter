import { z } from 'zod';

/** Single { width, height } piece, in cm. */
const PieceSchema = z.object({
  width: z.number().positive('Width must be positive').finite('Width must be finite'),
  height: z.number().positive('Height must be positive').finite('Height must be finite'),
});

/**
 * Validates an incoming calculation request body.
 *
 * productId uses z.cuid() (classic CUID v1) because backend/prisma/schema.prisma
 * generates IDs via the plain `@default(cuid())` — not z.cuid2().
 */
export const CalculationRequestSchema = z.object({
  productId: z.cuid(),
  requestedPieces: z
    .array(PieceSchema)
    .min(1, 'At least one piece must be provided')
    .max(100, 'Maximum 100 pieces per calculation'),
  userId: z.string().optional().nullable(),
  metadata: z
    .object({
      source: z.enum(['web', 'mobile', 'api']).optional(),
      userEmail: z.email().optional(),
    })
    .optional(),
});

export type CalculationRequestInput = z.infer<typeof CalculationRequestSchema>;

export function validateCalculationRequest(input: unknown): {
  success: boolean;
  data?: CalculationRequestInput;
  errors?: Record<string, string[] | undefined>;
} {
  const result = CalculationRequestSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      errors: z.flattenError(result.error).fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
