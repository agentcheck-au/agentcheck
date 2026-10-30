const HOST = 'https://api.onegov.nsw.gov.au';
let accessToken = null;
let tokenExpiresAt = 0;
let pendingToken = null;

export class ApiError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
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

async function getToken(env) {
  if (!env.NSW_API_KEY || !env.NSW_API_SECRET) {
    throw new ApiError('Live licence search is being connected. Please check back shortly.', 503);
  }
  if (accessToken && Date.now() + 60000 < tokenExpiresAt) return accessToken;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const basic = btoa(`${env.NSW_API_KEY}:${env.NSW_API_SECRET}`);
    const u = new URL(`${HOST}/oauth/client_credential/accesstoken`);
    u.searchParams.set('grant_type', 'client_credentials');
    const { response, data } = await jsonRequest(u.toString(), {
      method: 'GET', headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' }
    });
    if (!response.ok || typeof data?.access_token !== 'string') {
      throw new ApiError('The NSW licence service could not authenticate. Please try later.', 502);
    }
    accessToken = data.access_token;
    const ttl = Number(data.expires_in);
    tokenExpiresAt = Date.now() + (Number.isFinite(ttl) && ttl > 0 ? Math.min(ttl, 39600) : 36000) * 1000;
    return accessToken;
  })();
  try { return await pendingToken; } finally { pendingToken = null; }
}

export async function requestNsw(env, path, query) {
  const url = new URL(`${HOST}${path}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const send = async () => jsonRequest(url.toString(), {
    headers: { Authorization: `Bearer ${await getToken(env)}`, apikey: env.NSW_API_KEY, Accept: 'application/json' }
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
export function normalizeBrowseRecord(record) {
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

export function normalizeDetails(data) {
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
    premises: Array.isArray(data?.premises) ? data.premises.slice(0, 3).map(p => asText(p.businessAddress, 220)).filter(Boolean) : [],
    conditions: Array.isArray(data?.conditions) ? data.conditions.slice(0, 8).filter(c => c?.isActive !== 'False' && c?.isActive !== false).map(c => asText(c.description, 500)).filter(Boolean) : [],
    compliance: {
      actions,
      cautionsCount: typeof compliance.cautionReprimandCount === 'number' ? compliance.cautionReprimandCount : null,
      publicWarningsCount: typeof compliance.publicWarningsCount === 'number' ? compliance.publicWarningsCount : null
    }
  };
}

const buckets = new Map();
export function allowRequest(key, max = 12, windowMs = 60000) {
  const now = Date.now();
  if (buckets.size > 5000) buckets.clear();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

export function clientKey(request) {
  return (request.headers.get('CF-Connecting-IP') || 'unknown').slice(0, 100);
}
export function responseJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
  });
}
