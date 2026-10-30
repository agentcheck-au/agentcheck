// Preview-only public connectivity check. No secrets or user-supplied URLs.
export async function onRequestGet() {
  const target = "https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials";
  const tests = [];
  for (const redirect of ["error", "manual"]) {
    try {
      const response = await fetch(target, {
        method: "GET",
        redirect,
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      tests.push({ redirect, status: response.status });
    } catch (e) {
      tests.push({
        redirect,
        failed: true,
        errorName: ["TypeError", "AbortError", "TimeoutError"].includes(e?.name) ? e.name : "OtherError",
        causeCode: typeof e?.cause?.code === "string" && /^[A-Z_]{2,50}$/.test(e.cause.code) ? e.cause.code : null,
      });
    }
  }
  return new Response(JSON.stringify({ tests }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
