/**
 * KOH HOUSE — Netlify Function: save-data
 *
 * Writes updated JSON data back to the GitHub repository using the GitHub
 * Contents API (PUT). Requires a valid admin session token in the
 * Authorization header.
 *
 * Request:  POST /.netlify/functions/save-data
 *           Authorization: Bearer <token>
 *           Body: { file: "artworks", data: [...], sha: "abc123..." }
 *
 * The `sha` field is the current blob SHA returned by get-data. GitHub uses
 * it for optimistic locking — if the file has changed since you fetched it,
 * the PUT will return 409 Conflict instead of silently overwriting.
 *
 * Token verification:
 *   Token format: base64(payload).<hmac-hex>
 *   1. Split on the LAST "." to separate payload from signature.
 *   2. Recompute HMAC-SHA256 of the b64 payload using SESSION_SECRET.
 *   3. Compare with timingSafeEqual to prevent timing attacks.
 *   4. Decode payload JSON and check exp > Date.now().
 *
 * Environment variables required:
 *   SESSION_SECRET — same secret used by auth.js to sign tokens
 *   GITHUB_TOKEN   — personal access token with repo write scope
 *   GITHUB_OWNER   — GitHub username or organisation
 *   GITHUB_REPO    — repository name
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ── Allowed data files ────────────────────────────────────────────────────────
const ALLOWED_FILES = new Set(['artworks', 'artists', 'homepage', 'settings']);

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

// ── Token verification helper ─────────────────────────────────────────────────
// Returns the decoded payload object on success, or null on any failure.
// Splitting on lastIndexOf('.') correctly handles base64 payloads that may
// contain '.' characters (base64 uses A-Z, a-z, 0-9, +, /, = — no dots —
// but this is a safe and explicit approach regardless).
const verifyToken = (authHeader, secret) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token    = authHeader.slice(7); // strip "Bearer "
  const lastDot  = token.lastIndexOf('.');

  if (lastDot === -1) return null; // malformed — no separator

  const b64Payload     = token.substring(0, lastDot);
  const providedSig    = token.substring(lastDot + 1);

  // Recompute the expected HMAC using the same key and input as auth.js
  const expectedSig = createHmac('sha256', secret).update(b64Payload).digest('hex');

  // Constant-time comparison — prevents signature oracle / timing attacks
  const expectedBuf = Buffer.from(expectedSig);
  const providedBuf = Buffer.from(providedSig.toLowerCase().padEnd(expectedSig.length, '0'));

  // We must compare equal-length buffers; mismatched length = invalid token
  if (expectedBuf.length !== Buffer.from(providedSig).length) return null;

  const signatureValid = timingSafeEqual(expectedBuf, Buffer.from(providedSig));
  if (!signatureValid) return null;

  // Decode and parse the payload
  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64').toString('utf-8'));

    // Check token has not expired
    if (!payload.exp || Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
};

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { success: false, message: 'Method not allowed' });
  }

  // ── Verify admin session token ─────────────────────────────────────────────
  const { SESSION_SECRET, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!SESSION_SECRET || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('save-data: missing required environment variables');
    return respond(500, { success: false, message: 'Server configuration error' });
  }

  const payload = verifyToken(event.headers?.authorization, SESSION_SECRET);
  if (!payload) {
    return respond(401, { success: false, message: 'Unauthorised: invalid or expired token' });
  }

  // ── Parse and validate request body ───────────────────────────────────────
  let file, data, sha;
  try {
    ({ file, data, sha } = JSON.parse(event.body || '{}'));
  } catch {
    return respond(400, { success: false, message: 'Invalid JSON body' });
  }

  if (!file || data === undefined || !sha) {
    return respond(400, { success: false, message: 'Missing required fields: file, data, sha' });
  }

  if (!ALLOWED_FILES.has(file)) {
    return respond(400, {
      success: false,
      message: `Invalid file. Allowed values: ${[...ALLOWED_FILES].join(', ')}`,
    });
  }

  // ── Encode data as base64 for GitHub API ───────────────────────────────────
  // GitHub Contents API requires file content as a base64 string.
  // JSON.stringify with indentation keeps the file human-readable in the repo.
  const jsonString = JSON.stringify(data, null, 2);
  const b64Content = Buffer.from(jsonString).toString('base64');

  // ── PUT updated file to GitHub Contents API ────────────────────────────────
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/${file}.json`;

  let githubResponse;
  try {
    githubResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'KOH-HOUSE-Netlify-Function',
      },
      body: JSON.stringify({
        message: `KOH HOUSE Admin: updated ${file}.json`,
        content: b64Content,
        sha,          // GitHub uses this for optimistic locking
      }),
    });
  } catch (networkError) {
    console.error('save-data: network error reaching GitHub API:', networkError);
    return respond(502, { success: false, message: 'Unable to reach GitHub API' });
  }

  // ── Handle GitHub API response ─────────────────────────────────────────────

  // 409 Conflict means the file was modified between our fetch and this save.
  // Return a clear message so the admin UI can prompt the user to refresh.
  if (githubResponse.status === 409) {
    return respond(409, {
      success: false,
      message: 'Conflict: the file was modified by another process. Please refresh and try again.',
    });
  }

  if (!githubResponse.ok) {
    const errorText = await githubResponse.text();
    console.error(`save-data: GitHub API returned ${githubResponse.status}:`, errorText);
    return respond(502, {
      success: false,
      message: `GitHub API error (${githubResponse.status})`,
    });
  }

  // ── Return the new SHA so the client can continue making edits ─────────────
  // The client must use this newSha for any subsequent save on the same file.
  const responseData = await githubResponse.json();
  const newSha = responseData.content?.sha;

  return respond(200, { success: true, newSha });
};
