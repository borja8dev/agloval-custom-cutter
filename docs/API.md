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

**Pricing:** boards are bought whole, so M2 products are billed by whole boards. `boardsNeeded = ceil(totalAreaNeeded / board area)` (an integer, minimum 1; a small tolerance keeps float noise from adding a board) is an **area-based estimate**, not a nesting layout: 3.7 boards of area bill 4. `pricing.pricePerBoard = board area x pricePerM2`, rounded to cents once, and `totalPrice = boardsNeeded x pricePerBoard` in exact cents, so the unit price times the count equals the total. Legacy products without `pricePerM2` use `pricePerUnit` as the board price. `wastePercentage` is still returned (share of the boards to buy that is not used).
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

## Orders

### `POST /api/orders/quote`

Prices a whole order made of lines for different products. **Stateless**: nothing is stored, the client re-sends the full order on every change. Returns `200` (no resource is created).

**Body:**

```json
{
  "lines": [
    { "productId": "clv9t1a2k0001zzz9qqqqqqqq", "pieces": [{ "width": 100, "height": 80, "quantity": 20 }, { "width": 50, "height": 30 }] },
    { "productId": "clv9t1a2k0002zzz9qqqqqqqq", "quantity": 12 }
  ]
}
```

- `lines`: 1-100 lines. Several lines for the same product are merged before pricing: for `M2` the pieces of all its lines share the same boards, for `UD`/`ML` the quantities are summed. Groups in the response are ordered by first appearance.
- `M2` product: the line must have `pieces` (1-200) and no `quantity`. Each piece is `{ width, height, quantity? }` in cm (decimals allowed), `quantity` an integer 1-10000 defaulting to 1 (N identical pieces). Same limits as `POST /api/calculations`: at least **2 cm wide x 15 cm high** and not larger than the board.
- `UD` or `ML` product: the line must have an integer `quantity` 1-100000 and no `pieces`.

**Pricing:** every amount is computed in integer cents with a single rounding per group; `total` is the sum of the group prices, never a re-rounded float sum.

- `BOARD` (`M2`): billed by whole boards, exactly like `POST /api/calculations`: `boardsNeeded = ceil(usedAreaM2 / boardAreaM2)` (minimum 1, an area-based estimate), `pricePerBoard = boardAreaM2 x pricePerM2` rounded to cents once, and `price = boardsNeeded x pricePerBoard` in cents (legacy rows without `pricePerM2` use `pricePerUnit` as the board price and show `pricePerUnit / boardAreaM2` as `pricePerM2`). `pieceCount` counts every copy and `usedAreaM2` is the area of all pieces.
- `UNIT` (`UD`): `price = unitPrice x quantity`.
- `LINEAR` (`ML`): `pricePerUnit` is the price per **metre**, `price = pricePerMeter x lengthM x quantity` where `quantity` is the number of bars and `lengthM` the length of one bar.

```bash
curl -X POST http://localhost:5000/api/orders/quote \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [
      { "productId": "clv9t1a2k0001zzz9qqqqqqqq", "pieces": [{ "width": 100, "height": 80, "quantity": 20 }, { "width": 50, "height": 30 }] },
      { "productId": "clv9t1a2k0002zzz9qqqqqqqq", "quantity": 12 },
      { "productId": "clv9t1a2k0003zzz9qqqqqqqq", "quantity": 3 }
    ]
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "kind": "BOARD",
        "product": { "id": "clv9t1a2k0001zzz9qqqqqqqq", "sku": "MEL-0001", "name": "Melamina Blanca 244x122", "unit": "M2", "familyCode": "MEL", "familyName": "Melamina", "thickness": 16, "boardWidth": 244, "boardHeight": 122, "lengthCm": null },
        "pieces": [{ "width": 100, "height": 80, "quantity": 20 }, { "width": 50, "height": 30, "quantity": 1 }],
        "pieceCount": 21,
        "usedAreaM2": 16.15,
        "boardAreaM2": 2.9768,
        "boardsNeeded": 6,
        "pricePerM2": 15.5,
        "pricePerBoard": 46.14,
        "price": 276.84
      },
      {
        "kind": "UNIT",
        "product": { "id": "clv9t1a2k0002zzz9qqqqqqqq", "sku": "FER-0012", "name": "Tornillo", "unit": "UD", "familyCode": "FER", "familyName": "Ferreteria", "thickness": null, "boardWidth": null, "boardHeight": null, "lengthCm": null },
        "quantity": 12,
        "unitPrice": 0.35,
        "price": 4.2
      },
      {
        "kind": "LINEAR",
        "product": { "id": "clv9t1a2k0003zzz9qqqqqqqq", "sku": "PER-0003", "name": "Perfil 2.4 m", "unit": "ML", "familyCode": "PER", "familyName": "Perfiles", "thickness": null, "boardWidth": null, "boardHeight": null, "lengthCm": 240 },
        "quantity": 3,
        "lengthM": 2.4,
        "pricePerMeter": 5,
        "price": 36
      }
    ],
    "total": 317.04,
    "currency": "EUR",
    "calculatedAt": "2026-10-09T10:00:00.000Z"
  }
}
```

`wastePercentage` is intentionally not part of this response. The `product` object has the same shape in every group; `boardWidth`/`boardHeight` are set for `M2` only and `lengthCm` for `ML` only.

**Errors:**

- `404 PRODUCT_NOT_FOUND`: a line references an unknown product.
- `400 INVALID_ORDER_LINE`: the line does not fit the product's unit (pieces on a `UD`/`ML` product, or a quantity on an `M2` product). The message names the product and its unit.
- `400 VALIDATION_ERROR`: malformed body (empty or oversized `lines`, a line with both or neither of `pieces`/`quantity`, a non-integer or out-of-range quantity, a piece below the 2 x 15 cm minimum, an invalid product id).
- `400 INVALID_PIECE`: a piece is larger than the board of its product.
- `500 INCOMPLETE_PRODUCT`: a catalog product lacks board dimensions (`M2`) or bar length (`ML`).

### `POST /api/orders/submit`

Confirms an order: the server prices the lines again (client prices are never trusted), emails the quote to the customer and, when `ORDER_NOTIFICATION_EMAIL` is set, to Agloval. Nothing is stored yet; `orderNumber` is the per-browser number the customer saw ("Pedido nº N"). Limited to 5 requests per IP every 10 minutes, a budget shared with `POST /api/quotes/submit`.

**Request:**

```json
{
  "orderNumber": 12,
  "customer": { "name": "Lucía Ferrer", "email": "lucia@example.com", "phone": "+34 600 123 456" },
  "reference": "Obra Calle Mayor",
  "fromQuoteNumber": 4,
  "privacyAccepted": true,
  "lines": [
    { "productId": "clv9t1a2k0001zzz9qqqqqqqq", "pieces": [{ "width": 100, "height": 80, "quantity": 2 }] },
    { "productId": "clv9t1a2k0002zzz9qqqqqqqq", "quantity": 12 }
  ]
}
```

- `orderNumber`: integer, 1 to 1,000,000.
- `customer.name`: 2 to 100 characters after trimming.
- `customer.email`: a valid address, at most 254 characters.
- `customer.phone`: digits, spaces, `+`, `(`, `)` and `-` only, with 6 to 15 digits.
- `reference` (optional): the customer's own label for the job. Trimmed; blank counts as absent. At most 80 characters, no control characters (line breaks, tabs).
- `fromQuoteNumber` (optional): the quote this order comes from ("Pasar a pedido"), integer, 1 to 1,000,000.
- `privacyAccepted`: must be `true`.
- `lines`: exactly as in `POST /api/orders/quote`.

Both emails show "Referencia: …" and "Desde el presupuesto nº M" when those fields are present, and the Agloval subject becomes `Nuevo pedido nº N · Name · Reference`.

**Response:** `201`

```json
{
  "success": true,
  "data": {
    "orderNumber": 12,
    "quote": { "groups": [ ... ], "total": 50.34, "currency": "EUR", "calculatedAt": "2026-10-22T10:00:00.000Z" },
    "emails": { "customer": "sent", "agloval": "skipped" }
  },
  "timestamp": "...",
  "requestId": "..."
}
```

`quote` has the same shape as the `POST /api/orders/quote` response. `emails.agloval` is `"skipped"` while `ORDER_NOTIFICATION_EMAIL` is unset. The Agloval email (when sent) goes first and has `Reply-To` set to the customer; the customer email follows.

```bash
curl -X POST http://localhost:5000/api/orders/submit \
  -H "Content-Type: application/json" \
  -d '{"orderNumber":12,"customer":{"name":"Lucía Ferrer","email":"lucia@example.com","phone":"600 123 456"},"privacyAccepted":true,"lines":[{"productId":"clv9t1a2k0002zzz9qqqqqqqq","quantity":12}]}'
```

**Errors:**

- `400 VALIDATION_ERROR`: malformed body. Customer fields carry Spanish messages for the form ("Introduce tu nombre", "Introduce un correo válido", "Introduce un teléfono válido", "Debes aceptar la política de privacidad", "La referencia no puede superar 80 caracteres", "La referencia contiene caracteres no válidos") in `details.fieldErrors`.
- `404 PRODUCT_NOT_FOUND`, `400 INVALID_ORDER_LINE`, `400 INVALID_PIECE`, `500 INCOMPLETE_PRODUCT`: as in `POST /api/orders/quote`.
- `429 TOO_MANY_REQUESTS`: more than 5 submissions (orders and quotes together) from the same IP within 10 minutes (counted before validation). A `Retry-After` header gives the seconds left.
- `502 EMAIL_DELIVERY_FAILED`: the mail server refused or did not answer. The message is "No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos." If the Agloval email went out and the customer email failed, a retry emails Agloval again.

---

## Quotes

### `POST /api/quotes/submit`

Saves a quote for the customer: the server prices the lines again (client prices are never trusted) and emails the quote **to the customer only**. Agloval is never emailed, whatever `ORDER_NOTIFICATION_EMAIL` says; it hears about the job once the quote becomes an order (`POST /api/orders/submit` with `fromQuoteNumber`). Nothing is stored; `quoteNumber` is the per-browser number the customer saw ("Presupuesto nº N"). Shares the per-IP limit of `POST /api/orders/submit`: 5 submissions of either kind every 10 minutes.

**Request:**

```json
{
  "quoteNumber": 4,
  "customer": { "name": "Lucía Ferrer", "email": "lucia@example.com", "phone": "+34 600 123 456" },
  "reference": "Obra Calle Mayor",
  "privacyAccepted": true,
  "lines": [
    { "productId": "clv9t1a2k0001zzz9qqqqqqqq", "pieces": [{ "width": 100, "height": 80, "quantity": 2 }] },
    { "productId": "clv9t1a2k0002zzz9qqqqqqqq", "quantity": 12 }
  ]
}
```

- `quoteNumber`: integer, 1 to 1,000,000.
- `customer`, `reference`, `privacyAccepted`, `lines`: as in `POST /api/orders/submit`.

The email's subject is `Tu presupuesto · Presupuesto nº N`; it shows the breakdown, the total, "Referencia: …" when present, and a note that prices follow the current price list.

**Response:** `201`

```json
{
  "success": true,
  "data": {
    "quoteNumber": 4,
    "quote": { "groups": [ ... ], "total": 50.34, "currency": "EUR", "calculatedAt": "2026-10-22T10:00:00.000Z" },
    "emails": { "customer": "sent" }
  },
  "timestamp": "...",
  "requestId": "..."
}
```

`quote` has the same shape as the `POST /api/orders/quote` response.

```bash
curl -X POST http://localhost:5000/api/quotes/submit \
  -H "Content-Type: application/json" \
  -d '{"quoteNumber":4,"customer":{"name":"Lucía Ferrer","email":"lucia@example.com","phone":"600 123 456"},"privacyAccepted":true,"lines":[{"productId":"clv9t1a2k0002zzz9qqqqqqqq","quantity":12}]}'
```

**Errors:** the same as `POST /api/orders/submit`: `400 VALIDATION_ERROR` with the same Spanish messages, the quote errors, `429 TOO_MANY_REQUESTS` (shared budget) and `502 EMAIL_DELIVERY_FAILED`.

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

- `unit`: `UD` (sold by the piece), `M2` (boards, billed by whole boards at `pricePerM2 x board area`) or `ML` (fixed length bar, `lengthCm`).
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
| `INVALID_ORDER_LINE` | 400 | An order quote line does not fit its product's unit |
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
| `INCOMPLETE_PRODUCT` | 500 | An order quote references a product without board dimensions (M2) or bar length (ML) |
| `TOO_MANY_REQUESTS` | 429 | Too many order or quote submissions from one IP (Spanish message) |
| `EMAIL_DELIVERY_FAILED` | 502 | An order or quote email could not be sent (Spanish message) |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled error — message only shown outside production |
