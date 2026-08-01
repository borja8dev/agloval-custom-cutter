import { CuttingCalculator } from '../../src/domain/services/CuttingCalculator';
import {
  InvalidPieceException,
  EmptyPiecesListException,
  InvalidBoardDimensionsException,
} from '../../src/domain/exceptions/DomainException';

describe('CuttingCalculator', () => {
  // Standard board 300cm x 200cm = 6 m²
  const standardBoard = { width: 300, height: 200, thickness: 18 };
  let calculator: CuttingCalculator;

  beforeEach(() => {
    calculator = new CuttingCalculator(standardBoard);
  });

  describe('Valid calculations', () => {
    test('should calculate 1 piece exactly fitting', () => {
      const pieces = [{ width: 300, height: 200 }];
      const result = calculator.calculate(pieces);

      expect(result.totalAreaNeeded).toBeCloseTo(6, 4);
      expect(result.boardsNeeded).toBe(1.0);
      expect(result.wastePercentage).toBe(0);
      expect(result.pieceCount).toBe(1);
      expect(result.isValid).toBe(true);
    });

    test('should calculate 2 identical pieces requiring 0.7 boards', () => {
      const pieces = [
        { width: 200, height: 100 },
        { width: 200, height: 100 },
      ];
      const result = calculator.calculate(pieces);

      expect(result.totalAreaNeeded).toBeCloseTo(4, 4);
      expect(result.boardsNeeded).toBe(0.7); // 4 / 6 = 0.667 -> ceil to 0.7
      expect(result.pieceCount).toBe(2);
      expect(result.wastePercentage).toBeGreaterThan(0);
      expect(result.wastePercentage).toBeLessThan(100);
    });

    test('should calculate 3 pieces needing 1.2 boards (classic example)', () => {
      const pieces = [
        { width: 200, height: 100 }, // 2 m²
        { width: 200, height: 100 }, // 2 m²
        { width: 250, height: 120 }, // 3 m²
      ];
      const result = calculator.calculate(pieces);

      expect(result.totalAreaNeeded).toBeCloseTo(7, 4);
      expect(result.boardsNeeded).toBe(1.2); // 7 / 6 = 1.167 -> ceil to 1.2
      expect(result.wastePercentage).toBeLessThan(30);
      expect(result.pieceCount).toBe(3);
    });

    test('should calculate very small piece', () => {
      const pieces = [{ width: 10, height: 10 }];
      const result = calculator.calculate(pieces);

      expect(result.totalAreaNeeded).toBeCloseTo(0.01, 4);
      expect(result.boardsNeeded).toBe(0.1);
      expect(result.isValid).toBe(true);
    });

    test('should calculate many small pieces', () => {
      const pieces = Array(20)
        .fill(null)
        .map(() => ({ width: 50, height: 50 }));
      const result = calculator.calculate(pieces);

      expect(result.pieceCount).toBe(20);
      expect(result.totalAreaNeeded).toBeCloseTo(5.0, 4); // 20 x 0.25 m²
      expect(result.boardsNeeded).toBe(0.9); // 5 / 6 = 0.833 -> ceil to 0.9
    });
  });

  describe('Validation errors', () => {
    test('should throw EmptyPiecesListException for empty array', () => {
      expect(() => calculator.calculate([])).toThrow(EmptyPiecesListException);
    });

    test('should throw InvalidPieceException for piece with zero width', () => {
      const pieces = [{ width: 0, height: 100 }];
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should throw InvalidPieceException for piece with negative height', () => {
      const pieces = [{ width: 100, height: -50 }];
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should throw InvalidPieceException for piece below minimum width', () => {
      const pieces = [{ width: 5, height: 100 }]; // min is 10cm
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should throw InvalidPieceException for piece exceeding board width', () => {
      const pieces = [{ width: 301, height: 100 }]; // board is 300cm
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should throw InvalidPieceException for piece exceeding board height', () => {
      const pieces = [{ width: 100, height: 201 }]; // board is 200cm
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should throw InvalidPieceException for non-numeric dimensions', () => {
      const pieces = [{ width: 'abc' as unknown as number, height: 100 }];
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should handle multiple invalid pieces', () => {
      const pieces = [
        { width: 0, height: 100 },
        { width: 100, height: -50 },
      ];
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should report the actual offending piece, not always the first one', () => {
      const pieces = [
        { width: 100, height: 100 }, // valid
        { width: 500, height: 100 }, // invalid: exceeds board width
      ];
      expect(() => calculator.calculate(pieces)).toThrow(/"width":500/);
    });
  });

  describe('Board dimensions validation', () => {
    test('should reject zero board width', () => {
      expect(() => new CuttingCalculator({ width: 0, height: 200 })).toThrow(
        InvalidBoardDimensionsException
      );
    });

    test('should reject negative board height', () => {
      expect(() => new CuttingCalculator({ width: 300, height: -200 })).toThrow(
        InvalidBoardDimensionsException
      );
    });
  });

  describe('Boundary cases', () => {
    test('should accept piece at exactly board dimensions', () => {
      const pieces = [{ width: 300, height: 200 }];
      const result = calculator.calculate(pieces);
      expect(result.wastePercentage).toBe(0);
    });

    test('should accept minimum piece size (10cm x 10cm)', () => {
      const pieces = [{ width: 10, height: 10 }];
      const result = calculator.calculate(pieces);
      expect(result.isValid).toBe(true);
      expect(result.boardsNeeded).toBe(0.1);
    });

    test('should reject piece 9.99cm (below minimum)', () => {
      const pieces = [{ width: 9.99, height: 100 }];
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should handle decimal dimensions (precision)', () => {
      const pieces = [
        { width: 100.5, height: 99.75 },
        { width: 100.5, height: 99.75 },
      ];
      const result = calculator.calculate(pieces);
      expect(result.totalAreaNeeded).toBeCloseTo(2.005, 2);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Waste calculations', () => {
    test('should have 0% waste for perfect fit', () => {
      const pieces = [{ width: 300, height: 200 }];
      const result = calculator.calculate(pieces);
      expect(result.wastePercentage).toBe(0);
    });

    test('should calculate waste for partial board use', () => {
      const pieces = [{ width: 100, height: 100 }];
      const result = calculator.calculate(pieces);
      // 1 m² needed, 0.2 boards purchased (1.2 m² available) -> waste = 0.2 / 1.2 * 100 ~= 16.67%
      expect(result.wastePercentage).toBeCloseTo(16.67, 1);
    });

    test('waste should never exceed 100% or drop below 0%', () => {
      const pieces = [
        { width: 50, height: 50 },
        { width: 100, height: 75 },
      ];
      const result = calculator.calculate(pieces);
      expect(result.wastePercentage).toBeLessThanOrEqual(100);
      expect(result.wastePercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Boards needed (ceiling to 0.1)', () => {
    // A single piece can never need >1.0 boards without exceeding the board's
    // own dimensions (which validatePiece forbids) — these ratios need multiple pieces.
    test('1.05 boards should ceil to 1.1', () => {
      const pieces = [
        { width: 300, height: 200 }, // 6 m² (full board)
        { width: 30, height: 100 }, // 0.3 m²
      ]; // 6.3 m² / 6 m² = 1.05
      const result = calculator.calculate(pieces);
      expect(result.boardsNeeded).toBe(1.1);
    });

    test('1.15 boards should ceil to 1.2', () => {
      const pieces = [
        { width: 300, height: 200 }, // 6 m²
        { width: 90, height: 100 }, // 0.9 m²
      ]; // 6.9 m² / 6 m² = 1.15
      const result = calculator.calculate(pieces);
      expect(result.boardsNeeded).toBe(1.2);
    });

    test('2.0 boards should stay 2.0', () => {
      const pieces = [
        { width: 300, height: 200 }, // 6 m²
        { width: 300, height: 200 }, // 6 m²
      ]; // 12 m² / 6 m² = 2.0
      const result = calculator.calculate(pieces);
      expect(result.boardsNeeded).toBe(2.0);
    });
  });

  describe('Average piece size', () => {
    test('should calculate average for multiple pieces', () => {
      const pieces = [
        { width: 100, height: 100 }, // 1 m²
        { width: 200, height: 200 }, // 4 m²
      ];
      const result = calculator.calculate(pieces);
      expect(result.averagePieceSize).toBeCloseTo(2.5, 4);
    });

    test('average should equal total for single piece', () => {
      const pieces = [{ width: 150, height: 200 }];
      const result = calculator.calculate(pieces);
      expect(result.averagePieceSize).toBeCloseTo(result.totalAreaNeeded, 4);
    });
  });

  describe('Edge cases', () => {
    test('should handle null piece gracefully', () => {
      const pieces = [null as unknown as { width: number; height: number }];
      expect(() => calculator.calculate(pieces)).toThrow();
    });

    test('should handle missing width property', () => {
      const pieces = [{ height: 100 } as unknown as { width: number; height: number }];
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should handle missing height property', () => {
      const pieces = [{ width: 100 } as unknown as { width: number; height: number }];
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should be deterministic (same input = same output)', () => {
      const pieces = [
        { width: 200, height: 100 },
        { width: 250, height: 120 },
      ];

      const result1 = calculator.calculate(pieces);
      const result2 = calculator.calculate(pieces);

      expect(result1.boardsNeeded).toBe(result2.boardsNeeded);
      expect(result1.wastePercentage).toBe(result2.wastePercentage);
      expect(result1.totalAreaNeeded).toBe(result2.totalAreaNeeded);
    });
  });
});
