'use strict';

const HOST = 'https://api.onegov.nsw.gov.au';
let accessToken = null;
let tokenExpiresAt = 0;
let pendingToken = null;

class ApiError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

function configured() {
  return Boolean(process.env.NSW_API_KEY && process.env.NSW_API_SECRET);
}

async function jsonRequest(url, options) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(9500) });
  } catch {
    throw new ApiError('The NSW licence service could not be reached. Please try again.', 502);
  }
  let data;
  try { data = await response.json(); } catch { data = null; }
  return { response, data };
}

async function getToken() {
  if (!configured()) throw new ApiError('Live licence search is being connected. Please check back shortly.', 503);
  if (accessToken && Date.now() + 60000 < tokenExpiresAt) return accessToken;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const basic = Buffer.from(`${process.env.NSW_API_KEY}:${process.env.NSW_API_SECRET}`).toString('base64');
    const u = new URL(`${HOST}/oauth/client_credential/accesstoken`);
    u.searchParams.set('grant_type', 'client_credentials');
    const { response, data } = await jsonRequest(u.toString(), {
      method: 'GET', headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' }
    });
    if (!response.ok || !data || typeof data.access_token !== 'string') {
      throw new ApiError('The NSW licence service could not authenticate. Please try later.', 502);
    }
    accessToken = data.access_token;
    const ttlSeconds = Number(data.expires_in);
    const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 36000;
    tokenExpiresAt = Date.now() + Math.min(ttl, 39600) * 1000;
    return accessToken;
  })();
  try { return await pendingToken; } finally { pendingToken = null; }
}

async function requestNsw(path, query) {
  const url = new URL(`${HOST}${path}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const send = async () => jsonRequest(url.toString(), {
    headers: { Authorization: `Bearer ${await getToken()}`, apikey: process.env.NSW_API_KEY, Accept: 'application/json' }
  });
  let { response, data } = await send();
  if (response.status === 401) {
    accessToken = null; tokenExpiresAt = 0;
    ({ response, data } = await send());
  }
  if (response.status === 429) throw new ApiError('The NSW service is busy. Please try later.', 429);
  if (!response.ok) throw new ApiError('The NSW licence service could not complete this lookup.', 502);
  return data;
}

function asText(value, max = 250) { return typeof value === 'string' ? value.slice(0, max) : ''; }
function normalizeBrowseRecord(record) {
  return {
    licenceID: asText(record?.licenceID, 50),
    licenceName: asText(record?.licenceName || record?.licensee),
    licenceNumber: asText(record?.licenceNumber, 40),
    licenceType: asText(record?.licenceType, 100),
    status: asText(record?.status, 60),
    suburb: asText(record?.suburb, 90),
    postcode: asText(record?.postcode, 12),
    expiryDate: asText(record?.expiryDate, 30)
  };
}

function normalizeDetails(data) {
  const detail = data?.licenceDetail ?? {};
  const compliance = data?.complianceActions ?? {};
  const labels = [
    ['refusedRenewals','Refused renewals'], ['disciplinaryActions','Disciplinary actions'],
    ['suspensions','Suspensions'], ['prosecutions','Prosecutions'],
    ['infringementNotices','Infringement notices'], ['ctttOrders','Tribunal orders'],
    ['publicWarnings','Public warnings']
  ];
  const actions = labels.map(([key, label]) => ({ label, count: Array.isArray(compliance[key]) ? compliance[key].length : null }));
  return {
    licenceName: asText(detail.licenceName || detail.licensee),
    licenceNumber: asText(detail.licenceNumber, 40),
    licenceType: asText(detail.licenceType, 100),
    status: asText(detail.status, 60),
    startDate: asText(detail.startDate, 30),
    expiryDate: asText(detail.expiryDate, 30),
    classes: Array.isArray(data?.licenceClasses) ? data.licenceClasses.slice(0, 8).map(c => asText(c.description || c.className, 200)) : [],
    compliance: {
      actions,
      cautionsCount: typeof compliance.cautionReprimandCount === 'number' ? compliance.cautionReprimandCount : null,
      publicWarningsCount: typeof compliance.publicWarningsCount === 'number' ? compliance.publicWarningsCount : null
    }
  };
}

// Best-effort per-function-instance rate limiting. For public launch, add an
// external durable rate limiter or Vercel WAF; serverless instances don't share memory.
const buckets = new Map();
function allowRequest(key, max = 12, windowMs = 60000) {
  const now = Date.now();
  if (buckets.size > 5000) buckets.clear();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}
function clientKey(req) {
  const viaVercel = req.headers['x-vercel-forwarded-for'];
  const viaProxy = req.headers['x-forwarded-for'];
  const text = String(viaVercel || viaProxy || req.socket?.remoteAddress || 'unknown');
  return text.split(',')[0].slice(0, 100);
}
function headers(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

module.exports = { ApiError, requestNsw, normalizeBrowseRecord, normalizeDetails, allowRequest, clientKey, headers };
