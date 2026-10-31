# AgentCheck

Independent consumer information for checking NSW property agents. **Not a government website or an endorsement service.**

The visitor journey has two distinct checks:

1. Search NSW Government property licence records by name/licence number, select the correct identity and read the detailed licence status directly in AgentCheck. An optional suburb/postcode mode matches registered-address fields returned by the existing general-text API; its coverage is **not verified or comprehensive**. The official Verify NSW location search remains necessary for broader results.
2. Keep AgentCheck open while visiting the official NSW Fair Trading Name and Shame Register in a separate tab. AgentCheck does not independently search it. Any finding entered by the visitor is labelled **visitor-reported**, never government-verified. A current licence is not evidence of a clean disciplinary history.
3. Read the independent five-point consumer checklist covering licence status, regulatory history, sales evidence, awards and referral incentives.

## Source of truth

| Directory | Purpose |
| --- | --- |
| `public/` | Complete static website and security/routing files. Cloudflare Pages output directory. |
| `functions/api/` | Same-origin Pages Functions, method/origin guard and JSON 404 fallback. |
| `lib/nsw-worker.js` | Fixed OneGov OAuth and property-register adapter; public-field normalization; best-effort local limits. |
| `tests/` | Node unit, API and DOM journey tests. All government responses are mocked. |
| `scripts/` | Static/syntax checks and an explicitly simulated local QA server. Never deployed as public assets. |
| `docs/` | Baseline audit, release procedure, security limitations and verification evidence. |

There is one Cloudflare implementation. The obsolete Vercel starter was removed after its lack of use was verified. No database, sign-in, remote font, analytics script or runtime package dependency is introduced.

## Work locally

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm run check
npm run dev
```

The development server prints its local URL and **always uses simulated NSW responses**, with a visible QA banner. `Alex Example` returns ambiguous records; `single`, `none`, `many`, `error` and `quota` exercise specific states. `/__qa/mobile?width=390` embeds the site at a selected responsive width. These fixtures are not accessible through the production Pages Functions and are not live verification.

`linkedom` is a locked development-only dependency for automated DOM tests; no package is shipped to the browser. The site is buildless: Pages serves `public/`, with Functions built from the repository root.

## Release and security

- Work only on `studio-redesign`. Open a PR into `main`; do not merge or deploy production without the owner's explicit approval.
- Preserve the existing Cloudflare project configuration and production secrets `NSW_API_KEY` and `NSW_API_SECRET`. Never put credentials in browser code, Git, documentation, screenshots or test fixtures.
- The local request limiter and in-flight deduplication reduce accidental/repeated traffic, but **do not guarantee distributed quota protection**. A project-scoped protection plan and live acceptance checks remain release gates.
- No other project, database, DNS or shared account setting is part of this workflow.

Read [the audit](docs/AUDIT.md), [security review](docs/SECURITY.md), [deployment guide](docs/DEPLOYMENT.md) and [release verification](docs/QA.md) before approving production.
