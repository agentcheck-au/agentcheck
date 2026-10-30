import {
  requestNsw,
  normalizeBrowseRecord,
  allowRequest,
  clientKey,
  responseJson,
  publicError,
} from "../../lib/nsw-worker.js";

export async function onRequestGet({ request, env }) {
  if (!allowRequest(`search:${clientKey(request)}`, 8)) {
    return responseJson(
      { error: "Too many searches. Please try again shortly." },
      429,
    );
  }
  const params = new URL(request.url).searchParams;
  const raw = params.getAll("q").length === 1 ? params.get("q") : null;
  const q = typeof raw === "string" ? raw.trim().replace(/ +/g, " ") : "";
  if (q.length < 2 || q.length > 80 || /[\u0000-\u001f\u007f]/.test(raw)) {
    return responseJson(
      { error: "Enter a name or licence number (2–80 characters)." },
      400,
    );
  }
  try {
    const data = await requestNsw(env, "/propertyregister/v1/browse", {
      searchText: q,
    });
    if (!Array.isArray(data))
      return responseJson(
        { error: "Unexpected response from the NSW service." },
        502,
      );
    return responseJson({
      results: data
        .slice(0, 20)
        .map(normalizeBrowseRecord)
        .filter((r) => /^[\w-]{1,50}$/.test(r.licenceID)),
      truncated: data.length > 20,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    return publicError(e);
  }
}
