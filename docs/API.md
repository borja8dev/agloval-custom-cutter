# API Reference

Base URL (dev): `http://localhost:5000`

Every response is wrapped as:

```json
{ "success": true, "data": { ... }, "timestamp": "...", "requestId": "..." }
```

or, on error:

```json
{ "success": false, "error": { "code": "...", "message": "...", "details": {} }, "timestamp": "...", "requestId": "..." }
```

`requestId` is a short id logged server-side alongside the request — useful for correlating a client-reported error with server logs. `details` is only present on validation errors (Zod's flattened field errors).

---

## Calculations

### `POST /api/calculations`

Calculates a cutting quote against a product's standard board and persists it.

**Body:**

```json
{
  "productId": "clv9t1a2k0001zzz9qqqqqqqq",
  "requestedPieces": [
    { "width": 200, "height": 100 },
    { "width": 250, "height": 120 }
  ],
  "userId": null,
  "metadata": { "source": "web" }
}
```

- `productId`: required, must be a valid CUID matching an existing product.
- `requestedPieces`: required, 1–100 pieces, each `{ width, height }` in cm, both finite. Minimum piece size is **2 cm wide x 15 cm high**, applied to each dimension as entered (a piece is never rotated to fit: 15 x 2 is rejected). The limits are the constants `MIN_PIECE_WIDTH_CM` and `MIN_PIECE_HEIGHT_CM` in `backend/src/domain/constants.ts`.
- Only `M2` products can be calculated; any other unit returns `400 UNSUPPORTED_PRODUCT_UNIT`.

**Pricing:** M2 products are billed by **whole boards** at `pricePerM2`: `boardsNeeded = ceil(totalAreaNeeded / board area)` (always an integer) and `totalPrice = boardsNeeded x board area x pricePerM2`, rounded once to 2 decimals. `pricing.pricePerBoard` is the whole-board price snapshot (`board area x pricePerM2`, 2 decimals), so history keeps showing the quoted price. Legacy products without `pricePerM2` fall back to `boardsNeeded x pricePerUnit`. `wastePercentage` is still returned (share of the purchased boards not used).
- `userId`, `metadata`: optional. `userId` is stored as-is — there's no auth, so this is not verified against anything (see [Known Limitations](../README.md#known-limitations)).

```bash
curl -X POST http://localhost:5000/api/calculations \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "clv9t1a2k0001zzz9qqqqqqqq",
    "requestedPieces": [
      { "width": 200, "height": 100 },
      { "width": 250, "height": 120 }
    ],
    "metadata": { "source": "web" }
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": "cmsals6ur0001ftexloh38wgc",
    "product": { "id": "...", "name": "Melamina Blanca 300x200", "categoryName": "Melamina" },
    "board": { "width": 300, "height": 200, "thickness": 18, "area": 6 },
    "requestedPieces": [{ "width": 200, "height": 100 }, { "width": 250, "height": 120 }],
    "calculation": {
      "totalAreaNeeded": 5,
      "boardsNeeded": 1,
      "wastePercentage": 16.67,
      "pieceCount": 2,
      "averagePieceSize": 2.5
    },
    "pricing": { "pricePerBoard": 93, "boardsNeeded": 1, "totalPrice": 93, "currency": "EUR" },
    "metadata": { "calculatedAt": "2026-08-01T...", "validUntilDays": 30, "status": "DRAFT" }
  }
}
```

`board.thickness` is `number | null` (mm); it is `null` when the catalog has no thickness for the product.

**Errors:** `400 VALIDATION_ERROR` (bad shape or a piece below the minimum size), `400 UNSUPPORTED_PRODUCT_UNIT`, `400 INVALID_PIECE` / `400 EMPTY_PIECES_LIST` / `400 INVALID_BOARD_DIMENSIONS` (domain rule violations, e.g. a piece bigger than the board), `404 PRODUCT_NOT_FOUND`.

### `GET /api/calculations/:id`

Fetches a calculation by id. `200` with the same shape as above, or `404 CALCULATION_NOT_FOUND`.

```bash
curl http://localhost:5000/api/calculations/cmsals6ur0001ftexloh38wgc
```

### `GET /api/calculations?userId=&limit=&skip=`

Lists calculations. **Currently always returns `401 UNAUTHORIZED`** — see [Known Limitations](../README.md#known-limitations). Not fixed as part of this phase; real auth is its own future scope.

```bash
curl "http://localhost:5000/api/calculations?userId=usr_123&limit=20&skip=0"
```

### `PUT /api/calculations/:id`

Recomputes a **DRAFT** calculation from a new set of pieces — re-runs the same domain calculation used on create, it does not accept raw totals from the client.

**Body:** `{ "requestedPieces": [{ "width": 200, "height": 100 }] }`

```bash
curl -X PUT http://localhost:5000/api/calculations/cmsals6ur0001ftexloh38wgc \
  -H "Content-Type: application/json" \
  -d '{ "requestedPieces": [{ "width": 200, "height": 100 }] }'
```

**Response `200`:** same shape as `POST`, with `id`/`product` unchanged and `calculation`/`pricing` recomputed (a re-quote: boards, `pricePerBoard` and `totalPrice` use the product's current prices and the same whole-board formula as `POST`).

**Errors:** `400 VALIDATION_ERROR`, `404 CALCULATION_NOT_FOUND`, `409 INVALID_CALCULATION_STATUS` (calculation isn't DRAFT — e.g. already SUBMITTED or COMPLETED).

### `DELETE /api/calculations/:id`

Deletes a **DRAFT** calculation. `204 No Content` on success.

```bash
curl -X DELETE http://localhost:5000/api/calculations/cmsals6ur0001ftexloh38wgc
```

**Errors:** `404 CALCULATION_NOT_FOUND`, `409 INVALID_CALCULATION_STATUS`.

Reading or updating a calculation whose product has no board dimensions (a data-integrity problem, since calculations only exist for M2 products) returns `500 MISSING_BOARD_DIMENSIONS`.

---

## Families

### `GET /api/families`

Lists every product family (a `Category`, identified by its `code`) sorted by `code`, with how many products it has per unit. A family with no products is included with zero counts.

```bash
curl http://localhost:5000/api/families
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "families": [
      { "code": "MEL", "name": "Melamina", "productCount": 12, "units": { "UD": 2, "M2": 9, "ML": 1 } }
    ],
    "count": 1
  }
}
```

---

## Products

The list and search endpoints share two optional filters and the same pagination. Both filters are exact matches and can be combined:

- `family`: family code, e.g. `MEL`. An unknown code is not an error, it returns an empty list. An empty value (`?family=`) is ignored.
- `unit`: one of `UD`, `M2`, `ML` (uppercase). Any other value returns `400 QUERY_VALIDATION_ERROR` with the offending field in `error.details.fieldErrors`. An empty value is ignored.

List responses are `{ products: ProductRecord[], count, total }`: `count` is the number of items in this page, `total` is how many products match the filters across all pages. Order is deterministic: newest first (`createdAt` descending), then `sku` ascending.

### `GET /api/products?family=&unit=&limit=&skip=`

Lists products (default `limit` 50, default `skip` 0).

```bash
curl "http://localhost:5000/api/products?limit=20&skip=0"
curl "http://localhost:5000/api/products?family=MEL&unit=M2&limit=20"
curl "http://localhost:5000/api/products?unit=ML"
```

### `GET /api/products/:id`

Fetches a product. `200` with a `ProductRecord`, or `404 PRODUCT_NOT_FOUND`.

```bash
curl http://localhost:5000/api/products/clv9t1a2k0001zzz9qqqqqqqq
```

### `GET /api/products/search?q=&family=&unit=&limit=&skip=`

Case-insensitive search over name/description. `q` must be at least 2 characters. Accepts the same `family` and `unit` filters. `200` with `{ products, count, total }`, `400 INVALID_QUERY`, or `400 QUERY_VALIDATION_ERROR`.

```bash
curl "http://localhost:5000/api/products/search?q=melamina&limit=20&skip=0"
curl "http://localhost:5000/api/products/search?q=blanca&family=MEL&unit=M2"
```

### `ProductRecord`

```json
{
  "id": "clv9t1a2k0001zzz9qqqqqqqq",
  "sku": "MEL-0001",
  "name": "Melamina Blanca 244x122",
  "unit": "M2",
  "familyCode": "MEL",
  "familyName": "Melamina",
  "categoryName": "Melamina",
  "standardWidth": 244,
  "standardHeight": 122,
  "thickness": 16,
  "lengthCm": null,
  "pricePerUnit": 46.14,
  "pricePerM2": 15.5,
  "currency": "EUR"
}
```

- `unit`: `UD` (sold by the piece), `M2` (sold by board, billed at `pricePerM2`) or `ML` (fixed length bar, `lengthCm`).
- `standardWidth` / `standardHeight` (cm): board size, `null` unless `unit` is `M2`. `thickness` (mm) is nullable. `lengthCm` is set for `ML` only. `pricePerM2` is set for `M2` only.
- `categoryName` is kept for backwards compatibility and always equals `familyName`.

---

## Misc

### `GET /health`

`200` `{ "status": "ok", "timestamp": "..." }`. Unwrapped (not the `success`/`data` envelope) — used for uptime checks, not app data.

```bash
curl http://localhost:5000/health
```

### Error codes reference

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Request body/query failed Zod validation |
| `INVALID_PIECE` | 400 | A piece is too small, too big for the board, or malformed |
| `EMPTY_PIECES_LIST` | 400 | No pieces provided |
| `INVALID_BOARD_DIMENSIONS` | 400 | (Internal — a product's own board dimensions are invalid) |
| `QUERY_VALIDATION_ERROR` | 400 | Query params failed validation (e.g. unknown `unit`) |
| `UNSUPPORTED_PRODUCT_UNIT` | 400 | A calculation was requested for a non-M2 product |
| `INVALID_QUERY` | 400 | Search query too short |
| `DUPLICATE_ENTRY` | 409 | Prisma unique-constraint violation |
| `INVALID_CALCULATION_STATUS` | 409 | Update/delete attempted on a non-DRAFT calculation |
| `UNAUTHORIZED` | 401 | No user identity (see Known Limitations) |
| `PRODUCT_NOT_FOUND` | 404 | |
| `CALCULATION_NOT_FOUND` | 404 | |
| `RECORD_NOT_FOUND` | 404 | Prisma foreign-key/record-not-found error, translated |
| `NOT_FOUND` | 404 | Unknown route |
| `INVALID_DATA` | 400 | Any other Prisma request error, translated |
| `MISSING_BOARD_DIMENSIONS` | 500 | A stored calculation references a product without board dimensions |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled error — message only shown outside production |
