# AgentCheck preview and production release

## Existing deployment contract

- Repository: `agentcheck-au/agentcheck`.
- Review branch: `studio-redesign`; production branch: `main`.
- Hosting: existing AgentCheck Cloudflare Pages project, identified by the owner as `agentcheck`.
- Build output: `public`; Functions directory: root `functions/`; no framework/build step required.
- Production site: `https://agentcheck.au`.
- Existing secret names: `NSW_API_KEY`, `NSW_API_SECRET`, resolved server-side only. Do not print, replace or copy their values.

The public baseline HTML matched `public/index.html` byte-for-byte. No dashboard setting was changed to establish this contract. There is intentionally no new Wrangler project configuration, binding, database, account identifier or deployment command in this repository.

## Review release (no production changes)

1. Check out the existing `studio-redesign` branch and ensure the remote has not advanced unexpectedly.
2. `npm ci`, `npm test`, `npm run check`.
3. Optional local compilation only: use a reviewed Wrangler installation to run `wrangler pages functions build functions --outdir=.wrangler/qa-build`. This builds a local bundle; it must not be followed by a deployment command.
4. Push only `studio-redesign`, without force. The existing Pages Git integration may automatically produce a preview, depending on its current branch controls. Inspect the AgentCheck commit's Cloudflare check and use its returned deployment URL. Do not enable preview deployment or change production routing/account settings merely to obtain a preview.
5. Open a PR from `studio-redesign` into `main`. Include test results and outstanding release gates.
6. Test the preview's real static assets/headers. If Preview credentials are already configured, perform one controlled search and detail check and verify their displayed identity against the official licence source. If Preview credentials are absent, the API must show an honest unavailable message. Never inject production secrets or replace this state with simulated results on a public preview.
7. Test the external register handoff and Back return. Use actual iPhone Safari and desktop Safari/Firefox/Chromium for clipboard acceptance. A copied-number claim from an API return value is not a guarantee that the operating-system clipboard worked on every device.

## Production gate — owner approval required

Do not merge, promote, redeploy production, alter secrets, create bindings, edit DNS or change account-wide settings as part of review preparation.

Before approval, resolve the security gates in `SECURITY.md`, finish live/real-device checks, review the final diff and verify that the Pages project still tracks `main` for production. Approval to merge does not imply permission to alter unrelated infrastructure.

After explicit production approval, merging the reviewed PR may trigger the existing production Git integration. Assess its actual behaviour before taking any action; preserve a known-good prior deployment for project-scoped rollback. Do not rewrite Git history or delete branches as rollback.

## Privacy and runtime

No application database or server-side visitor history is added. The UI stores a selected public record and optional visitor report in tab-scoped session storage for restoration, accepts it for at most 30 minutes and discards expired/malformed entries on load. A new search clears it. Hosting/government operational logs are outside this application's storage and may exist. API JSON and requests use no-store; only identical in-flight upstream calls share a promise, which is removed on settlement.
