import { DomainException } from '../../domain/exceptions/DomainException';

export class ProductNotFoundException extends DomainException {
  constructor(productId: string) {
    super(`Product not found: ${productId}`, 'PRODUCT_NOT_FOUND', 404);
  }
}

export class UnsupportedProductUnitException extends DomainException {
  constructor(productId: string, unit: string) {
    super(
      `Cutting calculation only supports M2 products; product ${productId} has unit ${unit}`,
      'UNSUPPORTED_PRODUCT_UNIT',
      400
    );
  }
}

/**
 * A stored calculation points at a product without board dimensions. Calculations
 * only exist for M2 products, so this is a data-integrity problem, not a client error.
 */
export class MissingBoardDimensionsException extends DomainException {
  constructor(calculationId: string, productId: string) {
    super(
      `Calculation ${calculationId} references product ${productId} without board dimensions`,
      'MISSING_BOARD_DIMENSIONS',
      500
    );
  }
}

export class CalculationNotFoundException extends DomainException {
  constructor(calculationId: string) {
    super(`Calculation not found: ${calculationId}`, 'CALCULATION_NOT_FOUND', 404);
  }
}

export class InvalidCalculationStatusException extends DomainException {
  constructor(currentStatus: string, action: string) {
    super(
      `Cannot ${action} a calculation with status ${currentStatus}`,
      'INVALID_CALCULATION_STATUS',
      409
    );
  }
}
