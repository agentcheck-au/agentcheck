# AgentCheck — Premium two-step verification update (V3)

## What this changes

- New premium homepage using the approved dark navy, blue and Sydney evening visual language.
- Cleaner search-result rows with much more prominent suburbs, while preserving returned government data. No suburb is inferred when the API doesn't provide one.
- Animated licence-lookup shield and separated licence status and regulatory-check states.
- New prominent second step: check the separate NSW Fair Trading Name and Shame Register using the selected licence number.
- Single-click copy-and-open attempt. Clipboard is attempted *before* opening the register. If copying is blocked by the browser, a clear manual-copy fallback appears and no misleading success claim is made.
- Visitor can report finding a matching notice, seeing no match, or being unsure. A strongly worded red flag appears **only when they report a match** and says the result has not been independently verified by AgentCheck.
- Public-facing source label says "NSW Government", not "API".

## Deployment (no changes to Valdero)

1. Extract `AgentCheck-V3-Update.zip`.
2. Open the existing private GitHub repository `agentcheck-au/agentcheck`.
3. Choose **Add file -> Upload files** and drag the **contents** of the extracted folder, not the enclosing folder. Replace files already present under `public`, `functions`, `lib` and `tests`.
4. Commit the changes to `main`.
5. Cloudflare Pages should deploy the new commit automatically to the existing AgentCheck Pages project.
6. Test the site at `https://agentcheck-3o4.pages.dev` with a real search and with the clipboard flow on desktop and mobile. **Do not connect or promote the GoDaddy domain until the live tests pass.**

The existing Cloudflare production secrets `NSW_API_KEY` and `NSW_API_SECRET` are not included or changed. The NSW API server code is carried forward unchanged from V2.

## Important limitation

The Property API does not provide a verified lookup of the separate NSW Fair Trading Name and Shame Register. This release therefore does **not** automatically determine whether someone is listed there. Any red warning is clearly labelled as visitor-reported and must not be represented as a verified NSW Government result. A current licence means licence status only, not a clear regulatory history.

## Test scope

Unit tests cover public data selection, input validation, relevant copy and regulatory-state invariants. Local browser tests used simulated NSW API responses and simulated clipboard success/failure, not live NSW credentials. Cloudflare staging / production and real user clipboard handling require a final browser check.
