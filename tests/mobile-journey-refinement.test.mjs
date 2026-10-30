import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("the licence record is rendered before the separate regulatory step", () => {
  const profile = app.slice(app.indexOf("function profile("), app.indexOf("function detailsValid("));
  assert.ok(profile.indexOf('const card = add(wrapper, "article", "profile-card")') < profile.indexOf("regulatoryStep(wrapper, record, info)"));
  assert.match(profile, /Continue to Step 2 · Check regulatory history/);
  assert.match(app, /card.id = "regulatory-check"/);
});

test("selection copy does not imply a visitor filed a report", () => {
  assert.doesNotMatch(app, /Visitor-reported|You reported|your reported result/);
  assert.match(app, /This selection is not a finding independently verified/);
});

test("mobile search dismisses keyboard and delays scrolling until viewport settles", () => {
  assert.match(app, /input\.blur\(\);\s*search\(q\);/);
  assert.match(app, /visualViewport/);
  assert.match(css, /\.results-tools input \{ font-size: 16px; \}/);
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
});

test("hero and education section explain the purpose of the two checks", () => {
  assert.match(html, /verify their NSW licence, then check the separate/);
  assert.match(html, /Awards, rankings and referral platforms can shape who you trust/);
});

test("result cards invite visitors to view a record without claiming verification", () => {
  assert.match(app, /"row-button", "View record ↗"/);
  assert.doesNotMatch(app, /"Verify this record ↗"/);
});

test("HTML loads new asset paths so cached pre-release JavaScript cannot run", () => {
  assert.match(html, /src="\/app-20261031-mobile-v3\.js"/);
  assert.match(html, /href="\/styles-20261031-mobile-v4\.css"/);
  const deployedApp = readFileSync(new URL("../public/app-20261031-mobile-v3.js", import.meta.url), "utf8");
  const deployedCss = readFileSync(new URL("../public/styles-20261031-mobile-v4.css", import.meta.url), "utf8");
  assert.equal(deployedApp, app);
  assert.equal(deployedCss, css);
});

test("iOS waits for returned results before scrolling and does not focus the results heading", () => {
  assert.match(app, /if \(isMobileViewport\(\)\) revealResultsOnMobile\(id\)/);
  assert.match(app, /if \(isMobileViewport\(\)\) return;\s*node\.tabIndex/);
  assert.match(css, /-webkit-text-size-adjust: 100%/);
});

test("SEO and public information pages include crawlable, truthful metadata", () => {
  const about = readFileSync(new URL("../public/about/index.html", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("../public/privacy/index.html", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
  const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.match(html, /https:\/\/agentcheck\.au\/agentcheck-share\.png/);
  assert.match(html, /<link rel="canonical" href="https:\/\/agentcheck\.au\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(about, /not a government website/);
  assert.match(privacy, /30 minutes/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(sitemap, /https:\/\/agentcheck\.au\/about\//);
  assert.match(html, /class="footer-sitemap"/);
});
