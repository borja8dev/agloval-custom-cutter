import { z } from 'zod';

/** An empty value (`?family=`) means "no filter", same as omitting the param. */
const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

/**
 * Optional filters shared by GET /api/products and GET /api/products/search.
 * An unknown family code is not an error (it matches nothing); an unknown
 * unit is. limit/skip/q keep their lenient handling in the controller.
 */
export const ProductFilterQuerySchema = z.object({
  family: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  unit: z.preprocess(emptyToUndefined, z.enum(['UD', 'M2', 'ML']).optional()),
});

export type ProductFilterQuery = z.infer<typeof ProductFilterQuerySchema>;
