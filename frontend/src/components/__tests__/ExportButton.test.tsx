import { describe, expect, test, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '../ExportButton';
import { makeQuote } from '../../test/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExportButton', () => {
  test('renders nothing without a quote', () => {
    const { container } = render(<ExportButton quote={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('copies the text summary of the quote', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<ExportButton quote={makeQuote()} />);

    await user.click(screen.getByRole('button', { name: /compartir/i }));
    await user.click(screen.getByRole('button', { name: /copiar resumen/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Total: 4,20 EUR'));
    expect(await screen.findByText(/copiado/i)).toBeInTheDocument();
  });

  test('shows a message when the PDF export is not available yet', async () => {
    const user = userEvent.setup();
    render(<ExportButton quote={makeQuote()} />);

    await user.click(screen.getByRole('button', { name: /compartir/i }));
    await user.click(screen.getByRole('button', { name: /exportar como pdf/i }));

    expect(await screen.findByText(/jsPDF/)).toBeInTheDocument();
  });

  test('opens the share modal and shares by WhatsApp', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ExportButton quote={makeQuote()} />);

    await user.click(screen.getByRole('button', { name: /compartir/i }));
    await user.click(screen.getByRole('button', { name: /compartir presupuesto/i }));
    await user.click(screen.getByRole('button', { name: /whatsapp/i }));

    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/?text='), '_blank');

    await user.click(screen.getByText('Cerrar'));
    expect(screen.queryByRole('heading', { name: /compartir presupuesto/i })).not.toBeInTheDocument();
  });
});
