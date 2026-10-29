import { z } from 'zod';
import { OrderLineSchema } from './OrderQuoteSchemas';

/**
 * Pieces shared by every request that emails a priced order or quote
 * (POST /api/orders/submit, POST /api/quotes/submit).
 */

// Customer-facing messages are in Spanish: the frontend shows them as they are.
const NAME_MESSAGE = 'Introduce tu nombre';
const EMAIL_MESSAGE = 'Introduce un correo válido';
const PHONE_MESSAGE = 'Introduce un teléfono válido';
const PRIVACY_MESSAGE = 'Debes aceptar la política de privacidad';
const REFERENCE_LENGTH_MESSAGE = 'La referencia no puede superar 80 caracteres';
const REFERENCE_CHARACTERS_MESSAGE = 'La referencia contiene caracteres no válidos';

const PHONE_CHARACTERS = /^[0-9\s+()-]+$/;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15; // E.164 maximum
const MAX_REFERENCE_LENGTH = 80;
const NO_CONTROL_CHARACTERS = /^[^\p{Cc}]*$/u;

const countDigits = (value: string): number => value.replace(/\D/g, '').length;

export const CustomerSchema = z.object(
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

/** A free-text label the customer gives the job ("Obra Calle Mayor"); blank means none. */
export const ReferenceSchema = z
  .string()
  .trim()
  .max(MAX_REFERENCE_LENGTH, REFERENCE_LENGTH_MESSAGE)
  .regex(NO_CONTROL_CHARACTERS, REFERENCE_CHARACTERS_MESSAGE)
  .transform((reference) => reference || undefined)
  .optional();

/** Per-browser order and quote numbers ("Pedido nº N", "Presupuesto nº N"). */
export const DocumentNumberSchema = z.number().int().min(1).max(1_000_000);

export const PrivacyAcceptedSchema = z.literal(true, { error: PRIVACY_MESSAGE });

export const SubmissionLinesSchema = z
  .array(OrderLineSchema)
  .min(1, 'At least one line must be provided')
  .max(100, 'Maximum 100 lines per order');
