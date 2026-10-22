import { describe, expect, test, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <Modal open onClose={onClose} title="Historial de pedidos" {...props}>
      {props.children ?? (
        <>
          <p>Contenido</p>
          <button type="button">Primera accion</button>
          <button type="button">Ultima accion</button>
        </>
      )}
    </Modal>
  );
  return { onClose, user };
}

const Harness: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ventana">
        <button type="button">Dentro</button>
      </Modal>
    </>
  );
};

describe('Modal', () => {
  test('renders nothing when closed', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Contenido')).toBeNull();
  });

  test('renders a modal dialog named by its title into the document body', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Historial de pedidos' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Historial de pedidos' })
    ).toBeInTheDocument();
    expect(dialog.closest('body')).toBe(document.body);
  });

  test('closes with Escape', async () => {
    const { onClose, user } = renderModal();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('closes with the "Cerrar" button', async () => {
    const { onClose, user } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('closes on a backdrop click but not on a click inside the panel', async () => {
    const { onClose, user } = renderModal();
    await user.click(screen.getByText('Contenido'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('moves the focus inside the dialog when it opens', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  test('focuses the panel when it has no focusable content besides itself', () => {
    renderModal({ children: <p>Solo texto</p> });
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  test('wraps Tab from the last element to the first one and Shift+Tab back', async () => {
    const { user } = renderModal();
    const close = screen.getByRole('button', { name: 'Cerrar' });
    const last = screen.getByRole('button', { name: 'Ultima accion' });

    last.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  test('returns the focus to the opener when it closes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  test('locks the page scroll while open and restores it on close', async () => {
    document.body.style.overflow = 'auto';
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
});
