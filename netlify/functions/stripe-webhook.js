/**
 * KOH HOUSE — Netlify Function: stripe-webhook
 *
 * Receives POST requests from Stripe when payment events occur and processes
 * them. This is a server-to-server call — no CORS headers are needed.
 *
 * IMPORTANT — Raw body requirement:
 *   Stripe's signature verification requires the exact raw request body bytes.
 *   Any re-serialisation (e.g. JSON.parse → JSON.stringify) would invalidate
 *   the signature. Netlify provides the raw body in event.body; if the body
 *   was base64-encoded by the runtime (event.isBase64Encoded), we decode it
 *   first to recover the original UTF-8 string.
 *
 * Signature verification (manual, no Stripe SDK):
 *   The Stripe-Signature header looks like:
 *     t=1492774577,v1=5257a869e7ec...,v0=...
 *   Verification steps:
 *   1. Extract timestamp (t) and v1 signature(s) from the header.
 *   2. Build the signed payload string: "<timestamp>.<rawBody>"
 *   3. Compute HMAC-SHA256 of that string using STRIPE_WEBHOOK_SECRET as key.
 *   4. Compare (constant-time) against every v1 value in the header.
 *   5. Optionally check that |Date.now()/1000 − timestamp| < 300 (5 min
 *      tolerance) to reject replayed webhooks.
 *
 * On checkout.session.completed:
 *   1. Extract artwork IDs from session.metadata.artwork_ids (comma-separated).
 *   2. Fetch the current artworks.json from GitHub (same as get-data).
 *   3. Set available = false on each purchased artwork.
 *   4. Write the updated array back to GitHub (same as save-data).
 *
 * Always return HTTP 200 to Stripe — even when our processing fails.
 * Returning non-2xx causes Stripe to retry, potentially triggering duplicate
 * processing. We log errors for investigation instead.
 *
 * Environment variables required:
 *   STRIPE_WEBHOOK_SECRET — whsec_... signing secret from Stripe Dashboard
 *   GITHUB_TOKEN          — personal access token with repo write scope
 *   GITHUB_OWNER          — GitHub username or organisation
 *   GITHUB_REPO           — repository name
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ── Stripe signature verification ─────────────────────────────────────────────
/**
 * Verifies the Stripe-Signature header against the raw request body.
 *
 * @param {string} rawBody         - The exact raw request body string.
 * @param {string} signatureHeader - Value of the Stripe-Signature header.
 * @param {string} secret          - STRIPE_WEBHOOK_SECRET env var value.
 * @param {number} [toleranceSecs] - Max allowed age of the event in seconds (default 300).
 * @returns {{ valid: boolean, event: object|null, error: string|null }}
 */
const verifyStripeSignature = (rawBody, signatureHeader, secret, toleranceSecs = 300) => {
  if (!signatureHeader) {
    return { valid: false, event: null, error: 'Missing Stripe-Signature header' };
  }

  // Parse the header: "t=timestamp,v1=sig1,v1=sig2,v0=sig"
  const parts = signatureHeader.split(',');
  let timestamp = null;
  const v1Signatures = [];

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.substring(0, eqIdx);
    const val = part.substring(eqIdx + 1);
    if (key === 't')  timestamp = val;
    if (key === 'v1') v1Signatures.push(val);
  }

  if (!timestamp || v1Signatures.length === 0) {
    return { valid: false, event: null, error: 'Invalid Stripe-Signature header format' };
  }

  // Reject events older than the tolerance window to prevent replay attacks
  const eventAgeSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (Math.abs(eventAgeSeconds) > toleranceSecs) {
    return { valid: false, event: null, error: `Webhook timestamp too old (${eventAgeSeconds}s)` };
  }

  // Compute HMAC-SHA256 of "<timestamp>.<rawBody>" using the webhook secret
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig   = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf   = Buffer.from(expectedSig);

  // Check if any of the v1 signatures match (Stripe may include multiple)
  let signatureMatched = false;
  for (const sig of v1Signatures) {
    const sigBuf = Buffer.from(sig);
    // timingSafeEqual requires equal-length buffers
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(expectedBuf, sigBuf)) {
      signatureMatched = true;
      break;
    }
  }

  if (!signatureMatched) {
    return { valid: false, event: null, error: 'Signature mismatch' };
  }

  // Signature is valid — now parse the event body
  try {
    const event = JSON.parse(rawBody);
    return { valid: true, event, error: null };
  } catch (parseError) {
    return { valid: false, event: null, error: 'Failed to parse event body as JSON' };
  }
};

// ── GitHub helper: fetch a data file (mirrors get-data.js logic) ──────────────
const fetchDataFile = async (file, { token, owner, repo }) => {
  const url      = `https://api.github.com/repos/${owner}/${repo}/contents/data/${file}.json`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'KOH-HOUSE-Netlify-Function',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub GET failed with status ${response.status}`);
  }

  const githubData = await response.json();
  const rawBase64  = githubData.content.replace(/\n/g, '');
  const decoded    = Buffer.from(rawBase64, 'base64').toString('utf-8');

  return {
    data: JSON.parse(decoded),
    sha:  githubData.sha,
  };
};

// ── GitHub helper: write a data file (mirrors save-data.js logic) ─────────────
const writeDataFile = async (file, data, sha, commitMessage, { token, owner, repo }) => {
  const url        = `https://api.github.com/repos/${owner}/${repo}/contents/data/${file}.json`;
  const b64Content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'KOH-HOUSE-Netlify-Function',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: b64Content,
      sha,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub PUT failed with status ${response.status}: ${errorText}`);
  }

  const responseData = await response.json();
  return responseData.content?.sha;
};

// ── Handle checkout.session.completed ─────────────────────────────────────────
const handleCheckoutComplete = async (session, githubCreds) => {
  const rawArtworkIds = session.metadata?.artwork_ids;
  if (!rawArtworkIds) {
    console.warn('stripe-webhook: checkout.session.completed has no artwork_ids in metadata');
    return;
  }

  // Parse the comma-separated list of artwork IDs stored in metadata
  const purchasedIds = new Set(rawArtworkIds.split(',').map((id) => id.trim()).filter(Boolean));
  if (purchasedIds.size === 0) {
    console.warn('stripe-webhook: artwork_ids metadata is empty');
    return;
  }

  console.log(`stripe-webhook: marking ${purchasedIds.size} artwork(s) as sold:`, [...purchasedIds]);

  // ── Fetch current artworks from GitHub ─────────────────────────────────────
  let artworks, currentSha;
  try {
    ({ data: artworks, sha: currentSha } = await fetchDataFile('artworks', githubCreds));
  } catch (fetchError) {
    console.error('stripe-webhook: failed to fetch artworks.json:', fetchError);
    return; // Log and continue — returning 200 to Stripe regardless
  }

  // ── Mark purchased artworks as unavailable ─────────────────────────────────
  let updatedCount = 0;
  const updatedArtworks = artworks.map((artwork) => {
    if (purchasedIds.has(artwork.id)) {
      updatedCount++;
      return { ...artwork, available: false };
    }
    return artwork;
  });

  if (updatedCount === 0) {
    console.warn('stripe-webhook: none of the purchased IDs matched artworks in the data file');
    return;
  }

  // ── Write updated artworks back to GitHub ─────────────────────────────────
  const soldIdList      = [...purchasedIds].join(', ');
  const commitMessage   = `KOH HOUSE: artwork(s) marked sold after purchase (${soldIdList})`;

  try {
    await writeDataFile('artworks', updatedArtworks, currentSha, commitMessage, githubCreds);
    console.log(`stripe-webhook: successfully marked ${updatedCount} artwork(s) as sold`);
  } catch (writeError) {
    console.error('stripe-webhook: failed to write updated artworks.json:', writeError);
    // Do not re-throw — we still return 200 to Stripe
  }
};

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  // Stripe sends POST; ignore anything else (e.g. health checks)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'OK' };
  }

  // ── Recover the raw body ────────────────────────────────────────────────────
  // Netlify may base64-encode binary bodies; for webhook JSON it is usually
  // plain text, but we handle both cases for safety.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : (event.body || '');

  // ── Read environment variables ─────────────────────────────────────────────
  const {
    STRIPE_WEBHOOK_SECRET,
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
  } = process.env;

  if (!STRIPE_WEBHOOK_SECRET || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('stripe-webhook: missing required environment variables');
    // Still return 200 — a config error is not Stripe's problem
    return { statusCode: 200, body: 'Configuration error' };
  }

  // ── Verify the Stripe signature ────────────────────────────────────────────
  const signatureHeader = event.headers?.['stripe-signature'];
  const { valid, event: stripeEvent, error: sigError } = verifyStripeSignature(
    rawBody,
    signatureHeader,
    STRIPE_WEBHOOK_SECRET
  );

  if (!valid) {
    console.error('stripe-webhook: signature verification failed —', sigError);
    // Return 400 for invalid signatures so Stripe can alert on misconfiguration,
    // but do NOT return 500 which would trigger Stripe retries on our logic errors.
    return { statusCode: 400, body: `Webhook signature invalid: ${sigError}` };
  }

  // ── Route on event type ────────────────────────────────────────────────────
  const githubCreds = { token: GITHUB_TOKEN, owner: GITHUB_OWNER, repo: GITHUB_REPO };

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(stripeEvent.data.object, githubCreds);
      break;

    case 'payment_intent.payment_failed':
      // Log failed payments for visibility; no data mutation needed
      console.warn(
        'stripe-webhook: payment failed —',
        stripeEvent.data.object?.id,
        stripeEvent.data.object?.last_payment_error?.message
      );
      break;

    default:
      // Acknowledge all other event types without processing them.
      // This avoids Stripe logging delivery failures for events we don't handle.
      console.log(`stripe-webhook: unhandled event type "${stripeEvent.type}" — acknowledged`);
  }

  // ── Always return 200 to Stripe ────────────────────────────────────────────
  // Returning non-2xx would cause Stripe to retry the webhook, potentially
  // triggering duplicate processing. Errors are logged above for investigation.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
