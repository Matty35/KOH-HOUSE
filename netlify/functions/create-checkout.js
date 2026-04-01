/**
 * KOH HOUSE — Netlify Function: create-checkout
 *
 * Creates a Stripe Checkout Session for the items currently in the customer's
 * basket and returns the session's redirect URL. The browser then redirects
 * the user to Stripe's hosted checkout page.
 *
 * Request:  POST /.netlify/functions/create-checkout
 *           Origin: <must match SITE_URL env var>
 *           Body: {
 *             items: [
 *               {
 *                 id:       "aw-001",
 *                 title:    "Fragments of Light III",
 *                 artist:   "Elena Marchetti",
 *                 price:    2400,          // in GBP pounds (not pence)
 *                 imageUrl: "https://...",
 *                 edition:  "12 of 50"    // optional
 *               },
 *               ...
 *             ]
 *           }
 *
 * Response: { url: "https://checkout.stripe.com/..." }  status 200
 *           { error: "..." }                             status 400 / 500
 *
 * Stripe API docs:
 *   https://stripe.com/docs/api/checkout/sessions/create
 *   The API expects application/x-www-form-urlencoded (not JSON).
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY — sk_test_... or sk_live_...
 *   SITE_URL          — full public URL of the site, no trailing slash
 */

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

// ── Required item fields ──────────────────────────────────────────────────────
const REQUIRED_ITEM_FIELDS = ['id', 'title', 'artist', 'price', 'imageUrl'];

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  // ── Origin check — only accept requests from our own site ─────────────────
  // This is a lightweight CSRF defence; the real secret stays server-side.
  const { STRIPE_SECRET_KEY, SITE_URL } = process.env;

  if (!STRIPE_SECRET_KEY || !SITE_URL) {
    console.error('create-checkout: missing required environment variables');
    return respond(500, { error: 'Server configuration error' });
  }

  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (origin && origin !== SITE_URL) {
    console.warn(`create-checkout: rejected request from unexpected origin: ${origin}`);
    return respond(403, { error: 'Forbidden' });
  }

  // ── Parse and validate request body ───────────────────────────────────────
  let items;
  try {
    ({ items } = JSON.parse(event.body || '{}'));
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return respond(400, { error: 'items must be a non-empty array' });
  }

  // Validate each item has the required fields
  for (let i = 0; i < items.length; i++) {
    for (const field of REQUIRED_ITEM_FIELDS) {
      if (!items[i][field] && items[i][field] !== 0) {
        return respond(400, { error: `Item at index ${i} is missing required field: ${field}` });
      }
    }
    if (typeof items[i].price !== 'number' || items[i].price <= 0) {
      return respond(400, { error: `Item at index ${i} has an invalid price` });
    }
  }

  // ── Build the Stripe Checkout Session payload ──────────────────────────────
  // The Stripe API uses application/x-www-form-urlencoded encoding, not JSON.
  // URLSearchParams handles the encoding automatically.
  const params = new URLSearchParams();

  params.append('payment_method_types[0]', 'card');
  params.append('mode', 'payment');

  // ── Line items — one per artwork ───────────────────────────────────────────
  items.forEach((item, index) => {
    const prefix = `line_items[${index}]`;

    // Stripe expects amounts in the smallest currency unit (pence for GBP)
    const amountInPence = Math.round(item.price * 100);

    params.append(`${prefix}[price_data][currency]`, 'gbp');
    params.append(`${prefix}[price_data][product_data][name]`, `${item.title} by ${item.artist}`);
    params.append(`${prefix}[price_data][product_data][images][0]`, item.imageUrl);
    params.append(
      `${prefix}[price_data][product_data][description]`,
      item.edition || 'Original artwork'
    );
    params.append(`${prefix}[price_data][unit_amount]`, String(amountInPence));
    params.append(`${prefix}[quantity]`, '1');
  });

  // ── Shipping — UK address collection with free delivery ───────────────────
  params.append('shipping_address_collection[allowed_countries][0]', 'GB');
  params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  params.append('shipping_options[0][shipping_rate_data][display_name]', 'Free UK Delivery');
  params.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '0');
  params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'gbp');

  // ── Return URLs ────────────────────────────────────────────────────────────
  // {CHECKOUT_SESSION_ID} is a Stripe template variable — Stripe replaces it
  // with the actual session ID before redirecting the customer.
  params.append(
    'success_url',
    `${SITE_URL}/checkout-success.html?session={CHECKOUT_SESSION_ID}`
  );
  params.append('cancel_url', `${SITE_URL}/checkout-cancel.html`);

  // ── Metadata — store artwork IDs so the webhook can mark them as sold ──────
  const artworkIds = items.map((item) => item.id).join(',');
  params.append('metadata[artwork_ids]', artworkIds);

  // ── Call the Stripe Checkout Sessions API ─────────────────────────────────
  let stripeResponse;
  try {
    stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  } catch (networkError) {
    console.error('create-checkout: network error reaching Stripe API:', networkError);
    return respond(500, { error: 'Unable to reach payment provider' });
  }

  // ── Handle Stripe API response ─────────────────────────────────────────────
  if (!stripeResponse.ok) {
    let stripeError = 'Unknown Stripe error';
    try {
      const errorBody = await stripeResponse.json();
      stripeError = errorBody?.error?.message || stripeError;
    } catch {
      // ignore parse failures on error responses
    }
    console.error(`create-checkout: Stripe returned ${stripeResponse.status}: ${stripeError}`);
    return respond(500, { error: stripeError });
  }

  const session = await stripeResponse.json();

  // session.url is the Stripe-hosted checkout page the customer should be
  // redirected to. The client-side JS performs the redirect.
  return respond(200, { url: session.url });
};
