import test from "node:test";
import assert from "node:assert/strict";
import { requestNsw, ApiError } from "../lib/nsw-worker.js";

test("OneGov fetch uses manual redirects and never forwards credentials to redirects", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), redirect: options.redirect, authorization: options.headers?.Authorization });
    return new Response(null, { status: 302, headers: { Location: "https://example.invalid/steal" } });
  };
  try {
    await assert.rejects(
      requestNsw({ NSW_API_KEY: "fake-key", NSW_API_SECRET: "fake-secret" }, "/propertyregister/v1/browse", { searchText: "sample" }),
      error => error instanceof ApiError && error.status === 502 && /redirect/.test(error.message),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].redirect, "manual");
    assert.equal(new URL(calls[0].url).host, "api.onegov.nsw.gov.au");
    assert.match(calls[0].authorization, /^Basic /);
  } finally {
    globalThis.fetch = original;
  }
});

test("OneGov OAuth and browse both use manual redirects on success", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), redirect: options.redirect });
    if (String(url).includes("/oauth/")) {
      return new Response(JSON.stringify({ access_token: "test-token", expires_in: 3600 }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const data = await requestNsw({ NSW_API_KEY: "fake-key", NSW_API_SECRET: "fake-secret" }, "/propertyregister/v1/browse", { searchText: "another" });
    assert.deepEqual(data, []);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(c => c.redirect === "manual"));
  } finally {
    globalThis.fetch = original;
  }
});
