import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerDetailsForm, type CustomerDetailsFormProps } from '../CustomerDetailsForm';

const lucia = { name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '+34 600 123 456' };

function renderForm(props: Partial<CustomerDetailsFormProps> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(
    <CustomerDetailsForm
      initialCustomer={null}
      submitLabel="Enviar pedido a Agloval"
      isSending={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />
  );
  return { user, onSubmit, onCancel };
}

const nameInput = () => screen.getByLabelText('Nombre');
const emailInput = () => screen.getByLabelText('Correo electrónico');
const phoneInput = () => screen.getByLabelText('Teléfono');
const privacyBox = () =>
  screen.getByLabelText('Acepto que Agloval use estos datos para gestionar mi presupuesto.');
const referenceInput = () => screen.getByLabelText('Referencia (opcional)');
const submitButton = () => screen.getByRole('button', { name: 'Enviar pedido a Agloval' });

async function fill(user: ReturnType<typeof userEvent.setup>, values = lucia) {
  await user.type(nameInput(), values.name);
  await user.type(emailInput(), values.email);
  await user.type(phoneInput(), values.phone);
}

describe('CustomerDetailsForm', () => {
  test('labels every field with the right input types and autocomplete hints', () => {
    renderForm();

    expect(nameInput()).toHaveAttribute('autocomplete', 'name');
    expect(emailInput()).toHaveAttribute('type', 'email');
    expect(emailInput()).toHaveAttribute('autocomplete', 'email');
    expect(phoneInput()).toHaveAttribute('type', 'tel');
    expect(phoneInput()).toHaveAttribute('autocomplete', 'tel');
    expect(privacyBox()).not.toBeChecked();
    expect(referenceInput()).toHaveAttribute('maxlength', '80');
    expect(referenceInput()).toHaveAccessibleDescription(
      'Por ejemplo, el nombre de la obra o de tu cliente'
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  test('prefills the fields from the session', () => {
    renderForm({ initialCustomer: lucia });

    expect(nameInput()).toHaveValue(lucia.name);
    expect(emailInput()).toHaveValue(lucia.email);
    expect(phoneInput()).toHaveValue(lucia.phone);
  });

  test('shows every validation message next to its field and does not submit', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(submitButton());

    const expectations: Array<[HTMLElement, string]> = [
      [nameInput(), 'Introduce tu nombre'],
      [emailInput(), 'Introduce un correo válido'],
      [phoneInput(), 'Introduce un teléfono válido'],
      [privacyBox(), 'Debes aceptar la política de privacidad'],
    ];
    for (const [field, message] of expectations) {
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription(message);
    }
    expect(screen.getByText('Introduce tu nombre').closest('[aria-live="polite"]')).not.toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test.each([
    ['a name of one letter', { ...lucia, name: ' L ' }, 'Introduce tu nombre'],
    ['a name over 100 letters', { ...lucia, name: 'L'.repeat(101) }, 'Introduce tu nombre'],
    ['an email without a domain', { ...lucia, email: 'lucia@' }, 'Introduce un correo válido'],
    ['a phone with letters', { ...lucia, phone: '600 12a 456' }, 'Introduce un teléfono válido'],
    ['a phone of 5 digits', { ...lucia, phone: '600 12' }, 'Introduce un teléfono válido'],
    [
      'a phone of 16 digits',
      { ...lucia, phone: '1234567890123456' },
      'Introduce un teléfono válido',
    ],
  ])('rejects %s', async (_case, values, message) => {
    const { user, onSubmit } = renderForm();
    await fill(user, values);
    await user.click(privacyBox());

    await user.click(submitButton());

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('requires the privacy checkbox', async () => {
    const { user, onSubmit } = renderForm();
    await fill(user);

    await user.click(submitButton());

    expect(privacyBox()).toHaveAccessibleDescription('Debes aceptar la política de privacidad');
    expect(screen.queryByText('Introduce tu nombre')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('submits the trimmed details once everything is valid', async () => {
    const { user, onSubmit } = renderForm();
    await fill(user, {
      name: '  Lucía Ferrer ',
      email: ' lucia@example.com ',
      phone: '(+34) 600-123-456',
    });
    await user.click(privacyBox());

    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith({
      customer: {
        name: 'Lucía Ferrer',
        email: 'lucia@example.com',
        phone: '(+34) 600-123-456',
      },
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('reference');
    expect(nameInput()).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('submits the trimmed reference and leaves a blank one out', async () => {
    const { user, onSubmit } = renderForm({ initialCustomer: lucia });
    await user.type(referenceInput(), '  Obra Calle Mayor ');
    await user.click(privacyBox());

    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith({ customer: lucia, reference: 'Obra Calle Mayor' });

    await user.clear(referenceInput());
    await user.type(referenceInput(), '   ');
    await user.click(submitButton());
    expect(onSubmit.mock.calls[1][0]).toEqual({ customer: lucia });
  });

  test('prefills the reference when given one', () => {
    renderForm({ initialCustomer: lucia, initialReference: 'Cocina Ruzafa' });
    expect(referenceInput()).toHaveValue('Cocina Ruzafa');
  });

  test.each([
    ['over 80 characters', 'R'.repeat(81), 'La referencia no puede superar 80 caracteres'],
    ['with control characters', 'Obra\u0007', 'La referencia contiene caracteres no válidos'],
  ])('rejects a reference %s and focuses it', async (_case, reference, message) => {
    const { user, onSubmit } = renderForm({ initialCustomer: lucia, initialReference: reference });
    await user.click(privacyBox());

    await user.click(submitButton());

    expect(referenceInput()).toHaveAttribute('aria-invalid', 'true');
    expect(referenceInput()).toHaveAccessibleDescription(expect.stringContaining(message));
    expect(referenceInput()).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('shows a reference error from the server next to the field', () => {
    renderForm({
      initialCustomer: lucia,
      referenceError: 'La referencia contiene caracteres no válidos',
    });

    expect(referenceInput()).toHaveAttribute('aria-invalid', 'true');
    expect(referenceInput()).toHaveAccessibleDescription(
      expect.stringContaining('La referencia contiene caracteres no válidos')
    );
  });

  test('renders the given content above the fields', () => {
    renderForm({ children: <p>Resumen del envío</p> });
    const summary = screen.getByText('Resumen del envío');
    expect(
      summary.compareDocumentPosition(nameInput()) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('can keep the submit button disabled', () => {
    renderForm({ initialCustomer: lucia, submitDisabled: true });
    expect(submitButton()).toBeDisabled();
  });

  test('clears a field error once the field is corrected and submitted again', async () => {
    const { user, onSubmit } = renderForm({ initialCustomer: { ...lucia, name: 'L' } });
    await user.click(privacyBox());
    await user.click(submitButton());
    expect(screen.getByText('Introduce tu nombre')).toBeInTheDocument();

    await user.type(nameInput(), 'ucía');
    await user.click(submitButton());

    expect(screen.queryByText('Introduce tu nombre')).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('removes a field error as soon as the field becomes valid, without resubmitting', async () => {
    const { user } = renderForm();
    await user.click(submitButton());
    expect(screen.getByText('Introduce tu nombre')).toBeInTheDocument();

    await user.type(nameInput(), 'Lucía');
    await user.click(privacyBox());

    expect(screen.queryByText('Introduce tu nombre')).not.toBeInTheDocument();
    expect(screen.queryByText('Debes aceptar la política de privacidad')).not.toBeInTheDocument();
    expect(nameInput()).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Introduce un correo válido')).toBeInTheDocument();
  });

  test('disables the submit button and reads "Enviando..." while sending', () => {
    renderForm({ initialCustomer: lucia, isSending: true });

    const button = screen.getByRole('button', { name: 'Enviando...' });
    expect(button).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Enviar pedido a Agloval' })
    ).not.toBeInTheDocument();
  });

  test('shows a server error in an alert', () => {
    renderForm({ initialCustomer: lucia, error: 'No hemos podido enviar el correo.' });

    expect(screen.getByRole('alert')).toHaveTextContent('No hemos podido enviar el correo.');
  });

  test('cancels without submitting', async () => {
    const { user, onSubmit, onCancel } = renderForm({ initialCustomer: lucia });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
