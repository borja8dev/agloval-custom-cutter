import { IOrderQuoteUseCase } from '../ports/in/OrderQuoteUseCase';
import { IProductRepository, ProductRecord } from '../ports/out/CalculationPersistence';
import {
  OrderQuoteGroupDTO,
  OrderQuoteLineDTO,
  OrderQuoteProductDTO,
  OrderQuoteRequestDTO,
  OrderQuoteResponseDTO,
} from '../dto/OrderQuote';
import { CuttingCalculator } from '../../domain/services/CuttingCalculator';
import { priceBoards, toCents } from '../../domain/services/BoardPricing';
import { linearLineCents, unitLineCents } from '../../domain/services/OrderPricing';
import {
  IncompleteProductException,
  InvalidOrderLineException,
  ProductNotFoundException,
} from '../exceptions/ApplicationException';

interface PricedGroup {
  group: OrderQuoteGroupDTO;
  cents: number;
}

/**
 * Prices a whole order of lines for different products. Stateless: loads the
 * products once and persists nothing. Lines of the same product are merged
 * before pricing (M2 pieces share boards, UD/ML quantities add up).
 */
export class QuoteOrderService implements IOrderQuoteUseCase {
  constructor(private productRepository: IProductRepository) {}

  async quote(request: OrderQuoteRequestDTO): Promise<OrderQuoteResponseDTO> {
    const linesByProduct = new Map<string, OrderQuoteLineDTO[]>();
    for (const line of request.lines) {
      const lines = linesByProduct.get(line.productId) ?? [];
      lines.push(line);
      linesByProduct.set(line.productId, lines);
    }

    const productIds = [...linesByProduct.keys()];
    const found = new Map(
      (await this.productRepository.findByIds(productIds)).map((p) => [p.id, p])
    );

    const priced: PricedGroup[] = [];
    for (const [productId, lines] of linesByProduct) {
      const product = found.get(productId);
      if (!product) throw new ProductNotFoundException(productId);
      priced.push(this.priceGroup(product, lines));
    }

    const totalCents = priced.reduce((sum, { cents }) => sum + cents, 0);
    return {
      groups: priced.map(({ group }) => group),
      total: totalCents / 100,
      currency: 'EUR',
      calculatedAt: new Date().toISOString(),
    };
  }

  private priceGroup(product: ProductRecord, lines: OrderQuoteLineDTO[]): PricedGroup {
    if (product.unit === 'M2') return this.priceBoardGroup(product, lines);

    const quantity = this.sumQuantities(product, lines);
    return product.unit === 'UD'
      ? this.priceUnitGroup(product, quantity)
      : this.priceLinearGroup(product, quantity);
  }

  private priceBoardGroup(product: ProductRecord, lines: OrderQuoteLineDTO[]): PricedGroup {
    const pieces = lines.flatMap((line) => {
      if (line.pieces === undefined || line.quantity !== undefined) {
        throw new InvalidOrderLineException(
          product.name,
          product.unit,
          'M2 products take "pieces" and no "quantity"'
        );
      }
      return line.pieces;
    });

    if (product.standardWidth === null || product.standardHeight === null) {
      throw new IncompleteProductException(product.id, 'board dimensions');
    }

    const calculator = new CuttingCalculator({
      width: product.standardWidth,
      height: product.standardHeight,
    });
    const result = calculator.calculate(pieces);
    const pricing = priceBoards({
      boards: result.boardsNeeded,
      boardAreaM2: result.boardArea,
      pricePerM2: product.pricePerM2,
      pricePerUnit: product.pricePerUnit,
    });
    const cents = toCents(pricing.totalPrice);

    return {
      cents,
      group: {
        kind: 'BOARD',
        product: this.toProductDTO(product),
        pieces: pieces.map(({ width, height, quantity }) => ({ width, height, quantity })),
        pieceCount: result.pieceCount,
        usedAreaM2: result.totalAreaNeeded,
        boardAreaM2: result.boardArea,
        boardsNeeded: result.boardsNeeded,
        pricePerBoard: pricing.pricePerBoard,
        price: cents / 100,
      },
    };
  }

  private priceUnitGroup(product: ProductRecord, quantity: number): PricedGroup {
    const cents = unitLineCents(product.pricePerUnit, quantity);
    return {
      cents,
      group: {
        kind: 'UNIT',
        product: this.toProductDTO(product),
        quantity,
        unitPrice: product.pricePerUnit,
        price: cents / 100,
      },
    };
  }

  private priceLinearGroup(product: ProductRecord, quantity: number): PricedGroup {
    if (product.lengthCm === null) {
      throw new IncompleteProductException(product.id, 'bar length');
    }

    // pricePerUnit of an ML product is the price per metre.
    const cents = linearLineCents(product.pricePerUnit, product.lengthCm, quantity);
    return {
      cents,
      group: {
        kind: 'LINEAR',
        product: this.toProductDTO(product),
        quantity,
        lengthM: Number((product.lengthCm / 100).toFixed(4)),
        pricePerMeter: product.pricePerUnit,
        price: cents / 100,
      },
    };
  }

  /** UD and ML lines carry a quantity and no pieces; quantities of one product add up. */
  private sumQuantities(product: ProductRecord, lines: OrderQuoteLineDTO[]): number {
    let total = 0;
    for (const line of lines) {
      if (line.quantity === undefined || line.pieces !== undefined) {
        throw new InvalidOrderLineException(
          product.name,
          product.unit,
          `${product.unit} products take "quantity" and no "pieces"`
        );
      }
      total += line.quantity;
    }
    return total;
  }

  private toProductDTO(product: ProductRecord): OrderQuoteProductDTO {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      familyCode: product.familyCode,
      familyName: product.familyName,
      thickness: product.thickness,
      boardWidth: product.standardWidth,
      boardHeight: product.standardHeight,
      lengthCm: product.lengthCm,
    };
  }
}
