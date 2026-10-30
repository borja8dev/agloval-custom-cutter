import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ConfirmSubmissionForm,
  type ConfirmSubmissionFormProps,
} from '../ConfirmSubmissionForm';

const lucia = { name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '600 123 456' };

function renderForm(props: Partial<ConfirmSubmissionFormProps> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(
    <ConfirmSubmissionForm
      quoteNumber={4}
      orderNumber={9}
      lineCount={3}
      totalText="257,82 EUR"
      initialCustomer={lucia}
      isSending={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />
  );
  return { user, onSubmit, onCancel };
}

const choice = () => screen.getByRole('radiogroup', { name: '¿Qué quieres enviar?' });
const quoteRadio = () => within(choice()).getByRole('radio', { name: 'Presupuesto' });
const orderRadio = () => within(choice()).getByRole('radio', { name: 'Pedido' });
const privacyBox = () =>
  screen.getByLabelText('Acepto que Agloval use estos datos para gestionar mi presupuesto.');

describe('ConfirmSubmissionForm', () => {
  test('offers a quote or an order, with the quote selected by default', () => {
    renderForm();

    const radios = within(choice()).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(quoteRadio()).toBeChecked();
    expect(orderRadio()).not.toBeChecked();
    expect(radios[0]).toHaveAttribute('name', radios[1].getAttribute('name'));
  });

  test('previews the number each choice will get and explains what happens', () => {
    renderForm();

    expect(quoteRadio()).toHaveAccessibleDescription(
      expect.stringContaining('Presupuesto nº 4')
    );
    expect(quoteRadio()).toHaveAccessibleDescription(
      expect.stringContaining('Agloval no recibe nada todavía.')
    );
    expect(orderRadio()).toHaveAccessibleDescription(expect.stringContaining('Pedido nº 9'));
    expect(orderRadio()).toHaveAccessibleDescription(
      expect.stringContaining('Agloval recibe tu pedido')
    );
  });

  test('summarises the lines and the total', () => {
    renderForm();
    expect(screen.getByText('3 líneas · 257,82 EUR')).toBeInTheDocument();
  });

  test('uses the singular for one line', () => {
    renderForm({ lineCount: 1 });
    expect(screen.getByText('1 línea · 257,82 EUR')).toBeInTheDocument();
  });

  test('the submit button follows the choice', async () => {
    const { user } = renderForm();
    expect(screen.getByRole('button', { name: 'Enviarme el presupuesto' })).toBeInTheDocument();

    await user.click(orderRadio());

    expect(orderRadio()).toBeChecked();
    expect(screen.getByRole('button', { name: 'Enviar pedido a Agloval' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviarme el presupuesto' })).toBeNull();
  });

  test('moves between the choices with the arrow keys', async () => {
    const { user } = renderForm();
    quoteRadio().focus();

    await user.keyboard('{ArrowRight}');
    expect(orderRadio()).toBeChecked();
    expect(orderRadio()).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(quoteRadio()).toBeChecked();
  });

  test('marks the selected card', async () => {
    const { user } = renderForm();
    const card = (radio: HTMLElement) => radio.closest('label') as HTMLElement;
    expect(card(quoteRadio())).toHaveAttribute('data-selected', 'true');
    expect(card(orderRadio())).toHaveAttribute('data-selected', 'false');

    await user.click(orderRadio());

    expect(card(orderRadio())).toHaveAttribute('data-selected', 'true');
    expect(card(quoteRadio())).toHaveAttribute('data-selected', 'false');
  });

  test('submits a quote with the customer and the reference', async () => {
    const { user, onSubmit } = renderForm();
    await user.type(screen.getByLabelText('Referencia (opcional)'), 'Obra Calle Mayor');
    await user.click(privacyBox());

    await user.click(screen.getByRole('button', { name: 'Enviarme el presupuesto' }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'quote',
      customer: lucia,
      reference: 'Obra Calle Mayor',
    });
  });

  test('submits an order when the order is chosen', async () => {
    const { user, onSubmit } = renderForm();
    await user.click(orderRadio());
    await user.click(privacyBox());

    await user.click(screen.getByRole('button', { name: 'Enviar pedido a Agloval' }));

    expect(onSubmit).toHaveBeenCalledWith({ kind: 'order', customer: lucia });
  });

  test('locks the choice and reads "Enviando..." while sending', () => {
    renderForm({ isSending: true });
    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
    expect(quoteRadio()).toBeDisabled();
    expect(orderRadio()).toBeDisabled();
  });

  test('cancels', async () => {
    const { user, onCancel, onSubmit } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
