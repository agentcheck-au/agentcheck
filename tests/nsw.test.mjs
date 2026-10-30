import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBrowseRecord,
  normalizeDetails,
  allowRequest,
} from "../lib/nsw-worker.js";
import { onRequestGet as browse } from "../functions/api/search.js";
import { onRequestGet as details } from "../functions/api/details.js";

test("browse includes only public necessary fields", () => {
  const r = normalizeBrowseRecord({
    licenceID: "9099589",
    licenceName: "Test Agent",
    licenceNumber: "12345",
    status: "Current",
    licenseeBirthDate: "secret",
  });
  assert.equal(r.licenceID, "9099589");
  assert.equal("licenseeBirthDate" in r, false);
});
test("details empty compliance does not imply clean history", () => {
  const r = normalizeDetails({
    licenceDetail: { status: "Current" },
    complianceActions: { infringementNotices: [], publicWarningsCount: 0 },
  });
  assert.equal(
    r.compliance.actions.find((a) => a.label === "Infringement notices").count,
    0,
  );
  assert.equal(r.compliance.publicWarningsCount, 0);
});
test("limiter stops repeated requests per worker instance", () => {
  const key = `test-${Date.now()}`;
  assert.equal(allowRequest(key, 1), true);
  assert.equal(allowRequest(key, 1), false);
});
test("search rejects invalid input without API credentials", async () => {
  const r = await browse({
    request: new Request("https://agentcheck.test/api/search?q=x"),
    env: {},
  });
  assert.equal(r.status, 400);
});
test("detail rejects malformed identifier without API credentials", async () => {
  const r = await details({
    request: new Request("https://agentcheck.test/api/details?id=bad%20id"),
    env: {},
  });
  assert.equal(r.status, 400);
});
test("no secrets: valid search without credentials fails closed", async () => {
  const r = await browse({
    request: new Request("https://agentcheck.test/api/search?q=Glenn%20Hagan"),
    env: {},
  });
  assert.equal(r.status, 503);
  const b = await r.json();
  assert.equal(Object.hasOwn(b, "results"), false);
});
