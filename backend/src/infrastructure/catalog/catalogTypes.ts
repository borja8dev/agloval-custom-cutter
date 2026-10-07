export type CatalogUnit = 'UD' | 'M2' | 'ML'

export interface CatalogItem {
  sku: string
  familyCode: string
  /** Cleaned description (prefixes stripped, whitespace collapsed). */
  name: string
  /** Trimmed original description, prefixes kept. */
  rawDescription: string
  unit: CatalogUnit
  /** pvp1 as a JS number (dot decimal). */
  price: number
  widthCm?: number
  heightCm?: number
  lengthCm?: number
  thicknessMm?: number
}

export type SkipReason =
  | 'EMPTY_ROW'
  | 'MISSING_FIELD'
  | 'INVALID_PRICE'
  | 'UNKNOWN_UNIT'
  | 'DUPLICATE_SKU'
  | 'M2_WITHOUT_DIMENSIONS'
  | 'ML_WITHOUT_LENGTH'

export type WarningCode =
  | 'PERCENT_PREFIX'
  | 'DOT_PREFIX'
  | 'DUPLICATE_DESCRIPTION'
  | 'DIMENSIONS_MISMATCH'

export interface SkippedRow {
  /** 1-based line number in the file. */
  line: number
  reason: SkipReason
  raw: string
}

export interface Warning {
  line: number
  sku: string
  code: WarningCode
  message: string
}

export interface ParseSummary {
  totalRows: number
  imported: number
  byUnit: Record<CatalogUnit, number>
  byFamily: Record<string, number>
}

export interface ParseResult {
  items: CatalogItem[]
  skipped: SkippedRow[]
  warnings: Warning[]
  summary: ParseSummary
}
