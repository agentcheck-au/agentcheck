// Fixed OneGov integration. Credentials exist only in the Pages runtime.
const HOST = "https://api.onegov.nsw.gov.au";
const ALLOWED_PATHS = new Set([
  "/propertyregister/v1/browse",
  "/propertyregister/v1/details",
]);
let accessToken = null;
let tokenExpiresAt = 0;
let pendingToken = null;
const pendingRequests = new Map();

export class ApiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function jsonRequest(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(9500),
    });
    // Reading the body uses the same timeout signal as the request.
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { response, data };
  } catch {
    throw new ApiError(
      "The NSW licence service could not be reached. Please try again.",
    );
  }
}

async function getToken(env) {
  if (!env.NSW_API_KEY || !env.NSW_API_SECRET) {
    throw new ApiError(
      "Live licence search is unavailable. Please use the official licence register or try later.",
      503,
    );
  }
  if (accessToken && Date.now() + 60000 < tokenExpiresAt) return accessToken;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const basic = btoa(`${env.NSW_API_KEY}:${env.NSW_API_SECRET}`);
    const url = new URL(`${HOST}/oauth/client_credential/accesstoken`);
    url.searchParams.set("grant_type", "client_credentials");
    const { response, data } = await jsonRequest(url, {
      method: "GET",
      headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
    });
    if (
      !response.ok ||
      typeof data?.access_token !== "string" ||
      !data.access_token
    ) {
      throw new ApiError(
        "The NSW licence service could not authenticate. Please try later.",
      );
    }
    accessToken = data.access_token;
    const ttl = Number(data.expires_in);
    tokenExpiresAt =
      Date.now() +
      (Number.isFinite(ttl) && ttl > 0 ? Math.min(ttl, 39600) : 36000) * 1000;
    return accessToken;
  })();
  try {
    return await pendingToken;
  } finally {
    pendingToken = null;
  }
}

export async function requestNsw(env, path, query) {
  if (!ALLOWED_PATHS.has(path))
    throw new ApiError("Invalid government service request.", 400);
  const url = new URL(`${HOST}${path}`);
  for (const [key, value] of Object.entries(query))
    url.searchParams.set(key, value);
  // Only concurrent identical requests are shared. No response is stored after it settles.
  const key = url.toString();
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  if (!allowRequest("upstream:all", 30))
    throw new ApiError(
      "Licence lookup is busy. Please try again shortly.",
      429,
    );
  const task = (async () => {
    const send = async () =>
      jsonRequest(url, {
        headers: {
          Authorization: `Bearer ${await getToken(env)}`,
          apikey: env.NSW_API_KEY,
          Accept: "application/json",
        },
      });
    let { response, data } = await send();
    if (response.status === 401) {
      accessToken = null;
      tokenExpiresAt = 0;
      ({ response, data } = await send());
    }
    if (response.status === 429)
      throw new ApiError("The NSW service is busy. Please try later.", 429);
    if (!response.ok)
      throw new ApiError(
        "The NSW licence service could not complete this lookup.",
      );
    return data;
  })();
  pendingRequests.set(key, task);
  try {
    return await task;
  } finally {
    pendingRequests.delete(key);
  }
}

function asText(value, max = 250) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, max)
    : "";
}
export function normalizeBrowseRecord(record) {
  return {
    licenceID: asText(record?.licenceID, 50),
    licenceName: asText(record?.licenceName || record?.licensee),
    licenceNumber: asText(record?.licenceNumber, 40),
    licenceType: asText(record?.licenceType, 100),
    status: asText(record?.status, 60),
    suburb: asText(record?.suburb, 90),
    postcode: asText(record?.postcode, 12),
    expiryDate: asText(record?.expiryDate, 30),
  };
}

export function normalizeDetails(data) {
  const detail = data?.licenceDetail ?? {};
  const compliance = data?.complianceActions ?? {};
  const labels = [
    ["refusedRenewals", "Refused renewals"],
    ["disciplinaryActions", "Disciplinary actions"],
    ["suspensions", "Suspensions"],
    ["prosecutions", "Prosecutions"],
    ["infringementNotices", "Infringement notices"],
    ["ctttOrders", "Tribunal orders"],
    ["publicWarnings", "Public warnings"],
  ];
  const count = (value) =>
    Number.isSafeInteger(value) && value >= 0 ? value : null;
  return {
    licenceName: asText(detail.licenceName || detail.licensee),
    licenceNumber: asText(detail.licenceNumber, 40),
    licenceType: asText(detail.licenceType, 100),
    status: asText(detail.status, 60),
    startDate: asText(detail.startDate, 30),
    expiryDate: asText(detail.expiryDate, 30),
    classes: Array.isArray(data?.licenceClasses)
      ? data.licenceClasses
          .slice(0, 8)
          .map((c) => asText(c?.description || c?.className, 200))
          .filter(Boolean)
      : [],
    premises: Array.isArray(data?.premises)
      ? data.premises
          .slice(0, 3)
          .map((p) => asText(p?.businessAddress, 220))
          .filter(Boolean)
      : [],
    conditions: Array.isArray(data?.conditions)
      ? data.conditions
          .filter(
            (c) =>
              c &&
              c.isActive !== false &&
              String(c.isActive).toLowerCase() !== "false",
          )
          .slice(0, 8)
          .map((c) => asText(c.description, 500))
          .filter(Boolean)
      : [],
    compliance: {
      actions: labels.map(([key, label]) => ({
        label,
        count: Array.isArray(compliance[key]) ? compliance[key].length : null,
      })),
      cautionsCount: count(compliance.cautionReprimandCount),
      publicWarningsCount: count(compliance.publicWarningsCount),
    },
  };
}

// Best effort, isolate-local protection only. This is NOT a distributed quota budget.
export function createLimiter({ capacity = 5000, now = Date.now } = {}) {
  const buckets = new Map();
  return (key, max = 12, windowMs = 60000) => {
    const time = now();
    let bucket = buckets.get(key);
    if (bucket && bucket.reset > time) {
      if (bucket.count >= max) return false;
      bucket.count++;
      return true;
    }
    if (buckets.size >= capacity) {
      for (const [id, entry] of buckets)
        if (entry.reset <= time) buckets.delete(id);
      // Do not reset existing limits when flooded with new identities.
      if (!buckets.has(key) && buckets.size >= capacity) return false;
    }
    buckets.set(key, { count: 1, reset: time + windowMs });
    return true;
  };
}
export const allowRequest = createLimiter();
export function clientKey(request) {
  // Trusted when supplied by Cloudflare; never trust X-Forwarded-For here.
  return (request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 100);
}
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};
export function responseJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}
export function publicError(error) {
  return error instanceof ApiError
    ? responseJson({ error: error.message }, error.status)
    : responseJson(
        { error: "Licence lookup temporarily unavailable. Please try again." },
        502,
      );
}
