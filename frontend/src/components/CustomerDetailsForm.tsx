import React, { useEffect, useId, useRef, useState } from 'react';
import type { Customer } from '../types';
import { Alert } from './Alert';

/** What the form hands over: trimmed details, and the reference only when there is one. */
export interface CustomerSubmission {
  customer: Customer;
  reference?: string;
}

export interface CustomerDetailsFormProps {
  /** Details remembered from the session, used to prefill the fields. */
  initialCustomer: Customer | null;
  initialReference?: string;
  /** Text of the submit button while not sending. */
  submitLabel: string;
  isSending: boolean;
  /** Server error shown above the buttons; the form stays editable. */
  error: string | null;
  /** Server validation message for the reference, shown next to the field. */
  referenceError?: string | null;
  /** Keeps the submit button disabled, for example while a price is unknown. */
  submitDisabled?: boolean;
  /** Content shown above the fields (a choice, a summary). */
  children?: React.ReactNode;
  onSubmit: (submission: CustomerSubmission) => void;
  onCancel: () => void;
}

type Field = 'name' | 'email' | 'phone' | 'reference' | 'privacy';
type FieldErrors = Partial<Record<Field, string>>;
interface Values extends Customer {
  reference: string;
}

// Same rules and messages as the backend (SubmissionSchemas).
const MESSAGES = {
  name: 'Introduce tu nombre',
  email: 'Introduce un correo válido',
  phone: 'Introduce un teléfono válido',
  referenceLength: 'La referencia no puede superar 80 caracteres',
  referenceCharacters: 'La referencia contiene caracteres no válidos',
  privacy: 'Debes aceptar la política de privacidad',
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^[0-9\s+()-]+$/;
const NO_CONTROL_CHARACTERS = /^[^\p{Cc}]*$/u;
export const MAX_REFERENCE_LENGTH = 80;
const FIELD_ORDER: Field[] = ['name', 'email', 'phone', 'reference', 'privacy'];
const REFERENCE_HINT = 'Por ejemplo, el nombre de la obra o de tu cliente';

const trimAll = (values: Values): Values => ({
  name: values.name.trim(),
  email: values.email.trim(),
  phone: values.phone.trim(),
  reference: values.reference.trim(),
});

function validate(values: Values, privacyAccepted: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.length < 2 || values.name.length > 100) errors.name = MESSAGES.name;
  if (!EMAIL_PATTERN.test(values.email) || values.email.length > 254) {
    errors.email = MESSAGES.email;
  }
  const digits = values.phone.replace(/\D/g, '').length;
  if (!PHONE_CHARACTERS.test(values.phone) || digits < 6 || digits > 15) {
    errors.phone = MESSAGES.phone;
  }
  if (values.reference.length > MAX_REFERENCE_LENGTH) {
    errors.reference = MESSAGES.referenceLength;
  } else if (!NO_CONTROL_CHARACTERS.test(values.reference)) {
    errors.reference = MESSAGES.referenceCharacters;
  }
  if (!privacyAccepted) errors.privacy = MESSAGES.privacy;
  return errors;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand aria-[invalid=true]:border-red-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  initialCustomer,
  initialReference = '',
  submitLabel,
  isSending,
  error,
  referenceError = null,
  submitDisabled = false,
  children,
  onSubmit,
  onCancel,
}) => {
  const baseId = useId();
  const [values, setValues] = useState<Values>({
    name: initialCustomer?.name ?? '',
    email: initialCustomer?.email ?? '',
    phone: initialCustomer?.phone ?? '',
    reference: initialReference,
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  // A server message for the reference stays until the customer edits the field.
  const [dismissedReferenceError, setDismissedReferenceError] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (referenceError) fieldRefs.current.reference?.focus();
  }, [referenceError]);

  const shownErrors: FieldErrors = {
    ...errors,
    reference:
      errors.reference ??
      (referenceError && referenceError !== dismissedReferenceError ? referenceError : undefined),
  };

  // After a failed submit, a field's message goes away as soon as that field is valid.
  const revalidate = (field: Field, nextValues: Values, nextPrivacy: boolean) => {
    if (!errors[field]) return;
    if (!validate(trimAll(nextValues), nextPrivacy)[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const idFor = (field: Field) => `${baseId}-${field}`;
  const errorIdFor = (field: Field) => `${baseId}-${field}-error`;
  const hintId = `${baseId}-reference-hint`;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending || submitDisabled) return;
    const trimmed = trimAll(values);
    const nextErrors = validate(trimmed, privacyAccepted);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    const { reference, ...customer } = trimmed;
    onSubmit(reference ? { customer, reference } : { customer });
  };

  const fieldProps = (field: Field, extraDescription?: string) => {
    const describedBy = [shownErrors[field] && errorIdFor(field), extraDescription]
      .filter(Boolean)
      .join(' ');
    return {
      id: idFor(field),
      ref: (element: HTMLInputElement | null) => {
        fieldRefs.current[field] = element;
      },
      'aria-invalid': shownErrors[field] ? true : undefined,
      'aria-describedby': describedBy || undefined,
    };
  };

  const fieldError = (field: Field) => (
    <div aria-live="polite">
      {shownErrors[field] && (
        <p id={errorIdFor(field)} className="mt-1 text-sm text-red-700">
          {shownErrors[field]}
        </p>
      )}
    </div>
  );

  const changeValue = (field: Exclude<Field, 'privacy'>, value: string) => {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    revalidate(field, nextValues, privacyAccepted);
    if (field === 'reference') setDismissedReferenceError(referenceError);
  };

  const textField = (
    field: 'name' | 'email' | 'phone',
    label: string,
    type: 'text' | 'email' | 'tel',
    autoComplete: string
  ) => (
    <div>
      <label htmlFor={idFor(field)} className={labelClass}>
        {label}
      </label>
      <input
        {...fieldProps(field)}
        type={type}
        autoComplete={autoComplete}
        value={values[field]}
        onChange={(event) => changeValue(field, event.target.value)}
        className={inputClass}
      />
      {fieldError(field)}
    </div>
  );

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {children}
      {textField('name', 'Nombre', 'text', 'name')}
      {textField('email', 'Correo electrónico', 'email', 'email')}
      {textField('phone', 'Teléfono', 'tel', 'tel')}
      <div>
        <label htmlFor={idFor('reference')} className={labelClass}>
          Referencia <span className="font-normal text-gray-500">(opcional)</span>
        </label>
        <input
          {...fieldProps('reference', hintId)}
          type="text"
          autoComplete="off"
          maxLength={MAX_REFERENCE_LENGTH}
          value={values.reference}
          onChange={(event) => changeValue('reference', event.target.value)}
          className={inputClass}
        />
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {REFERENCE_HINT}
        </p>
        {fieldError('reference')}
      </div>
      <div>
        <label htmlFor={idFor('privacy')} className="flex items-start gap-2 text-sm text-gray-700">
          <input
            {...fieldProps('privacy')}
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => {
              setPrivacyAccepted(event.target.checked);
              revalidate('privacy', values, event.target.checked);
            }}
            className="mt-0.5 h-4 w-4 accent-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <span>Acepto que Agloval use estos datos para gestionar mi presupuesto.</span>
        </label>
        {fieldError('privacy')}
      </div>
      {error && <Alert type="error" message={error} />}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSending || submitDisabled}
          className="bg-brand-dark text-white px-4 py-2 rounded-md font-medium hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSending ? 'Enviando...' : submitLabel}
        </button>
      </div>
    </form>
  );
};
