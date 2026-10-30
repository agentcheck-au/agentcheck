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
- Responsive 390px iframe viewport (375px content after scrollbar): mobile navigation opened/closed; keyboard search and record selection worked; licence and regulatory steps were readable; manual-copy field and continuation link appeared. No horizontal overflow measured in that state.
- The mobile iframe is responsive-layout testing in Chromium, **not iPhone Safari or touch-device emulation**. Official government framing is blocked, as expected; the real handoff was tested in the top-level desktop tab.
- The cloud browser's independent clipboard read returned empty after the legacy copy API reported success. Therefore an OS-level clipboard-success claim is not made. Programmatic success/failure paths are tested with mocks; actual iPhone Safari clipboard acceptance remains a release gate.

## Pending release evidence

Cloudflare preview URL, preview acceptance checks and PR details are recorded after the candidate is pushed. Production approval remains pending. No production merge, deployment promotion or configuration change is part of this QA.
