import { CuttingCalculator } from '../../src/domain/services/CuttingCalculator';
import { MIN_PIECE_WIDTH_CM, MIN_PIECE_HEIGHT_CM } from '../../src/domain/constants';
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

    test('should calculate 2 identical pieces requiring 1 whole board', () => {
      const pieces = [
        { width: 200, height: 100 },
        { width: 200, height: 100 },
      ];
      const result = calculator.calculate(pieces);

      expect(result.totalAreaNeeded).toBeCloseTo(4, 4);
      expect(result.boardsNeeded).toBe(1); // 4 / 6 = 0.667 -> whole board
      expect(result.pieceCount).toBe(2);
      expect(result.wastePercentage).toBeGreaterThan(0);
      expect(result.wastePercentage).toBeLessThan(100);
    });

    test('should calculate 3 pieces needing 2 whole boards (classic example)', () => {
      const pieces = [
        { width: 200, height: 100 }, // 2 m²
        { width: 200, height: 100 }, // 2 m²
        { width: 250, height: 120 }, // 3 m²
      ];
      const result = calculator.calculate(pieces);

      expect(result.totalAreaNeeded).toBeCloseTo(7, 4);
      expect(result.boardsNeeded).toBe(2); // 7 / 6 = 1.167 -> 2 whole boards
      expect(result.wastePercentage).toBeCloseTo(41.67, 1); // 5 / 12
      expect(result.pieceCount).toBe(3);
    });

    test('should calculate very small piece', () => {
      const pieces = [{ width: 20, height: 20 }];
      const result = calculator.calculate(pieces);

      expect(result.totalAreaNeeded).toBeCloseTo(0.04, 4);
      expect(result.boardsNeeded).toBe(1);
      expect(result.isValid).toBe(true);
    });

    test('should calculate many small pieces', () => {
      const pieces = Array(20)
        .fill(null)
        .map(() => ({ width: 50, height: 50 }));
      const result = calculator.calculate(pieces);

      expect(result.pieceCount).toBe(20);
      expect(result.totalAreaNeeded).toBeCloseTo(5.0, 4); // 20 x 0.25 m²
      expect(result.boardsNeeded).toBe(1); // 5 / 6 = 0.833 -> 1 whole board
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
      const pieces = [{ width: 1, height: 100 }]; // min width is 2cm
      expect(() => calculator.calculate(pieces)).toThrow(InvalidPieceException);
    });

    test('should throw InvalidPieceException for piece below minimum height', () => {
      const pieces = [{ width: 100, height: 10 }]; // min height is 15cm
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

    test('should expose the minimum piece size as 2cm x 15cm', () => {
      expect(MIN_PIECE_WIDTH_CM).toBe(2);
      expect(MIN_PIECE_HEIGHT_CM).toBe(15);
    });

    test('should accept the minimum piece size (2cm wide x 15cm high)', () => {
      const pieces = [{ width: 2, height: 15 }];
      const result = calculator.calculate(pieces);
      expect(result.isValid).toBe(true);
      expect(result.boardsNeeded).toBe(1);
    });

    test('should reject a piece 1.99cm wide (below minimum width)', () => {
      expect(() => calculator.calculate([{ width: 1.99, height: 100 }])).toThrow(
        InvalidPieceException
      );
    });

    test('should reject a piece 14.99cm high (below minimum height)', () => {
      expect(() => calculator.calculate([{ width: 100, height: 14.99 }])).toThrow(
        InvalidPieceException
      );
    });

    test('should not auto-rotate: 15cm wide x 2cm high is rejected', () => {
      expect(() => calculator.calculate([{ width: 15, height: 2 }])).toThrow(InvalidPieceException);
    });

    test('should name the violated minimum in the error message', () => {
      expect(() => calculator.calculate([{ width: 1, height: 10 }])).toThrow(
        /Width \(1cm\) below minimum \(2cm\).*Height \(10cm\) below minimum \(15cm\)/
      );
    });

    test('should accept custom minimums through the constructor options', () => {
      const strict = new CuttingCalculator(standardBoard, {
        minPieceWidthCm: 50,
        minPieceHeightCm: 60,
      });
      expect(() => strict.calculate([{ width: 49, height: 100 }])).toThrow(InvalidPieceException);
      expect(() => strict.calculate([{ width: 50, height: 59 }])).toThrow(InvalidPieceException);
      expect(strict.calculate([{ width: 50, height: 60 }]).isValid).toBe(true);
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
      // 1 m² needed of 1 whole board (6 m²) -> waste = 5 / 6 * 100 ~= 83.33%
      expect(result.wastePercentage).toBeCloseTo(83.33, 1);
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

  describe('Boards needed (whole boards)', () => {
    // A single piece can never need >1 board without exceeding the board's
    // own dimensions (which validatePiece forbids) — these ratios need multiple pieces.
    test('exactly one board stays 1', () => {
      const result = calculator.calculate([{ width: 300, height: 200 }]);
      expect(result.boardsNeeded).toBe(1);
    });

    test('used area slightly above one board needs 2 boards', () => {
      const pieces = [
        { width: 300, height: 200 }, // 6 m² (full board)
        { width: 30, height: 20 }, // 0.06 m²
      ];
      const result = calculator.calculate(pieces);
      expect(result.boardsNeeded).toBe(2);
    });

    test('a tiny overflow of 0.0001 m2 still needs 2 boards', () => {
      const pieces = [
        { width: 300, height: 200 },
        { width: 2, height: 50 }, // 100 cm2 = 0.01 m2
      ];
      expect(calculator.calculate(pieces).boardsNeeded).toBe(2);
    });

    test('exactly two boards stays 2', () => {
      const pieces = [
        { width: 300, height: 200 },
        { width: 300, height: 200 },
      ];
      expect(calculator.calculate(pieces).boardsNeeded).toBe(2);
    });

    test('boards needed is always a whole number', () => {
      const result = calculator.calculate([
        { width: 123.4, height: 56.7 },
        { width: 80, height: 90 },
      ]);
      expect(Number.isInteger(result.boardsNeeded)).toBe(true);
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
