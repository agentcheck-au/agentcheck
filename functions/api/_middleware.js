import { responseJson, SECURITY_HEADERS } from "../../lib/nsw-worker.js";

export async function onRequest({ request, next }) {
  if (request.method !== "GET") {
    const response = responseJson({ error: "Method not allowed." }, 405);
    response.headers.set("Allow", "GET");
    return response;
  }
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (
    request.headers.get("Sec-Fetch-Site") === "cross-site" ||
    (origin && origin !== url.origin)
  ) {
    return responseJson(
      { error: "Please start your licence check on AgentCheck." },
      403,
    );
  }
  if (url.search.length > 512)
    return responseJson({ error: "Search request is too long." }, 400);
  const upstream = await next();
  const response = new Response(upstream.body, upstream);
  for (const [key, value] of Object.entries(SECURITY_HEADERS))
    response.headers.set(key, value);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
