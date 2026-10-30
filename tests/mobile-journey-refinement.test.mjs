import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("the licence record is rendered before the separate regulatory step", () => {
  const profile = app.slice(app.indexOf("function profile("), app.indexOf("function detailsValid("));
  assert.ok(profile.indexOf('const card = add(wrapper, "article", "profile-card")') < profile.indexOf("regulatoryStep(wrapper, record, info)"));
  assert.match(profile, /Continue to Step 2 · Name and Shame Register/);
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
  assert.match(html, /Check their NSW licence. Then check published regulatory actions./);
  assert.match(html, /Awards, rankings and referrals are marketing claims, not official checks/);
});

test("result cards invite visitors to view a record without claiming verification", () => {
  assert.match(app, /"row-button", "View record ↗"/);
  assert.doesNotMatch(app, /"Verify this record ↗"/);
});

test("HTML loads new asset paths so cached pre-release JavaScript cannot run", () => {
  assert.match(html, /src="\/app-20261031-simple-v6\.js"/);
  assert.match(html, /href="\/styles-20261031-simple-v7\.css"/);
  const deployedApp = readFileSync(new URL("../public/app-20261031-simple-v6.js", import.meta.url), "utf8");
  const deployedCss = readFileSync(new URL("../public/styles-20261031-simple-v7.css", import.meta.url), "utf8");
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
  assert.match(html, /https:\/\/agentcheck\.au\/agentcheck-share-v2\.png/);
  assert.match(html, /<link rel="canonical" href="https:\/\/agentcheck\.au\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(about, /not a government website/);
  assert.match(privacy, /30 minutes/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(sitemap, /https:\/\/agentcheck\.au\/about\//);
  assert.match(html, /class="footer-sitemap"/);
});

test("the two official registers are clearly named and independently checked", () => {
  assert.match(html, /id="two-registers"/);
  assert.match(html, /01 \/ LICENCE REGISTER/);
  assert.match(html, /02 \/ NAME AND SHAME REGISTER/);
  assert.match(html, /does not automatically search the Name and Shame Register/);
  assert.match(app, /Did you find this agent on the Name and Shame Register/);
  assert.match(app, /STEP 2 \/ 2 · NAME AND SHAME REGISTER/);
});

test("hero spacing and compact mobile CTA keep the two checks legible", () => {
  assert.match(css, /\.hero-shell \{\s*padding-top: 96px;/);
  assert.match(css, /\.search-panel \{ margin-top: 43px; \}/);
  assert.match(css, /width: min\(204px, 100%\)/);
  assert.match(css, /\.hero-verification-steps \.two-check-note \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("marketing claims section introduces its purpose before showing questions", () => {
  const section = html.slice(html.indexOf('class="editorial"'), html.indexOf('class="about-home"'));
  assert.match(section, /BEYOND THE REGISTERS/);
  assert.match(section, /marketing claims, not official checks/);
  assert.ok(section.indexOf("marketing claims, not official checks") < section.indexOf("01 / AWARDS"));
  assert.match(section, /02 \/ RANKINGS/);
  assert.match(section, /03 \/ REFERRALS/);
  assert.equal((html.match(/01 \/ AWARDS/g) || []).length, 1);
  assert.doesNotMatch(html, /manifesto-points|about-home-steps/);
});

test("quick responses retain a readable loading state without delaying slow requests", () => {
  assert.match(app, /MIN_SEARCH_DISPLAY_MS = 1150/);
  assert.match(app, /MIN_RECORD_DISPLAY_MS = 1900/);
  assert.match(app, /waitForMinimum\(startedAt, MIN_SEARCH_DISPLAY_MS, signal\)/);
  assert.match(app, /waitForMinimum\(startedAt, MIN_RECORD_DISPLAY_MS, signal\)/);
  assert.match(app, /if \(reduced\(\) \|\| signal\.aborted\)/);
});
