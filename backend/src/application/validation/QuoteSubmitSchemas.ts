import { z } from 'zod';
import {
  CustomerSchema,
  DocumentNumberSchema,
  PrivacyAcceptedSchema,
  ReferenceSchema,
  SubmissionLinesSchema,
} from './SubmissionSchemas';

/** POST /api/quotes/submit: the quote lines plus who it is emailed to. */
export const QuoteSubmitRequestSchema = z.object({
  quoteNumber: DocumentNumberSchema,
  customer: CustomerSchema,
  reference: ReferenceSchema,
  privacyAccepted: PrivacyAcceptedSchema,
  lines: SubmissionLinesSchema,
});

export type QuoteSubmitRequestInput = z.infer<typeof QuoteSubmitRequestSchema>;
