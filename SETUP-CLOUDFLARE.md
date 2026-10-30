# AgentCheck — Cloudflare Pages edition

This edition works with Cloudflare Pages (Free tier) and your **private** `agentcheck-au/agentcheck` GitHub organisation repository. It is independent of Valdero.

## Replace the Vercel starter with Cloudflare files

1. Unzip this archive. In the `agentcheck-au/agentcheck` private GitHub repository, upload the **contents** of the archive (folders `public`, `functions`, `tests`, root `package.json`, this setup file) using **Add file → Upload files** and commit. If replacing the existing `package.json`, confirm the overwrite; GitHub's web upload may not allow replacing in one shot—in that case edit that file separately.
2. The old `api`, `lib`, `index.html`, `app.js`, `styles.css`, and `vercel.json` files in the repository root can be removed later. The Cloudflare build only serves `public` and its Functions run from `functions`, so the old Vercel files are unused.

## Create free Cloudflare Pages project

1. In Cloudflare dashboard, choose **Workers & Pages → Create application → Pages → Connect to Git**.
2. Authorize GitHub repository `agentcheck-au/agentcheck` (select only this repository).
3. Configure **Production branch:** `main`; **Framework preset:** None; **Build command:** leave blank; **Build output directory:** `public`.
4. Deploy. Your site receives a temporary `*.pages.dev` address.
5. In **Pages project → Settings → Variables and Secrets**, add two **encrypted Secrets** to Production and Preview: `NSW_API_KEY` and `NSW_API_SECRET` (freshly rotated credentials). Do not share them in chat or commit them to GitHub. Redeploy after setting secrets.
6. Test search, details, status, and copy-and-open Name and Shame register handoff. This starter is not approved for public launch before NSW API terms and durable rate limiting/abuse-control rules are reviewed.
7. In **Pages project → Custom domains**, add `agentcheck.au`. Cloudflare requires changing nameservers for the root domain to Cloudflare. In GoDaddy, update nameservers for **agentcheck.au only**. Do not alter `valdero.com.au`. Complete Cloudflare domain ownership verification and add `www.agentcheck.au` if desired.

## Important

- The NSW Property API does **not** reliably mirror the Name and Shame Register. Do not imply that a missing API compliance entry means no disciplinary history.
- The API is subscription quota-limited (your subscription shows 2,500 calls/month). A shared quota budget and durable rate limiter should be set before public advertising. This starter includes only a per-worker-instance basic limiter and *is not sufficient* against determined abuse or high-volume traffic.
- Your `lib/nsw-worker.js` contains no secrets, only secret references resolved in Cloudflare runtime.
- Pages may include automated analytics/log retention depending on your Cloudflare settings; do not claim no access or connection logging by the host.
