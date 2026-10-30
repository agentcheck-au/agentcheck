# AgentCheck search visibility and corporation licence checks

## Scope and positioning

AgentCheck is one guided starting point for NSW real estate agent and agency
checks. Licence records are retrieved through the existing server-side Property
API connection. The Name and Shame Register remains a separate, visitor-operated
search. Do not claim automatic regulatory clearance, complete national coverage,
endorsement, or an unsubstantiated number-one position.

The homepage now identifies the service in its main heading, title, descriptions
and structured data. Three static guides answer distinct questions and are linked
from the homepage, About page, each other and the sitemap. They work without
JavaScript; the interactive licence search still needs JavaScript.

## Corporation support verified 31 October 2026

Production search by corporation licence number 10106755 returned Property
Solutions 101 Pty Limited, Adamstown, Property - Corporation. Opening the record
displayed licence status, dates, business premises and a conditions disclosure.
Searching Property Solutions 101 also returned the same corporation among other
matches, including historical licences. The existing search and details endpoints
already support these records; no new API, credentials or subscription changes
were needed for the checks.

The UI now explicitly accepts agent or agency names/licence numbers and explains
that a corporation is a separate licence holder. Company records remind visitors
to check the person separately and confirm the relationship to any trading name.
Do not infer an agency-to-person relationship from a similar name. ABN/ACN search
and automatic director/employee linking are not offered by AgentCheck.

Official guidance:

- https://www.service.nsw.gov.au/transaction/check-a-property-agent-licence-or-certificate
- https://api.nsw.gov.au/Product/Index/20
- https://www.nsw.gov.au/departments-and-agencies/fair-trading/how-we-regulate/name-and-shame-register

## Google account steps still required

Search results alone did not establish whether Google has indexed the site.
Search Console is not connected to this workspace. Website changes do not submit
an indexing request or verify a Google property.

1. Sign in to https://search.google.com/search-console and select an existing
   AgentCheck property if present. Otherwise add the Domain property agentcheck.au.
2. For an unverified Domain property, use Google's issued DNS TXT verification
   value in the AgentCheck DNS zone only. Never invent a value or replace existing
   DNS records. No DNS or Cloudflare settings were changed for this release.
3. Submit https://agentcheck.au/sitemap.xml in Sitemaps.
4. Inspect https://agentcheck.au/ and the three new guide URLs. Check indexed
   status and Google's selected canonical. Run Test live URL and inspect the
   rendered content/crawl result. Investigate any reported hosting challenge or
   noindex; do not infer a bot block from a third-party fetch failure.
5. Request indexing for the homepage and new guides where eligible. Check Pages,
   Manual actions and Security issues for concrete problems.
6. Establish a baseline of impressions, clicks, CTR and position by query and page.
   Review after several weeks; discovery and ranking are not guaranteed.

Documentation:

- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://support.google.com/webmasters/answer/9008080
- https://developers.google.com/search/docs/appearance/ai-features

## Remaining owner information and growth work

Confirm the public operator name, a working AgentCheck contact channel and any
relevant industry affiliation/funding disclosure before adding them to About or
Organization markup. Do not publish a guessed contact address or invented
credentials. No personal identity was added during this release.

Seek genuine relevant editorial mentions and links. Do not buy ranking links,
invent reviews or create repeated location doorway pages. Google AI features use
the same core search requirements; no special AI files or unsupported schema were
added.

Search Console supplies the search performance baseline. No analytics account,
tracking script, cookie or search-term logging was added. If later adding journey
measurement, count completed stages without sending names, licence numbers or
search terms to an analytics provider, and update the privacy notice as needed.
