import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8").replace(/\s+/g, " ");
const css = readFileSync(new URL("../public/referral-motion.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../public/referral-motion.js", import.meta.url), "utf8");
test("referral animation shows three agents, a recommendation and a reverse fee flow", () => {
  for (const label of ["REFERRAL WEBSITE", "Agent A", "Agent B", "Agent C", "RECOMMENDATION", "FEE TO WEBSITE", "YOU", "NOT ALL PLATFORMS CHARGE FEES"]) assert.ok(html.includes(label), label);
  assert.match(html, /referral-visual" role="img" aria-label=/);
  assert.match(css, /ac-recommend/);
  assert.match(css, /ac-fee/);
  assert.match(html, /d="M270 236 V182 H180 V160" marker-end="url\(#referral-fee-arrow\)"/);
  assert.match(html, /d="M180 160 V182 H90 V236" marker-end="url\(#referral-recommend-arrow\)"/);
  assert.match(html, /<strong>AGENT B<\/strong><small>Pays referral fee<\/small>/);
  assert.match(css, /background: #1b4c80/);
});
test("referral animation respects viewport, visibility and reduced motion", () => {
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /motion-paused/);
  assert.match(js, /threshold: 0.55, rootMargin: "0px 0px -12% 0px"/);
  assert.match(js, /setCurrentTime\?\.\(0\)/);
  assert.match(js, /pauseAnimations/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
test("editorial scroll reveal uses a separate, later viewport threshold", () => {
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /threshold: 0.28, rootMargin: "0px 0px -18% 0px"/);
  assert.match(app, /node.matches\("\.question-card"\)/);
});
