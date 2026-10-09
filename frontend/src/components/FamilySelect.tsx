import React from 'react';
import type { Family } from '../types';

interface FamilySelectProps {
  families: Family[];
  value: string;
  onChange: (code: string) => void;
  isLoading?: boolean;
}

export const FamilySelect: React.FC<FamilySelectProps> = ({
  families,
  value,
  onChange,
  isLoading = false,
}) => (
  <div>
    <label htmlFor="family-select" className="block text-sm font-medium text-gray-700 mb-1">
      Tipo de producto
    </label>
    <select
      id="family-select"
      data-testid="family-select"
      value={value}
      disabled={isLoading}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
    >
      <option value="">Todas las familias</option>
      {families
        .filter((family) => family.productCount > 0)
        .map((family) => (
          <option key={family.code} value={family.code}>
            {family.name} ({family.productCount})
          </option>
        ))}
    </select>
  </div>
);
