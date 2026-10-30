import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8").replace(/\s+/g, " ");
const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const referral = readFileSync(new URL("../public/referral-motion.js", import.meta.url), "utf8");

test("hero and editorial headlines are swapped without losing either message", () => {
  const hero = html.slice(html.indexOf('<h1 id="hero-title">'), html.indexOf("</h1>", html.indexOf('<h1 id="hero-title">')));
  const editorial = html.slice(html.indexOf('<h2 id="questions-title">'), html.indexOf("</h2>", html.indexOf('<h2 id="questions-title">')));
  assert.match(hero, /Look past the <em>polish/);
  assert.match(hero, /Find the <em>proof/);
  assert.doesNotMatch(hero, /The claims are loud/);
  assert.match(editorial, /The claims are loud/);
  assert.match(editorial, /The facts speak louder/);
});

test("verification stages and NSW source attribution are outside the search card", () => {
  const panelStart = html.indexOf('<div class="search-panel"');
  const panelEnd = html.indexOf('<div class="hero-verification-steps"');
  const panel = html.slice(panelStart, panelEnd);
  assert.ok(panelStart > 0 && panelEnd > panelStart);
  assert.match(panel, /id="search-form"/);
  assert.match(panel, /id="search-input"/);
  assert.match(panel, /id="search-button"/);
  assert.doesNotMatch(panel, /01 \/ Licence status/);
  assert.doesNotMatch(panel, /02 \/ Name and Shame Register/);
  assert.match(html.slice(panelEnd, html.indexOf('<div class="hero-bottom"', panelEnd)), /01 \/ Licence status/);
  assert.match(html.slice(panelEnd, html.indexOf('<div class="hero-bottom"', panelEnd)), /02 \/ Name and Shame Register/);
  assert.match(html.slice(panelEnd, html.indexOf('<div class="hero-bottom"', panelEnd)), /Licence lookup from NSW Government records/);
  assert.match(css, /width: min\(650px, 100%\)/);
});

test("scroll reveals work again when reversing direction and do not trigger early", () => {
  assert.match(app, /entry\.target\.classList\.add\("visible"\)/);
  assert.match(app, /entry\.target\.classList\.remove\("visible"\)/);
  assert.doesNotMatch(app, /observer\.unobserve\(entry\.target\)/);
  assert.match(app, /makeRevealObserver\(0\.28, "0px 0px -18% 0px"\)/);
  assert.match(app, /dataset\.scrollDirection/);
  assert.match(css, /data-scroll-direction="up"/);
  assert.match(referral, /entry\.intersectionRatio >= 0\.55/);
});
