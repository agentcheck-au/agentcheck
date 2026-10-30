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
