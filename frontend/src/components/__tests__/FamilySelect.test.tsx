import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilySelect } from '../FamilySelect';
import type { Family } from '../../types';

const units = { UD: 0, M2: 0, ML: 0 };
const families: Family[] = [
  { code: 'MEL', name: 'Melamina', productCount: 12, units },
  { code: 'EMP', name: 'Empty', productCount: 0, units },
  { code: 'PER', name: 'Perfiles', productCount: 3, units },
];

describe('FamilySelect', () => {
  test('renders a labelled select with the all option and families with counts', () => {
    render(<FamilySelect families={families} value="" onChange={vi.fn()} />);
    const select = screen.getByLabelText('Tipo de producto');
    expect(select).toBe(screen.getByTestId('family-select'));
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Todas las familias', 'Melamina (12)', 'Perfiles (3)']);
  });

  test('hides families with zero products', () => {
    render(<FamilySelect families={families} value="" onChange={vi.fn()} />);
    expect(screen.queryByText(/Empty/)).not.toBeInTheDocument();
  });

  test('reflects the current value', () => {
    render(<FamilySelect families={families} value="PER" onChange={vi.fn()} />);
    expect(screen.getByTestId('family-select')).toHaveValue('PER');
  });

  test('calls onChange with the family code, and empty for all', async () => {
    const onChange = vi.fn();
    render(<FamilySelect families={families} value="MEL" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByTestId('family-select'), 'PER');
    expect(onChange).toHaveBeenCalledWith('PER');
    await userEvent.selectOptions(screen.getByTestId('family-select'), '');
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  test('is disabled while loading', () => {
    render(<FamilySelect families={[]} value="" onChange={vi.fn()} isLoading />);
    expect(screen.getByTestId('family-select')).toBeDisabled();
  });
});
