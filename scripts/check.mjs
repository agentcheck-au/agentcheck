import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const publicFiles = await readdir("public");
const allowed = new Set([
  "index.html",
  "app.js",
  "styles.css",
  "_headers",
  "_routes.json",
  "favicon.svg",
  "sydney-harbour.webp",
  "referral-motion.css",
  "referral-motion.js",
]);
for (const file of publicFiles)
  assert.ok(allowed.has(file), `Unexpected public artifact: ${file}`);
for (const file of [
  "public/app.js",
  "public/referral-motion.js",
  "lib/nsw-worker.js",
  "scripts/dev-server.mjs",
  "functions/api/search.js",
  "functions/api/details.js",
  "functions/api/_middleware.js",
  "functions/api/[[path]].js",
])
  execFileSync(process.execPath, ["--check", file]);
const html = await readFile("public/index.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "Duplicate HTML IDs");
for (const [, id] of html.matchAll(/href="#([^"]+)"/g))
  assert.ok(ids.includes(id), `Broken anchor #${id}`);
for (const [, url] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g))
  assert.ok(publicFiles.includes(url.slice(1)), `Missing local asset ${url}`);
assert.ok(
  Buffer.byteLength(await readFile("public/sydney-harbour.webp")) < 100000,
  "Hero asset budget",
);
assert.ok(
  Buffer.byteLength(await readFile("public/app.js")) < 60000,
  "Client JS budget",
);
console.log(
  "PASS: JavaScript syntax, static output allowlist, HTML IDs/anchors/assets and asset budgets.",
);
