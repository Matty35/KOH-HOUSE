/**
 * KOH HOUSE — Netlify Function: auth
 *
 * Handles admin authentication. Accepts a POST request with { email, password },
 * hashes the submitted password with SHA-256, compares it against the stored hash
 * in environment variables, and on success issues a signed HMAC-SHA256 session token.
 *
 * Token format:  base64(JSON payload) + "." + HMAC-SHA256 hex signature
 * The payload carries { email, exp } so save-data can verify expiry without
 * any database or server-side session store.
 *
 * Environment variables required:
 *   ADMIN_EMAIL          — the authorised admin email address
 *   ADMIN_PASSWORD_HASH  — SHA-256 hex digest of the admin password
 *   SESSION_SECRET       — long random string used as the HMAC key
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto';

// ── CORS headers attached to every response ───────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ── Helper: build a consistent JSON response ──────────────────────────────────
const respond = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  // Handle CORS preflight — browsers send OPTIONS before the real POST
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { success: false, message: 'Method not allowed' });
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let email, password;
  try {
    ({ email, password } = JSON.parse(event.body || '{}'));
  } catch {
    return respond(400, { success: false, message: 'Invalid JSON body' });
  }

  if (!email || !password) {
    return respond(400, { success: false, message: 'Email and password are required' });
  }

  // ── Read credentials from environment ─────────────────────────────────────
  const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || !SESSION_SECRET) {
    console.error('auth: missing required environment variables');
    return respond(500, { success: false, message: 'Server configuration error' });
  }

  // ── Hash the submitted password with SHA-256 ───────────────────────────────
  // We never compare plain-text passwords; always compare hashes.
  const submittedHash = createHash('sha256').update(password).digest('hex');

  // ── Validate email (case-insensitive) ─────────────────────────────────────
  const emailMatches = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // ── Constant-time hash comparison to prevent timing attacks ───────────────
  // Both buffers must be exactly the same length before calling timingSafeEqual
  // (hex digests are always 64 chars, so this will always hold for valid hashes).
  const storedBuf    = Buffer.from(ADMIN_PASSWORD_HASH.toLowerCase());
  const submittedBuf = Buffer.from(submittedHash.toLowerCase());

  const passwordMatches =
    storedBuf.length === submittedBuf.length &&
    timingSafeEqual(storedBuf, submittedBuf);

  if (!emailMatches || !passwordMatches) {
    // Deliberate vagueness — don't reveal which field was wrong
    return respond(401, { success: false, message: 'Invalid credentials' });
  }

  // ── Build the session token ────────────────────────────────────────────────
  // Payload: JSON → Buffer → base64 string
  // Signature: HMAC-SHA256 of the base64 payload, keyed with SESSION_SECRET
  // Final token: "<b64Payload>.<hmacHex>"
  const payload    = JSON.stringify({ email, exp: Date.now() + 86_400_000 }); // 24 hours
  const b64Payload = Buffer.from(payload).toString('base64');
  const signature  = createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('hex');
  const token      = `${b64Payload}.${signature}`;

  return respond(200, { success: true, token });
};
