import {
  buildAglovalEmail,
  buildCustomerEmail,
  buildQuoteEmail,
  formatEuros,
} from '../../../src/application/notifications/orderEmails';
import { SubmittedOrder } from '../../../src/application/dto/OrderSubmit';
import { SubmittedQuote } from '../../../src/application/dto/QuoteSubmit';
import { OrderQuoteProductDTO } from '../../../src/application/dto/OrderQuote';

const baseProduct: OrderQuoteProductDTO = {
  id: 'clv9t1a2k0001zzz9qqqqqqqq',
  sku: 'SKU',
  name: 'Product',
  unit: 'UD',
  familyCode: 'MEL',
  familyName: 'Melamina',
  thickness: null,
  boardWidth: null,
  boardHeight: null,
  lengthCm: null,
};

const order: SubmittedOrder = {
  orderNumber: 42,
  customer: { name: 'Ana García', email: 'ana@example.com', phone: '+34 600 12 34 56' },
  quote: {
    groups: [
      {
        kind: 'BOARD',
        product: { ...baseProduct, name: 'Melamina blanca 16 mm', unit: 'M2' },
        pieces: [{ width: 100, height: 80, quantity: 20 }],
        pieceCount: 20,
        usedAreaM2: 16,
        boardAreaM2: 2.9768,
        boardsNeeded: 6,
        pricePerM2: 15.5,
        pricePerBoard: 46.14,
        price: 276.84,
      },
      {
        kind: 'UNIT',
        product: { ...baseProduct, name: 'Tornillo 4x30' },
        quantity: 12,
        unitPrice: 0.35,
        price: 4.2,
      },
      {
        kind: 'LINEAR',
        product: { ...baseProduct, name: 'Canto PVC', unit: 'ML', lengthCm: 240 },
        quantity: 3,
        lengthM: 2.4,
        pricePerMeter: 5,
        price: 36,
      },
    ],
    total: 1317.04,
    currency: 'EUR',
    calculatedAt: '2026-10-22T10:00:00.000Z',
  },
};

const hostileOrder: SubmittedOrder = {
  ...order,
  customer: {
    name: '<script>alert("x")</script> O\'Brien & Co',
    email: '"evil"@example.com',
    phone: '<b>600</b>',
  },
  quote: {
    ...order.quote,
    groups: [
      {
        kind: 'UNIT',
        product: { ...baseProduct, name: 'Bisagra <img src=x onerror=alert(1)>' },
        quantity: 1,
        unitPrice: 2,
        price: 2,
      },
    ],
  },
};

const singleOrder: SubmittedOrder = {
  ...order,
  quote: {
    ...order.quote,
    groups: [
      {
        kind: 'BOARD',
        product: { ...baseProduct, name: 'Melamina blanca 16 mm', unit: 'M2' },
        pieces: [{ width: 100, height: 80, quantity: 1 }],
        pieceCount: 1,
        usedAreaM2: 0.8,
        boardAreaM2: 2.9768,
        boardsNeeded: 1,
        pricePerM2: 15.5,
        pricePerBoard: 46.14,
        price: 46.14,
      },
      {
        kind: 'LINEAR',
        product: { ...baseProduct, name: 'Canto PVC', unit: 'ML', lengthCm: 240 },
        quantity: 1,
        lengthM: 2.4,
        pricePerMeter: 5,
        price: 12,
      },
    ],
  },
};

const referencedOrder: SubmittedOrder = {
  ...order,
  reference: 'Obra Calle Mayor',
  fromQuoteNumber: 7,
};

const MALICIOUS_REFERENCE = '<script>alert(1)</script> & "co"';

const quoteDoc: SubmittedQuote = {
  quoteNumber: 5,
  customer: order.customer,
  quote: order.quote,
};

describe('singular and plural counts', () => {
  test.each([
    ['customer', buildCustomerEmail],
    ['Agloval', buildAglovalEmail],
  ] as const)('the %s email says "1 pieza", "1 tablero" and "1 barra"', (_name, build) => {
    const email = build(singleOrder);
    for (const body of [email.text, email.html]) {
      expect(body).toContain('1 pieza,');
      expect(body).toContain('1 tablero ×');
      expect(body).toContain('1 barra ×');
      expect(body).not.toMatch(/\b1 (piezas|tableros|barras)\b/);
    }
  });

  test('keeps the plural for more than one', () => {
    const { text } = buildCustomerEmail(order);
    expect(text).toContain('20 piezas,');
    expect(text).toContain('6 tableros ×');
    expect(text).toContain('3 barras ×');
  });
});

describe('order reference and source quote', () => {
  test.each([
    ['customer', buildCustomerEmail],
    ['Agloval', buildAglovalEmail],
  ] as const)('the %s email shows the reference and the source quote', (_name, build) => {
    const email = build(referencedOrder);
    for (const body of [email.text, email.html]) {
      expect(body).toContain('Referencia: Obra Calle Mayor');
      expect(body).toContain('Desde el presupuesto nº 7');
    }
  });

  test.each([
    ['customer', buildCustomerEmail],
    ['Agloval', buildAglovalEmail],
  ] as const)('the %s email omits both lines when absent', (_name, build) => {
    const email = build(order);
    for (const body of [email.text, email.html]) {
      expect(body).not.toContain('Referencia');
      expect(body).not.toContain('Desde el presupuesto');
    }
  });

  test('the Agloval subject ends with the reference when present', () => {
    expect(buildAglovalEmail(referencedOrder).subject).toBe(
      'Nuevo pedido nº 42 · Ana García · Obra Calle Mayor'
    );
  });

  test.each([
    ['customer', buildCustomerEmail],
    ['Agloval', buildAglovalEmail],
  ] as const)('the %s email escapes a malicious reference in the HTML', (_name, build) => {
    const { html, text } = build({ ...order, reference: MALICIOUS_REFERENCE });
    expect(html).not.toContain('<script>');
    expect(html).toContain(
      'Referencia: &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;co&quot;'
    );
    expect(text).toContain(`Referencia: ${MALICIOUS_REFERENCE}`);
  });
});

describe('buildQuoteEmail', () => {
  const email = buildQuoteEmail(quoteDoc);

  test('uses the Spanish subject with the quote number', () => {
    expect(email.subject).toBe('Tu presupuesto · Presupuesto nº 5');
  });

  test.each(['html', 'text'] as const)(
    'the %s version has the heading, greeting, breakdown, total and note',
    (part) => {
      const body = email[part];
      expect(body).toContain('Presupuesto nº 5');
      expect(body).toContain('Hola Ana García');
      expect(body).toContain('6 tableros × 46,14 €');
      expect(body).toContain('12 uds. × 0,35 €');
      expect(body).toContain('3 barras × 2,40 m × 5,00 €/m');
      expect(body).toContain('1.317,04 €');
      expect(body).toContain(
        'Precios según la tarifa vigente. Agloval te confirmará disponibilidad y entrega ' +
          'cuando lo pases a pedido.'
      );
      expect(body).toContain('Agloval · Aglomerados Valencia S.L.');
      expect(body).not.toContain('Referencia');
    }
  );

  test('the text version contains no HTML', () => {
    expect(email.text).not.toMatch(/<[a-z/][^>]*>/i);
  });

  test('has no reply-to address', () => {
    expect(email).not.toHaveProperty('replyTo');
  });

  test('shows the reference when present', () => {
    const { html, text } = buildQuoteEmail({ ...quoteDoc, reference: 'Baño' });
    expect(text).toContain('Referencia: Baño');
    expect(html).toContain('Referencia: Baño');
  });

  test('escapes customer data and a malicious reference in the HTML', () => {
    const { html, text } = buildQuoteEmail({
      ...quoteDoc,
      customer: hostileOrder.customer,
      reference: MALICIOUS_REFERENCE,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('Referencia: &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(text).toContain(`Referencia: ${MALICIOUS_REFERENCE}`);
  });
});

describe('formatEuros', () => {
  test.each([
    [0, '0,00 €'],
    [4.2, '4,20 €'],
    [1317.04, '1.317,04 €'],
    [1234567.891, '1.234.567,89 €'],
  ])('formats %p as %p', (value, expected) => {
    expect(formatEuros(value)).toBe(expected);
  });
});

describe('buildCustomerEmail', () => {
  const email = buildCustomerEmail(order);

  test('uses the Spanish subject with the order number', () => {
    expect(email.subject).toBe('Hemos recibido tu solicitud · Pedido nº 42');
  });

  test.each(['html', 'text'] as const)(
    'the %s version greets, prices every group and signs',
    (part) => {
      const body = email[part];
      expect(body).toContain('Ana García');
      // Boards: used m², boards x price per board
      expect(body).toContain('Melamina blanca 16 mm');
      expect(body).toContain('16,00 m²');
      expect(body).toContain('6 tableros × 46,14 €');
      expect(body).toContain('276,84 €');
      // Units: quantity x unit price
      expect(body).toContain('Tornillo 4x30');
      expect(body).toContain('12 uds. × 0,35 €');
      expect(body).toContain('4,20 €');
      // Bars: bars x length x price per metre
      expect(body).toContain('Canto PVC');
      expect(body).toContain('3 barras × 2,40 m × 5,00 €/m');
      expect(body).toContain('36,00 €');
      // Total and closing
      expect(body).toContain('1.317,04 €');
      expect(body).toContain(
        'Agloval revisará tu pedido y te confirmará la disponibilidad y la entrega.'
      );
      expect(body).toContain('Agloval · Aglomerados Valencia S.L.');
    }
  );

  test('the text version contains no HTML', () => {
    expect(email.text).not.toMatch(/<[a-z/][^>]*>/i);
  });

  test('the HTML uses the brand colour for headings', () => {
    expect(email.html).toContain('#00628F');
  });

  test('escapes customer data and product names in the HTML', () => {
    const { html, text } = buildCustomerEmail(hostileOrder);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; O&#39;Brien &amp; Co'
    );
    expect(html).toContain('Bisagra &lt;img src=x onerror=alert(1)&gt;');
    // The plain text is not HTML, so it keeps the raw characters.
    expect(text).toContain('<script>alert("x")</script> O\'Brien & Co');
  });
});

describe('buildAglovalEmail', () => {
  const email = buildAglovalEmail(order);

  test('uses the Spanish subject with the order number and customer name', () => {
    expect(email.subject).toBe('Nuevo pedido nº 42 · Ana García');
  });

  test.each(['html', 'text'] as const)(
    'the %s version has the customer data, breakdown and total',
    (part) => {
      const body = email[part];
      expect(body).toContain('Ana García');
      expect(body).toContain('ana@example.com');
      expect(body).toContain('+34 600 12 34 56');
      expect(body).toContain('6 tableros × 46,14 €');
      expect(body).toContain('12 uds. × 0,35 €');
      expect(body).toContain('3 barras × 2,40 m × 5,00 €/m');
      expect(body).toContain('1.317,04 €');
    }
  );

  test('replies go to the customer', () => {
    expect(email.replyTo).toBe('ana@example.com');
  });

  test('the text version contains no HTML', () => {
    expect(email.text).not.toMatch(/<[a-z/][^>]*>/i);
  });

  test('escapes customer data in the HTML and subject stays plain text', () => {
    const { html, subject } = buildAglovalEmail(hostileOrder);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>600</b>');
    expect(html).toContain('&quot;evil&quot;@example.com');
    expect(html).toContain('&lt;b&gt;600&lt;/b&gt;');
    expect(subject).toBe('Nuevo pedido nº 42 · <script>alert("x")</script> O\'Brien & Co');
  });
});
