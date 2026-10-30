import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeDetails } from "../lib/nsw-worker.js";
const html = readFileSync(
  new URL("../public/index.html", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const js = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const css = readFileSync(
  new URL("../public/styles.css", import.meta.url),
  "utf8",
);
test("editorial identity retains an accurate public source description", () => {
  assert.match(html, /The facts speak louder/);
  assert.match(html, /INDEPENDENT NSW AGENT VERIFICATION/);
  assert.match(
    html,
    /Not affiliated with, approved by or endorsed by the NSW Government/,
  );
  assert.doesNotMatch(html, /NSW Property API/);
  assert.match(css, /prefers-reduced-motion/);
});
test("government endpoints and same-tab clipboard-first handoff remain available", () => {
  assert.match(html, /id="search-form"/);
  assert.match(js, /\/api\/search\?q=/);
  assert.match(js, /\/api\/details\?id=/);
  assert.match(js, /await copyLicence\(number\)/);
  assert.match(js, /window\.location\.assign\(REGISTER\)/);
  assert.doesNotMatch(js, /window\.open\(REGISTER/);
});
test("a red flag can only follow an explicit user-reported match", () => {
  assert.match(js, /setOutcome\(type, true\)/);
  assert.match(js, /not a finding independently verified by AgentCheck/);
  assert.match(js, /not an official all-clear/);
  assert.doesNotMatch(html + js, /Zero records here does NOT mean/);
});
test("licence data excludes private fields", () => {
  const details = normalizeDetails({
    licenceDetail: { licenceName: "Example" },
    premises: [{ businessAddress: "Shop 1 Test Street", secret: "not public" }],
    conditions: [{ description: "CPD required", isActive: "True" }],
    licenseeBirthDate: "private",
  });
  assert.deepEqual(details.premises, ["Shop 1 Test Street"]);
  assert.deepEqual(details.conditions, ["CPD required"]);
  assert.equal(JSON.stringify(details).includes("not public"), false);
});

test("green brand and editorial questions explain eligibility and referral incentives", () => {
  assert.match(css, /--brand-green: #47e5ae/);
  assert.match(html, /Are non-subscribers considered on equal terms/);
  assert.match(html, /Can agents pay to enter/);
  assert.match(html, /REFERRAL WEBSITE/);
  assert.match(html, /Agent A/);
  assert.match(html, /Agent B/);
  assert.match(html, /REFERRAL FEE/);
  assert.match(html, /Who benefits financially from this referral/);
  assert.match(css, /\.enhanced \.question-card\.visible \.ranking-line i/);
  assert.match(js, /IntersectionObserver/);
});
