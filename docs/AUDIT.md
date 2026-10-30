# AgentCheck repository audit

Recorded before structural changes, 30 October 2026 (Australia/Sydney).

## Baseline and deployment evidence

- Authorised repository: `agentcheck-au/agentcheck`; working branch: `studio-redesign`.
- Both remote branches (`main`, `studio-redesign`) initially point to `00ebae5958b424edd26102daf172a8b24ae6ee07`. No branch differences or uncommitted files.
- Five reachable commits; 27 unique historical blobs. Pattern scans of every blob found no obvious hard-coded provider tokens, private keys or literal credential assignments. Manual inspection found secret references only. This is a scoped source review, not proof that no secret has ever been exposed elsewhere.
- The public repository is public, although old setup instructions call it private.
- A read-only GET of `https://agentcheck.au` returned HTML byte-for-byte equal to `public/index.html` at the baseline. Its CSP matches `public/_headers`. Existing setup documentation specifies `public` as Pages output and root `functions/` as the backend. Together these confirm the active source layout; dashboard build settings have not been independently inspected.
- No checked-in Cloudflare build configuration, workflow, lockfile or AGENTS.md. No initial GitHub commit statuses. Cloudflare dashboard access is not available through the connected tools.

## Duplication and incomplete upload findings

- Root `index.html`, `app.js`, `styles.css`, `api/`, `lib/nsw.js`, `tests/nsw.test.js`, `vercel.json`, and `SETUP.md` are the old Vercel starter. Only the old routes/tests import the old library. They are not dependencies of the deployed Cloudflare tree.
- `tests/nsw.test.js` uses CommonJS despite the current package being ESM. The current test command runs only `.test.mjs`, silently excluding it. Its three cases are duplicated by the Cloudflare suite.
- `DEPLOY-V3.md` instructs uploads directly to `main`; `SETUP-CLOUDFLARE.md` mixes initial account/DNS setup with release instructions. Replace both with a single preview/review deployment guide.
- Existing Cloudflare files are intact; the problem is overlapping generations, rather than confirmed truncated uploads. The supplied Studio candidate has larger, coherent replacements for the public interface and unchanged government adapter/routes.
- Baseline: 10/10 current tests pass. Most UI assertions check source strings, so they do not prove browser behaviour.

## Existing government integration

Browser requests same-origin `/api/search?q=…` and `/api/details?id=…`. Pages Functions validate input and call `lib/nsw-worker.js`. The adapter obtains an OAuth client-credentials token from the fixed OneGov host using runtime-only `NSW_API_KEY` and `NSW_API_SECRET`, then calls `/propertyregister/v1/browse` and `/propertyregister/v1/details`. Token reuse, a single pending token promise, one retry on 401, fixed upstream destinations, and public-field allowlists already exist.

The separate Fair Trading Name and Shame Register is a visitor handoff. AgentCheck does not search it. The interface must keep visitor-reported findings distinct from government licence data, and must never infer a clean disciplinary history from a current licence or empty compliance arrays.

## Risks and planned reversible changes

1. Per-isolate limiter resets all buckets when full; no distributed quota budget. Improve bounded local limiting and in-flight deduplication, while documenting the remaining distributed-abuse limit. No new binding, database, WAF/account setting or paid resource is authorised.
2. API routes expose arbitrary exception messages; reject unexpected failures with fixed public errors. Apply security headers to function responses as well as static assets.
3. Search silently auto-selects a single result, and selection has no back-to-results control. Require explicit identity selection and retain the result list.
4. Studio candidate needs robust request cancellation/timeouts, honest missing-status handling, keyboard focus management, reliable handoff restoration (including manual-copy path), validation of saved state, and reduced-motion behaviour in JavaScript scrolling.
5. Candidate CSS names fonts that are not shipped. Use system fonts with deliberate hierarchy; avoid adding a remote font dependency. Improve educational composition beyond three repeated cards, and provide a clear motion control.
6. Keep the fixed NSW integration and existing production secret names. Remove only the verified unused starter; retain its equivalent test coverage in the active suite. Keep all release changes on `studio-redesign`.

## Isolation

Only AgentCheck repository/source, public site, supplied candidate, and relevant public platform/government documentation were used. No Valdero resources, Supabase systems, Vercel projects, DNS, account-wide settings or production secrets were accessed or changed. Unrelated search suggestions are excluded from the task.

## Subsequent deployment evidence

The baseline commit's GitHub **check run** (distinct from commit statuses) was found after the initial audit. `Cloudflare Pages` reported success for an existing `studio-redesign` preview under `agentcheck-3o4.pages.dev`; its project-scoped dashboard link identifies the Pages project as `agentcheck`. This confirms an existing automatic preview integration. No Cloudflare settings were changed.
