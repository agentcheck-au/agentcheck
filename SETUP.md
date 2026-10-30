# AgentCheck

Independent NSW property agent licence lookup. **Not affiliated with or endorsed by the NSW Government.** This codebase is separate from Valdero.

## What works

- Public search by name or licence number using `GET /propertyregister/v1/browse`.
- View an individual public licence record using `GET /propertyregister/v1/details`.
- Handoff to the official NSW Fair Trading Name and Shame Register: opens the official search section and copies the selected **licence number** to the clipboard (when permitted); includes desktop and mobile paste instructions.
- No login or database. The service does not intentionally store visitor queries or results.

**Crucial caveat:** The NSW Property API's `complianceActions` data is not a complete or reliable copy of the **separate** Name and Shame Register. Never claim "no disciplinary history" from an empty API response. Cross-check source records and the NSW API terms before public launch.

## Setup

1. Deploy this folder as a **new Vercel project** in the existing team; framework preset **Other**. Do **not** import or modify `homepoint-app`.
2. Rotate the NSW API key and secret that appeared in a previous screenshot.
3. In **Vercel → AgentCheck → Settings → Environment Variables**, add `NSW_API_KEY` and `NSW_API_SECRET` for Preview and Production. Do not include these in Git or client-side code.
4. Redeploy and verify a search and detail lookup. Check that the licence number is copied and the official register opens in another tab.
5. Before going public: confirm API republication terms, add durable rate limiting / Vercel WAF, confirm active-plan capacity and check accessibility/privacy requirements. The included in-memory limiter is a **basic safeguard only**; it does not share counters across Vercel serverless instances.
6. In **Vercel → AgentCheck → Settings → Domains**, add `agentcheck.au` and `www.agentcheck.au`. Use the DNS records provided by Vercel in GoDaddy for **agentcheck.au only**. Leave `valdero.com.au` untouched.

## Local development

With Node.js 20+ installed, run `npx vercel dev` after creating a local `.env` from `.env.example`. The API functions run in the Vercel dev runtime; opening `index.html` directly will only show the static interface. Run `npm test` for normalization and validation checks.

## Quota & privacy

NSW Property API: published free tier of 2,500 calls/month. Searches and details calls count toward the quota. Access tokens and API keys are handled server-side only. Avoid logging personally entered search terms or raw NSW API responses. Refrain from publishing a "clean record" badge; not all Name and Shame records are included in Property API output.
