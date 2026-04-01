/**
 * KOH HOUSE — Netlify Function: get-data
 *
 * Reads a JSON data file from the GitHub repository and returns its parsed
 * contents along with the file's current SHA (needed by save-data to perform
 * optimistic-locking updates via the GitHub Contents API).
 *
 * Request:  GET /.netlify/functions/get-data?file=artworks
 * Response: { data: [...], sha: "abc123..." }
 *
 * Allowed file values: artworks | artists | homepage | settings
 *
 * GitHub API used:
 *   GET /repos/{owner}/{repo}/contents/data/{file}.json
 *   Returns base64-encoded file content + the blob SHA.
 *
 * Environment variables required:
 *   GITHUB_TOKEN  — personal access token with repo read/write scope
 *   GITHUB_OWNER  — GitHub username or organisation
 *   GITHUB_REPO   — repository name
 */

// ── Allowed data files (allowlist prevents path traversal) ───────────────────
const ALLOWED_FILES = new Set(['artworks', 'artists', 'homepage', 'settings']);

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return respond(405, { error: 'Method not allowed' });
  }

  // ── Validate the ?file= query parameter ───────────────────────────────────
  const file = event.queryStringParameters?.file;

  if (!file) {
    return respond(400, { error: 'Missing required query parameter: file' });
  }

  if (!ALLOWED_FILES.has(file)) {
    return respond(400, {
      error: `Invalid file parameter. Allowed values: ${[...ALLOWED_FILES].join(', ')}`,
    });
  }

  // ── Read GitHub credentials from environment ───────────────────────────────
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('get-data: missing GitHub environment variables');
    return respond(500, { error: 'Server configuration error' });
  }

  // ── Fetch the file from the GitHub Contents API ────────────────────────────
  // The API returns JSON with { content: "<base64>", sha: "<blob sha>", ... }
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/${file}.json`;

  let githubResponse;
  try {
    githubResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'KOH-HOUSE-Netlify-Function',
      },
    });
  } catch (networkError) {
    console.error('get-data: network error reaching GitHub API:', networkError);
    return respond(502, { error: 'Unable to reach GitHub API' });
  }

  if (!githubResponse.ok) {
    const errorText = await githubResponse.text();
    console.error(`get-data: GitHub API returned ${githubResponse.status}:`, errorText);
    return respond(502, {
      error: `GitHub API error (${githubResponse.status})`,
    });
  }

  // ── Decode the base64 file content ────────────────────────────────────────
  // GitHub always returns file contents as base64-encoded strings.
  let fileJson;
  let sha;
  try {
    const githubData = await githubResponse.json();
    sha = githubData.sha;

    // GitHub wraps long base64 strings with newlines — remove them first
    const rawBase64 = githubData.content.replace(/\n/g, '');
    const decoded   = Buffer.from(rawBase64, 'base64').toString('utf-8');
    fileJson        = JSON.parse(decoded);
  } catch (parseError) {
    console.error('get-data: failed to decode/parse file content:', parseError);
    return respond(500, { error: 'Failed to parse data file' });
  }

  return respond(200, { data: fileJson, sha });
};
