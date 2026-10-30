# AgentCheck Studio redesign, repository consolidation and verification hardening

Replaces the overlapping starter generations with one Cloudflare Pages codebase and a complete consumer journey: search, explicitly identify a licence record by suburb/name/number, retrieve government licence status, visit the separate Fair Trading register and return to a clearly labelled saved lookup.

The Studio design adds a cinematic Sydney introduction, system-font editorial hierarchy, pointer-responsive lighting, optional motion, accessible disclosures and responsive verification stages. The second regulatory check is prominent before extended licence details. Visitor-entered findings are always labelled visitor-reported; a current licence never implies a clean disciplinary history.

Removes the verified-unused root front end, Vercel handlers/config/library, duplicate CommonJS tests and outdated setup instructions. Retains the established OneGov endpoints/runtime secret names and public-data allowlists. Adds bounded local limiting, concurrent request deduplication, fixed public errors, input/schema/identity checks, API headers/method/origin guards, cancellation, timeouts and clipboard/storage fallbacks.

Validation: 40/40 tests, static/syntax checks, clean dependency audit and local Wrangler 4.156.0 Functions compilation pass. Chromium desktop and responsive layouts at 320/390/760/1024px reviewed. Official register navigation/Back restoration tested using simulated licence data. Tests do not establish live NSW verification or actual iPhone Safari clipboard behaviour.

Production gates: approve a distributed quota/abuse protection plan, confirm historical credential rotation and current government data-use terms, then complete live Preview and real-device acceptance. No production approval is implied by this PR.

Scope: AgentCheck only. No Valdero, Supabase, Vercel project, DNS, production secret or shared account setting was accessed or changed. Merge/deployment requires explicit owner approval.


Preview: https://studio-redesign.agentcheck-3o4.pages.dev/ . Cloudflare deployment and both GitHub CI runs succeeded. The deployed UI was reviewed, but a controlled live search currently returns the application's credential-unavailable message. Preview credential configuration and live acceptance remain outstanding; no Cloudflare settings or secret values were accessed or changed.
