import { z } from 'zod';
import {
  CustomerSchema,
  DocumentNumberSchema,
  PrivacyAcceptedSchema,
  ReferenceSchema,
  SubmissionLinesSchema,
} from './SubmissionSchemas';

/** POST /api/orders/submit: the order lines plus who is asking for it. */
export const OrderSubmitRequestSchema = z.object({
  orderNumber: DocumentNumberSchema,
  customer: CustomerSchema,
  reference: ReferenceSchema,
  /** Set when the order comes from a saved quote ("Pasar a pedido"). */
  fromQuoteNumber: DocumentNumberSchema.optional(),
  privacyAccepted: PrivacyAcceptedSchema,
  lines: SubmissionLinesSchema,
});

export type OrderSubmitRequestInput = z.infer<typeof OrderSubmitRequestSchema>;
