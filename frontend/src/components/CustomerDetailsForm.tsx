import React, { useId, useRef, useState } from 'react';
import type { Customer } from '../types';
import { Alert } from './Alert';

export interface CustomerDetailsFormProps {
  /** Details remembered from the session, used to prefill the fields. */
  initialCustomer: Customer | null;
  isSending: boolean;
  /** Server error shown above the buttons; the form stays editable. */
  error: string | null;
  onSubmit: (customer: Customer) => void;
  onCancel: () => void;
}

type Field = 'name' | 'email' | 'phone' | 'privacy';
type FieldErrors = Partial<Record<Field, string>>;

// Same rules and messages as the backend (OrderSubmitSchemas).
const MESSAGES: Record<Field, string> = {
  name: 'Introduce tu nombre',
  email: 'Introduce un correo válido',
  phone: 'Introduce un teléfono válido',
  privacy: 'Debes aceptar la política de privacidad',
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^[0-9\s+()-]+$/;
const FIELD_ORDER: Field[] = ['name', 'email', 'phone', 'privacy'];

function validate(customer: Customer, privacyAccepted: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (customer.name.length < 2 || customer.name.length > 100) errors.name = MESSAGES.name;
  if (!EMAIL_PATTERN.test(customer.email) || customer.email.length > 254) {
    errors.email = MESSAGES.email;
  }
  const digits = customer.phone.replace(/\D/g, '').length;
  if (!PHONE_CHARACTERS.test(customer.phone) || digits < 6 || digits > 15) {
    errors.phone = MESSAGES.phone;
  }
  if (!privacyAccepted) errors.privacy = MESSAGES.privacy;
  return errors;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand aria-[invalid=true]:border-red-500';

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  initialCustomer,
  isSending,
  error,
  onSubmit,
  onCancel,
}) => {
  const baseId = useId();
  const [values, setValues] = useState<Customer>({
    name: initialCustomer?.name ?? '',
    email: initialCustomer?.email ?? '',
    phone: initialCustomer?.phone ?? '',
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  // After a failed submit, a field's message goes away as soon as that field is valid.
  const revalidate = (field: Field, nextValues: Customer, nextPrivacy: boolean) => {
    if (!errors[field]) return;
    const trimmed = {
      name: nextValues.name.trim(),
      email: nextValues.email.trim(),
      phone: nextValues.phone.trim(),
    };
    if (!validate(trimmed, nextPrivacy)[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const idFor = (field: Field) => `${baseId}-${field}`;
  const errorIdFor = (field: Field) => `${baseId}-${field}-error`;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;
    const customer: Customer = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
    };
    const nextErrors = validate(customer, privacyAccepted);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    onSubmit(customer);
  };

  const fieldProps = (field: Field) => ({
    id: idFor(field),
    ref: (element: HTMLInputElement | null) => {
      fieldRefs.current[field] = element;
    },
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? errorIdFor(field) : undefined,
  });

  const fieldError = (field: Field) => (
    <div aria-live="polite">
      {errors[field] && (
        <p id={errorIdFor(field)} className="mt-1 text-sm text-red-700">
          {errors[field]}
        </p>
      )}
    </div>
  );

  const textField = (
    field: Exclude<Field, 'privacy'>,
    label: string,
    type: 'text' | 'email' | 'tel',
    autoComplete: string
  ) => (
    <div>
      <label htmlFor={idFor(field)} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...fieldProps(field)}
        type={type}
        autoComplete={autoComplete}
        value={values[field]}
        onChange={(event) => {
          const nextValues = { ...values, [field]: event.target.value };
          setValues(nextValues);
          revalidate(field, nextValues, privacyAccepted);
        }}
        className={inputClass}
      />
      {fieldError(field)}
    </div>
  );

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-700">
        Te enviaremos el presupuesto por correo. Agloval te confirmará disponibilidad y entrega.
      </p>
      {textField('name', 'Nombre', 'text', 'name')}
      {textField('email', 'Correo electrónico', 'email', 'email')}
      {textField('phone', 'Teléfono', 'tel', 'tel')}
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
          disabled={isSending}
          className="bg-brand-dark text-white px-4 py-2 rounded-md font-medium hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSending ? 'Enviando...' : 'Enviar pedido'}
        </button>
      </div>
    </form>
  );
};
