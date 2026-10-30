import test from "node:test";
import assert from "node:assert/strict";
import { onRequest as middleware } from "../functions/api/_middleware.js";
import { onRequestGet as search } from "../functions/api/search.js";
import { onRequestGet as details } from "../functions/api/details.js";
import {
  createLimiter,
  publicError,
  normalizeDetails,
} from "../lib/nsw-worker.js";
const env = { NSW_API_KEY: "mock-key", NSW_API_SECRET: "mock-secret" };
let identity = 0;
const request = (path, init = {}) =>
  new Request("https://agentcheck.test" + path, {
    ...init,
    headers: { "CF-Connecting-IP": `qa-${++identity}`, ...init.headers },
  });
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

for (const method of ["POST", "PUT", "DELETE", "OPTIONS", "HEAD"]) {
  test(`API middleware rejects ${method} before upstream`, async () => {
    const response = await middleware({
      request: request("/api/search?q=test", { method }),
      next: () => assert.fail("must not call next"),
    });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
  });
}
test("cross-site fetch and mismatched Origin are rejected", async () => {
  for (const headers of [
    { "Sec-Fetch-Site": "cross-site" },
    { Origin: "https://untrusted.test" },
  ]) {
    const response = await middleware({
      request: request("/api/search?q=test", { headers }),
      next: () => assert.fail("must not call next"),
    });
    assert.equal(response.status, 403);
  }
});
test("same-origin API middleware runs next once and adds security headers", async () => {
  let count = 0;
  const response = await middleware({
    request: request("/api/search?q=test", {
      headers: { Origin: "https://agentcheck.test" },
    }),
    next: async () => {
      count++;
      return json({ ok: true });
    },
  });
  assert.equal(count, 1);
  assert.deepEqual(await response.json(), { ok: true });
  for (const name of [
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "permissions-policy",
    "referrer-policy",
  ])
    assert.ok(response.headers.has(name));
  assert.match(response.headers.get("cache-control"), /no-store/);
});
test("oversized requests and duplicate parameters are rejected", async () => {
  const big = await middleware({
    request: request("/api/search?q=" + "x".repeat(600)),
    next: () => assert.fail("must not call next"),
  });
  assert.equal(big.status, 400);
  for (const url of [
    "/api/search?q=Ab&q=Cd",
    "/api/search?q=Ab%0ACd",
    "/api/search?q=" + "x".repeat(81),
  ])
    assert.equal(
      (await search({ request: request(url), env: {} })).status,
      400,
    );
  assert.equal(
    (await details({ request: request("/api/details?id=a&id=b"), env: {} }))
      .status,
    400,
  );
});
test("local limiter retains existing limits when identity capacity is exhausted", () => {
  let clock = 100;
  const allow = createLimiter({ capacity: 2, now: () => clock });
  assert.equal(allow("first", 1, 10), true);
  assert.equal(allow("second", 1, 10), true);
  assert.equal(allow("third", 1, 10), false);
  assert.equal(allow("first", 1, 10), false);
  clock = 111;
  assert.equal(allow("third", 1, 10), true);
  assert.equal(allow("first", 1, 10), true);
});
test("public errors never echo unexpected exception text", async () => {
  const response = publicError(new Error("mock-private-credential"));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /mock-private-credential/);
});
test("normalization tolerates null array members and inactive conditions", () => {
  const detail = normalizeDetails({
    licenceDetail: {},
    licenceClasses: [null, { description: "Sales" }],
    premises: [null, { businessAddress: "Public office" }],
    conditions: [
      null,
      { isActive: "false", description: "Inactive" },
      { isActive: true, description: "Active" },
    ],
    complianceActions: {
      cautionReprimandCount: -1,
      publicWarningsCount: Infinity,
    },
  });
  assert.deepEqual(detail.classes, ["Sales"]);
  assert.deepEqual(detail.premises, ["Public office"]);
  assert.deepEqual(detail.conditions, ["Active"]);
  assert.equal(detail.status, "");
  assert.equal(detail.compliance.cautionsCount, null);
  assert.equal(detail.compliance.publicWarningsCount, null);
});

test("mocked search preserves OneGov endpoint, escapes query, caps results, excludes private data", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/oauth/"))
      return json({ access_token: "mock-token", expires_in: 3600 });
    return json(
      Array.from({ length: 23 }, (_, i) => ({
        licenceID: String(i + 1),
        licenceName: "Example",
        licenceNumber: "123",
        suburb: "Riverstone",
        licenseeBirthDate: "private",
      })),
    );
  });
  const response = await search({
    request: request("/api/search?q=Alex%20%26%20Co"),
    env,
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.results.length, 20);
  assert.equal(data.truncated, true);
  assert.ok(data.checkedAt);
  assert.doesNotMatch(
    JSON.stringify(data),
    /private|mock-token|mock-secret|mock-key/,
  );
  const browse = calls.find((c) => c.url.includes("/browse"));
  assert.equal(new URL(browse.url).hostname, "api.onegov.nsw.gov.au");
  assert.equal(new URL(browse.url).searchParams.get("searchText"), "Alex & Co");
  assert.equal(browse.options.redirect, "manual"); // explicit 3xx rejection prevents forwarding tokens
  assert.equal(browse.options.headers.Authorization, "Bearer mock-token");
});
test("mocked detail requires an object, handles upstream failure, exposes only public fields", async (t) => {
  let body = {
    licenceDetail: {
      licenceName: "Example",
      licenceNumber: "123",
      status: "Expired",
      birthDate: "private",
    },
    conditions: [{ isActive: true, description: "Review conditions" }],
  };
  let code = 200;
  t.mock.method(globalThis, "fetch", async () => json(body, code));
  let response = await details({
    request: request("/api/details?id=123"),
    env,
  });
  assert.equal(response.status, 200);
  let data = await response.json();
  assert.equal(data.detail.status, "Expired");
  assert.doesNotMatch(JSON.stringify(data), /private/);
  body = { licenceDetail: [] };
  response = await details({ request: request("/api/details?id=124"), env });
  assert.equal(response.status, 502);
  code = 429;
  response = await details({ request: request("/api/details?id=125"), env });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  code = 500;
  body = { error: "mock-secret" };
  response = await details({ request: request("/api/details?id=126"), env });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /mock-secret/);
});

// A fresh module per scenario isolates token state. All network is mocked.
async function adapter() {
  return import(`../lib/nsw-worker.js?scenario=${++identity}`);
}
test("mocked adapter shares one token and one identical concurrent data request", async (t) => {
  const { requestNsw } = await adapter();
  let tokenCalls = 0,
    browseCalls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("/oauth/")) {
      tokenCalls++;
      return json({ access_token: "mock-token", expires_in: 3600 });
    }
    browseCalls++;
    return json([]);
  });
  const output = await Promise.all(
    Array.from({ length: 5 }, () =>
      requestNsw(env, "/propertyregister/v1/browse", { searchText: "Example" }),
    ),
  );
  assert.equal(output.length, 5);
  assert.equal(tokenCalls, 1);
  assert.equal(browseCalls, 1);
  await requestNsw(env, "/propertyregister/v1/browse", {
    searchText: "Example",
  });
  assert.equal(browseCalls, 2); // no stale response cache
});
test("mocked 401 refreshes token once; repeated 401 fails safely", async (t) => {
  const { requestNsw } = await adapter();
  let tokens = 0,
    calls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("/oauth/")) {
      tokens++;
      return json({ access_token: `mock-token-${tokens}`, expires_in: 3600 });
    }
    calls++;
    return json({}, 401);
  });
  await assert.rejects(
    requestNsw(env, "/propertyregister/v1/browse", { searchText: "Example" }),
    /could not complete/,
  );
  assert.equal(tokens, 2);
  assert.equal(calls, 2);
});
test("mocked authentication and network errors fail closed; no arbitrary upstream URL", async (t) => {
  const { requestNsw } = await adapter();
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("mock-network-private");
  });
  await assert.rejects(
    requestNsw(env, "/propertyregister/v1/browse", { searchText: "Example" }),
    /could not be reached/,
  );
  await assert.rejects(
    requestNsw(env, "https://untrusted.test", {}),
    /Invalid government/,
  );
  await assert.rejects(
    requestNsw({}, "/propertyregister/v1/browse", { searchText: "Other" }),
    (error) => error.status === 503,
  );
});
