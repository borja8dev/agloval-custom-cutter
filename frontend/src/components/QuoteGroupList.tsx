import React from 'react';
import type { QuoteBoardGroup, QuoteGroup, QuoteLinearGroup, QuoteUnitGroup } from '../types';
import { formatDecimal } from '../utils/formatters';

interface QuoteGroupListProps {
  groups: QuoteGroup[];
  /** Off when the caller already shows the product name above the list. */
  showProductName?: boolean;
}

const money = (value: number) => `${formatDecimal(value)} EUR`;

const boardCount = (group: QuoteBoardGroup) =>
  `${group.boardsNeeded} ${group.boardsNeeded === 1 ? 'tablero' : 'tableros'}`;

const BoardDetails: React.FC<{ group: QuoteBoardGroup; showProductName: boolean }> = ({
  group,
  showProductName,
}) => {
  const { product } = group;
  const boardType = [
    product.name,
    product.thickness !== null ? `${product.thickness} mm` : null,
    product.boardWidth !== null && product.boardHeight !== null
      ? `${product.boardWidth} x ${product.boardHeight} cm`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const boardSize =
    product.boardWidth !== null && product.boardHeight !== null
      ? ` de ${product.boardWidth} x ${product.boardHeight} cm`
      : '';

  return (
    <>
      {/* The board type repeats the name and size, so it only helps when the name is shown. */}
      {showProductName && <p className="text-gray-600">{boardType}</p>}
      <p className="text-gray-600">
        {formatDecimal(group.usedAreaM2)} m² usados · {boardCount(group)}
        {boardSize}
      </p>
      <p className="text-gray-600">
        {boardCount(group)} x {money(group.pricePerBoard)} ={' '}
        <span className="font-semibold text-gray-900">{money(group.price)}</span>
      </p>
    </>
  );
};

const UnitDetails: React.FC<{ group: QuoteUnitGroup }> = ({ group }) => (
  <p className="text-gray-600">
    {group.quantity} x {money(group.unitPrice)} ={' '}
    <span className="font-semibold text-gray-900">{money(group.price)}</span>
  </p>
);

const LinearDetails: React.FC<{ group: QuoteLinearGroup }> = ({ group }) => (
  <p className="text-gray-600">
    {group.quantity} {group.quantity === 1 ? 'barra' : 'barras'} de {formatDecimal(group.lengthM)} m
    x {formatDecimal(group.pricePerMeter)} EUR/m ={' '}
    <span className="font-semibold text-gray-900">{money(group.price)}</span>
  </p>
);

export const QuoteGroupList: React.FC<QuoteGroupListProps> = ({
  groups,
  showProductName = true,
}) => {
  if (groups.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {groups.map((group) => (
        <li
          key={`${group.kind}-${group.product.id}`}
          data-testid="quote-group"
          className="text-sm bg-gray-50 rounded-md p-2"
        >
          {showProductName && <p className="font-medium text-gray-900">{group.product.name}</p>}
          {group.kind === 'BOARD' && (
            <BoardDetails group={group} showProductName={showProductName} />
          )}
          {group.kind === 'UNIT' && <UnitDetails group={group} />}
          {group.kind === 'LINEAR' && <LinearDetails group={group} />}
        </li>
      ))}
    </ul>
  );
};
