import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const publicFiles = await readdir("public");
const allowed = new Set([
  "index.html",
  "app.js",
  "app-20261031-mobile-v3.js",
  "app-20261031-mobile-v4.js",
  "app-20261031-mobile-v5.js",
  "styles.css",
  "styles-20261031-brand-v8.css",
  "styles-20261031-simple-v7.css",
  "app-20261031-simple-v6.js",
  "styles-20261031-mobile-v4.css",
  "styles-20261031-mobile-v5.css",
  "styles-20261031-mobile-v6.css",
  "_headers",
  "_routes.json",
  "favicon.svg",
  "favicon.png",
  "favicon.ico",
  "apple-touch-icon.png",
  "agentcheck-wordmark-v3.svg",
  "agentcheck-wordmark-light-v3.svg",
  "agentcheck-icon-v3.svg",
  "agentcheck-icon-v3.png",
  "agentcheck-logo-v3.png",
  "sydney-harbour.webp",
  "referral-motion.css",
  "referral-motion.js",
  "about",
  "privacy",
  "agentcheck-badge.svg",
  "agentcheck-share.png",
  "agentcheck-share-v3.png",
  "agentcheck-share-v2.png",
  "robots.txt",
  "sitemap.xml",
]);
for (const file of publicFiles)
  assert.ok(allowed.has(file), `Unexpected public artifact: ${file}`);
for (const file of [
  "public/app.js",
  "public/app-20261031-mobile-v3.js",
  "public/referral-motion.js",
  "lib/nsw-worker.js",
  "scripts/dev-server.mjs",
  "functions/api/search.js",
  "functions/api/details.js",
  "functions/api/_middleware.js",
  "functions/api/[[path]].js",
])
  execFileSync(process.execPath, ["--check", file]);
// The deployed cache-busting copies must exactly match canonical sources.
for (const [source, deployed] of [
  ["public/app.js", "public/app-20261031-simple-v6.js"],
  ["public/styles.css", "public/styles-20261031-brand-v8.css"],
]) {
  assert.equal(await readFile(deployed, "utf8"), await readFile(source, "utf8"),
    `Deployed asset out of sync: ${deployed}`);
}
const html = await readFile("public/index.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "Duplicate HTML IDs");
for (const [, id] of html.matchAll(/href="#([^"]+)"/g))
  assert.ok(ids.includes(id), `Broken anchor #${id}`);
for (const [, url] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)) {
  const path = url.slice(1);
  const exists = path === "" || publicFiles.includes(path) || (path.endsWith("/") && publicFiles.includes(path.slice(0, -1)));
  assert.ok(exists, `Missing local asset ${url}`);
}
for (const path of ["public/about/index.html", "public/privacy/index.html"]) {
  const content = await readFile(path, "utf8");
  assert.match(content, /<link rel="canonical"/);
  assert.match(content, /<meta name="description"/);
  assert.match(content, /agentcheck-share-v3\.png/);
}
assert.match(html, /"@type":"WebSite"/);
assert.match(html, /property="og:image"/);
assert.ok(html.includes("agentcheck-share-v3.png"));
assert.match(html, /id="two-registers"/);
assert.match(html, /href="\/about\/"/);
assert.match(html, /href="\/privacy\/"/);

// Validate the actual exported pixels and the references crawlers/link services use.
for (const [file, width, height] of [
  ["favicon.png", 96, 96],
  ["apple-touch-icon.png", 180, 180],
  ["agentcheck-icon-v3.png", 512, 512],
  ["agentcheck-logo-v3.png", 1200, 260],
  ["agentcheck-share-v3.png", 1200, 630],
]) {
  const bytes = await readFile(`public/${file}`);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file}: PNG signature`);
  assert.equal(bytes.readUInt32BE(16), width, `${file}: width`);
  assert.equal(bytes.readUInt32BE(20), height, `${file}: height`);
}
for (const page of ["public/index.html", "public/about/index.html", "public/privacy/index.html"]) {
  const content = await readFile(page, "utf8");
  assert.match(content, /rel="icon" href="\/favicon\.png"/);
  assert.match(content, /rel="apple-touch-icon"/);
  assert.match(content, /src="\/agentcheck-wordmark-v3\.svg"/);
  assert.doesNotMatch(content, /agentcheck-badge\.svg|agentcheck-share-v2\.png|class="brand-mark"/);
}

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
