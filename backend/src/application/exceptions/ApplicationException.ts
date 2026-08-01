import { DomainException } from '../../domain/exceptions/DomainException';

export class ProductNotFoundException extends DomainException {
  constructor(productId: string) {
    super(`Product not found: ${productId}`, 'PRODUCT_NOT_FOUND', 404);
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
