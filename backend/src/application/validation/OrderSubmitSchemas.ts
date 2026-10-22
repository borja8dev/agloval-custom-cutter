import { z } from 'zod';
import { OrderLineSchema } from './OrderQuoteSchemas';

// Customer-facing messages are in Spanish: the frontend shows them as they are.
const NAME_MESSAGE = 'Introduce tu nombre';
const EMAIL_MESSAGE = 'Introduce un correo válido';
const PHONE_MESSAGE = 'Introduce un teléfono válido';
const PRIVACY_MESSAGE = 'Debes aceptar la política de privacidad';

const PHONE_CHARACTERS = /^[0-9\s+()-]+$/;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15; // E.164 maximum

const countDigits = (value: string): number => value.replace(/\D/g, '').length;

const CustomerSchema = z.object(
  {
    name: z.string({ error: NAME_MESSAGE }).trim().min(2, NAME_MESSAGE).max(100, NAME_MESSAGE),
    email: z.email({ error: EMAIL_MESSAGE }).max(254, EMAIL_MESSAGE),
    phone: z
      .string({ error: PHONE_MESSAGE })
      .trim()
      .regex(PHONE_CHARACTERS, PHONE_MESSAGE)
      .refine((phone) => {
        const digits = countDigits(phone);
        return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS;
      }, PHONE_MESSAGE),
  },
  { error: 'Faltan tus datos de contacto' }
);

/** POST /api/orders/submit: the order lines plus who is asking for it. */
export const OrderSubmitRequestSchema = z.object({
  orderNumber: z.number().int().min(1).max(1_000_000),
  customer: CustomerSchema,
  privacyAccepted: z.literal(true, { error: PRIVACY_MESSAGE }),
  lines: z
    .array(OrderLineSchema)
    .min(1, 'At least one line must be provided')
    .max(100, 'Maximum 100 lines per order'),
});

export type OrderSubmitRequestInput = z.infer<typeof OrderSubmitRequestSchema>;
