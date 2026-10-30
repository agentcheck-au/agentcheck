import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const js = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

test("iPhone input does not trigger Safari auto zoom", () => {
  assert.match(css, /\.search-panel \.search-input-wrap input \{ font-size: 16px; \}/);
});
test("results scroll vertically without shifting horizontal viewport", () => {
  assert.match(js, /window\.scrollTo\(\{/);
  assert.match(js, /left: 0/);
  assert.doesNotMatch(js, /node\.scrollIntoView\(\{ behavior/);
  assert.match(css, /html, body \{ overflow-x: clip; \}/);
});
test("non-JSON search responses distinguish server faults from licence results", () => {
  assert.match(js, /text\\\/html/);
  assert.match(js, /server returned a webpage instead of licence data/);
  assert.match(js, /this is not a licence result/);
});
