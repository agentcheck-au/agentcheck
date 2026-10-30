# AgentCheck security review

Scope: `agentcheck-au/agentcheck`, baseline `00ebae5` and the `studio-redesign` release changes. Recorded 30 October 2026 (Australia/Sydney).

## Findings and mitigations

| Area | Evidence / action | Remaining limit |
| --- | --- | --- |
| Source credentials | Five baseline commits and 27 unique blobs scanned for private keys, provider tokens and literal credential assignments; manual source review found runtime secret references only. | A pattern scan cannot prove the absence of every secret or assess historical screenshots/accounts. |
| API credentials | Existing runtime `NSW_API_KEY` / `NSW_API_SECRET`, fixed OneGov host, OAuth token reuse, shared pending token, one 401 retry retained. Redirects now fail closed. | Production secret values and rotation history were deliberately not inspected. |
| Error disclosure | Arbitrary exceptions become a fixed public message. Only application-defined errors are returned verbatim. | Host/service operational error logging requires separate authorised review. |
| Validation | Duplicate/oversized query parameters, control characters, malformed identifiers, unexpected detail shapes rejected. Only fixed upstream paths permitted. | Name searches intentionally accept international names and punctuation. These are encoded, not interpolated into HTML. |
| Rendering / data | Government text is rendered with `textContent`; SVG HTML consists only of fixed developer-owned paths. Public-field allowlists exclude private data. Inactive/null conditions and invalid counters are handled safely. | Data accuracy and identity still depend on the official record and visitor selection. |
| Abuse / quota | Bounded per-IP/per-route isolate-local limits, rejection on limiter capacity exhaustion, an isolate-wide request burst limit and identical in-flight request deduplication. | **No distributed limit or global monthly quota budget.** Attackers can use multiple IPs/isolates and non-browser clients. Origin/Fetch Metadata checks are only an additional browser-abuse barrier. |
| Security headers | CSP, framing restriction, no-referrer, content-type protection and Permissions Policy on static output and API responses. API responses are no-store; 429 has Retry-After. API routing restricted to `/api/*`. | Static CSP retains `style-src 'unsafe-inline'` for pointer/progress styles. No inline/eval script or third-party script is allowed. |
| Client resilience | Cancellation, bounded timeouts, stale-response suppression, explicit selection, missing status/identity handling, record-number match check, validated/expiring saved state, copy fallback and blocked-storage fallback. | Tab storage is not tamper-proof evidence and is never presented as independent register verification. |
| Dependencies | No production package dependencies. Locked development-only DOM test dependency. `npm audit` reports no known vulnerabilities at review time. | Audit results are time-specific. |

## Approval / release gates

1. **Distributed abuse and quota protection:** approve an AgentCheck-project-scoped design before advertising or unrestricted release. This may require a dedicated protection rule/binding or service budget. No WAF, zone rule, binding, database or paid resource was created or modified during this task.
2. **Credential exposure history:** old setup notes mention an earlier screenshot exposure. The current repository scan did not find the credentials, and rotation history was not verified. Owner should confirm whether rotation already occurred. If it has not, approve and carry out an AgentCheck-only rotation separately. No rotation was performed here.
3. **Data-use terms:** confirm the owner's current NSW subscription capacity and republication terms. The old notes mention 2,500 calls/month; this was not independently verified as the current entitlement.
4. **Live acceptance:** preview secret availability, one controlled live licence lookup, real iPhone Safari clipboard/Back handling and broader browser acceptance remain distinct from simulated tests. Do not equate these with mocked test success.
5. Production merge/deployment requires explicit owner approval.

No Supabase, Vercel project, DNS or shared account operations form part of this implementation.
