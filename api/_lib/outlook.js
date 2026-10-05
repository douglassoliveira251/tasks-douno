const crypto = require('crypto');

const SUPABASE_URL = 'https://zwntzqwdhgplewgbidbs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7hLrYE-Cmr1g0XI_hyq3wA_Z6QzAiyt';
const MICROSOFT_CLIENT_ID = '553b6f2f-ee51-494a-8b3a-35aeab00c172';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const MICROSOFT_AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const GRAPH_SCOPES = 'offline_access Calendars.ReadWrite';

const ALLOWED_ORIGINS = [
  'https://tasks.douno.com.br',
  'https://tasks-douno.vercel.app',
];

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return key;
}

function clientSecret() {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) throw new Error('MICROSOFT_CLIENT_SECRET não configurada.');
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf-8');
}

function signState(payload) {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', clientSecret()).update(body).digest('hex');
  return `${body}.${sig}`;
}
function verifyState(state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) return null;
  const [body, sig] = state.split('.');
  const expectedSig = crypto.createHmac('sha256', clientSecret()).update(body).digest('hex');
  const sigBuf = Buffer.from(sig || '', 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  let payload;
  try { payload = JSON.parse(base64urlDecode(body)); } catch (e) { return null; }
  if (!payload || !payload.exp || payload.exp < Date.now()) return null;
  if (!payload.origin || !ALLOWED_ORIGINS.includes(payload.origin)) return null;
  return payload;
}

async function getUserFromToken(bearerToken) {
  if (!bearerToken) return null;
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${bearerToken}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data && data.id ? data : null;
}

function requireBearer(req) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

async function getStoredTokens(userId) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/outlook_tokens?user_id=eq.${userId}&select=*`, {
    headers: { apikey: serviceRoleKey(), Authorization: `Bearer ${serviceRoleKey()}` },
  });
  if (!resp.ok) throw new Error(`Erro ao ler outlook_tokens: ${resp.status}`);
  const rows = await resp.json();
  return rows && rows[0] ? rows[0] : null;
}

async function upsertTokens(userId, { access_token, refresh_token, expires_in, ms_account }) {
  const expires_at = new Date(Date.now() + (expires_in - 60) * 1000).toISOString();
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/outlook_tokens`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey(),
      Authorization: `Bearer ${serviceRoleKey()}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([{ user_id: userId, access_token, refresh_token, expires_at, ms_account, updated_at: new Date().toISOString() }]),
  });
  if (!resp.ok) throw new Error(`Erro ao salvar outlook_tokens: ${resp.status} ${await resp.text()}`);
}

async function deleteTokens(userId) {
  await fetch(`${SUPABASE_URL}/rest/v1/outlook_tokens?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { apikey: serviceRoleKey(), Authorization: `Bearer ${serviceRoleKey()}` },
  });
}

async function exchangeCodeForTokens(code, redirectUri) {
  const resp = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: clientSecret(),
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: GRAPH_SCOPES,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Erro ao trocar code por token: ${JSON.stringify(data)}`);
  return data;
}

async function refreshTokens(refreshToken) {
  const resp = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: clientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: GRAPH_SCOPES,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Erro ao renovar token: ${JSON.stringify(data)}`);
  return data;
}

async function getValidAccessToken(userId) {
  const row = await getStoredTokens(userId);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() > Date.now()) {
    return row.access_token;
  }
  const fresh = await refreshTokens(row.refresh_token);
  await upsertTokens(userId, {
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token || row.refresh_token,
    expires_in: fresh.expires_in,
    ms_account: row.ms_account,
  });
  return fresh.access_token;
}

function redirectUriFor(origin) {
  return `${origin}/api/outlook/callback`;
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_AUTHORIZE_URL,
  GRAPH_SCOPES,
  ALLOWED_ORIGINS,
  signState,
  verifyState,
  getUserFromToken,
  requireBearer,
  getStoredTokens,
  upsertTokens,
  deleteTokens,
  exchangeCodeForTokens,
  refreshTokens,
  getValidAccessToken,
  redirectUriFor,
};
