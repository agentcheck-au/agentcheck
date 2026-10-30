import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8").replace(/\s+/g, " ");
const css = readFileSync(new URL("../public/referral-motion.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../public/referral-motion.js", import.meta.url), "utf8");
test("referral animation shows three agents, a recommendation and a reverse fee flow", () => {
  for (const label of ["REFERRAL WEBSITE", "Agent A", "Agent B", "Agent C", "RECOMMENDATION", "REFERRAL FEE", "YOU", "NOT ALL PLATFORMS CHARGE FEES"]) assert.ok(html.includes(label), label);
  assert.match(html, /referral-visual" role="img" aria-label=/);
  assert.match(css, /ac-recommend/);
  assert.match(css, /ac-fee/);
});
test("referral animation respects viewport, visibility and reduced motion", () => {
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /motion-paused/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});