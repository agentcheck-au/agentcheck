# AgentCheck release verification

## Automated evidence

- Baseline: 10/10 tests passed before changes.
- Release candidate: 40/40 Node unit, API and DOM integration tests passed; no skipped tests.
- `npm run check`: JavaScript syntax, public-output allowlist, unique HTML IDs, local assets/anchors and image/JavaScript budgets pass.
- Cloudflare Wrangler 4.156.0: `pages functions build functions --outdir=.wrangler/qa-build` compiled the Worker successfully, locally. No deploy command was run.
- `npm audit`: zero known vulnerabilities across the locked development dependencies at review time. No production package dependencies.
- `git diff --check`: passed.

The tests cover fixed OneGov endpoints, token sharing/refresh, errors/429/503, response allowlists, invalid parameters and methods, cross-site browser requests, local limiter saturation, explicit single-result selection, ambiguous suburbs, hostile text, missing/mismatched identity, missing status, government compliance counts, visitor-reported outcomes, cancellation/stale responses, clipboard success/failure, blocked storage, saved-state validation, manual copying, reduced motion, menu and education controls.

**All automated government, clipboard and browser-storage results are simulated.** DOM tests use `linkedom`; they are not real-device browser tests or proof of a live government record.

## Browser evidence collected during implementation

- Chromium desktop (1363px viewport): cinematic homepage inspected visually; three simulated matching records rendered; suburb filtering narrowed to Riverstone; explicit selection retrieved the simulated detailed record.
- Government handoff: the copy action navigated to the actual official NSW Fair Trading page; browser Back restored the selected simulated record without another NSW request. The restored page clearly said it was a saved lookup. No actual regulatory-register finding was searched or verified.
- Visitor-reported matching action activated through the keyboard and displayed a red warning with an explicit non-independent-verification statement.
- Responsive 320px, 390px, 760px and 1024px iframe viewports (305px, 375px, 745px and 1009px content after scrollbar): mobile navigation opened/closed; keyboard search and record selection worked; licence and regulatory steps were readable; manual-copy field and continuation link appeared. No horizontal overflow measured at those widths. The final 320px manual-copy state was also visually inspected.
- The mobile iframe is responsive-layout testing in Chromium, **not iPhone Safari or touch-device emulation**. Official government framing is blocked, as expected; the real handoff was tested in the top-level desktop tab.
- The cloud browser's independent clipboard read returned empty after the legacy copy API reported success. Therefore an OS-level clipboard-success claim is not made. Programmatic success/failure paths are tested with mocks; actual iPhone Safari clipboard acceptance remains a release gate.

## Published preview and PR — 30 October 2026

- GitHub write access was enabled for `agentcheck-au/agentcheck` and the tested candidate was published to `studio-redesign` through the connected GitHub app. The four published commit file trees exactly matched their local candidate counterparts; commit identifiers differ because the connector creates commit metadata.
- Candidate implementation head: `6043c0a754a2ef9520057d212ead497f32cea1c6`; final tested candidate tree: `517695c81cb5f9b74df455d36c07404446f644d2`. Subsequent release-evidence changes affect documentation only.
- PR: https://github.com/agentcheck-au/agentcheck/pull/1 — open, ready for review, targeting `main`; not merged. GitHub reported a clean merge state.
- Cloudflare Pages: successful automatic preview deployment. Candidate URL: https://566acc4d.agentcheck-3o4.pages.dev/ . Branch alias: https://studio-redesign.agentcheck-3o4.pages.dev/ . No Cloudflare configuration was changed.
- Both GitHub push and pull-request CI runs passed, and all 40 tests plus static checks passed again locally on publication.
- The deployed homepage was opened and inspected in Chromium. A controlled search for the owner's public professional name displayed “Live licence search is unavailable. Please use the official licence register or try later.” This is the application's missing-runtime-credentials response. No live NSW licence record or detail was verified; no secret value or Cloudflare setting was inspected or changed.
- Shell HTTP acceptance requests could not reach this preview (executor received HTTP 403), so byte-for-byte deployed asset and header checks were not completed from that environment. This is separate from the successful browser access.
- Existing simulated clipboard, request, identity, error and responsive tests remain valid. Real iPhone Safari/Firefox/Safari acceptance and live licence lookup remain outstanding.

## Remaining release gates

Preview credential availability must be resolved through a separately authorised AgentCheck-only configuration step before live licence acceptance. Distributed quota protection, historical credential-rotation confirmation and current government data-use terms remain open. Production merge/deployment requires explicit owner approval.

Valdero was outside scope. No database, Vercel project, DNS, account-wide, production-secret or production-branch changes were made.
# Readability pass — 31 October 2026

- Homepage copy reduced from 1,058 to 589 words (about 44%, counting text outside scripts/styles).
- Combined the repeated marketing-claims sections; removed duplicate two-check explanations and reduced footer links. Supporting award/ranking/referral questions remain expandable.
- Main reading text uses 17–20px with wider line spacing, larger section gaps and shorter line lengths. About and Privacy use a single reading column.
- Local Chromium review: desktop hero, 390px mobile hero and licence journey, expanded award details, and 320px homepage/About layouts. The narrow pages fit their viewport without horizontal document overflow.
- Local search and detail checks used the explicitly labelled simulated QA server; this pass does not reverify live government data or real-device Safari clipboard behavior.
- `npm test`: 67/67 passed. `npm run check` and `git diff --check`: passed.
- New versioned JS/CSS assets match canonical sources; previous asset URLs retained for open tabs.

# Approved shield-and-tick logo — 31 October 2026

- Owner approved the corrected logo: the tick remains inside the shield; the complete mark is small and raised at the right of the AgentCheck wordmark.
- Applied outlined SVG wordmarks to the homepage header/footer and About/Privacy headers. Small-display strokes stay legible without changing the approved proportions.
- Updated Open Graph/Twitter artwork to a new 1200×630 URL, structured-data logo, 96px PNG favicon, ICO fallbacks and 180px Apple touch icon. Legacy direct badge/share URLs also use the current identity.
- 67/67 tests and static checks pass. Exported PNG dimensions/signatures and each public page's logo/icon/share references are checked. Desktop and 320px mobile header reviewed; no horizontal document overflow.
- User explicitly approved applying the corrected logo and merging it with the readability changes into main. Pre-release main: `2010fd02038f3feb844fd60d067389f36b944591`; pre-logo review: `3be074967f6970739220a51952dc1f4aa9038ae1`.

# Clearer register handoff and middle-section styling — 31 October 2026

- Removed the extra blue “Continue to Step 2” link from the licence card. The next card explicitly says “NEXT · STEP 2 / 2” and introduces the separate Name and Shame Register check.
- Added two concise numbered directions: open/paste the ready licence number, then use the browser Back button and choose the result here for guidance.
- Presented the validated licence number in a labelled readonly field. Renamed the primary action to “Open Name and Shame Register”; automatic copying, fixed official destination, saved return state and failure handling remain intact.
- Moved optional manual-copy/no-copy links into a native help disclosure. Failed automatic copying still exposes the selectable fallback without navigating away or claiming success.
- Added a soft blue background and separate rounded question cards to the middle section without adding images or changing the logo.
- 67/67 automated tests, static checks and diff checks pass. Clipboard/navigation integration coverage now also checks the readonly prefilled number and the simplified action.
- Local Chromium review: desktop Step 2, middle-section cards, 390px and 320px mobile fit, copying-help disclosure, manual fallback and saved-journey restoration after reload. No horizontal document overflow at either narrow width.
- Previous production baseline: `f89e5464b31225a09fffe0466a3ba67982eee84b`. No backend, secret, database, DNS or Cloudflare account-setting changes.

