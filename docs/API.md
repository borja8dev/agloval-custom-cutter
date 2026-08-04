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
- `requestedPieces`: required, 1–100 pieces, each `{ width, height }` in cm, both positive and finite.
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
      "totalAreaNeeded": 4.5,
      "boardsNeeded": 0.8,
      "wastePercentage": 6.25,
      "pieceCount": 2,
      "averagePieceSize": 2.25
    },
    "pricing": { "pricePerBoard": 95.5, "boardsNeeded": 0.8, "totalPrice": 76.4, "currency": "EUR" },
    "metadata": { "calculatedAt": "2026-08-01T...", "validUntilDays": 30, "status": "DRAFT" }
  }
}
```

**Errors:** `400 VALIDATION_ERROR` (bad shape), `400 INVALID_PIECE` / `400 EMPTY_PIECES_LIST` / `400 INVALID_BOARD_DIMENSIONS` (domain rule violations, e.g. a piece bigger than the board), `404 PRODUCT_NOT_FOUND`.

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

**Response `200`:** same shape as `POST`, with `id`/`product` unchanged and `calculation`/`pricing` recomputed.

**Errors:** `400 VALIDATION_ERROR`, `404 CALCULATION_NOT_FOUND`, `409 INVALID_CALCULATION_STATUS` (calculation isn't DRAFT — e.g. already SUBMITTED or COMPLETED).

### `DELETE /api/calculations/:id`

Deletes a **DRAFT** calculation. `204 No Content` on success.

```bash
curl -X DELETE http://localhost:5000/api/calculations/cmsals6ur0001ftexloh38wgc
```

**Errors:** `404 CALCULATION_NOT_FOUND`, `409 INVALID_CALCULATION_STATUS`.

---

## Products

### `GET /api/products?limit=&skip=`

Lists products (default `limit` 50, default `skip` 0). `200` with `{ products: ProductRecord[], count: number }`.

```bash
curl "http://localhost:5000/api/products?limit=20&skip=0"
```

### `GET /api/products/:id`

Fetches a product. `200`, or `404 PRODUCT_NOT_FOUND`.

```bash
curl http://localhost:5000/api/products/clv9t1a2k0001zzz9qqqqqqqq
```

### `GET /api/products/search?q=&limit=&skip=`

Case-insensitive search over name/description. `q` must be at least 2 characters. `200` with `{ products, count }`, or `400 INVALID_QUERY`.

```bash
curl "http://localhost:5000/api/products/search?q=melamina&limit=20&skip=0"
```

A `ProductRecord`:

```json
{
  "id": "clv9t1a2k0001zzz9qqqqqqqq",
  "name": "Melamina Blanca 300x200",
  "categoryName": "Melamina",
  "standardWidth": 300,
  "standardHeight": 200,
  "thickness": 18,
  "pricePerUnit": 95.5,
  "currency": "EUR"
}
```

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
| `INVALID_QUERY` | 400 | Search query too short |
| `DUPLICATE_ENTRY` | 409 | Prisma unique-constraint violation |
| `INVALID_CALCULATION_STATUS` | 409 | Update/delete attempted on a non-DRAFT calculation |
| `UNAUTHORIZED` | 401 | No user identity (see Known Limitations) |
| `PRODUCT_NOT_FOUND` | 404 | |
| `CALCULATION_NOT_FOUND` | 404 | |
| `RECORD_NOT_FOUND` | 404 | Prisma foreign-key/record-not-found error, translated |
| `NOT_FOUND` | 404 | Unknown route |
| `INVALID_DATA` | 400 | Any other Prisma request error, translated |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled error — message only shown outside production |
