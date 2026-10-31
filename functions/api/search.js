import {
  requestNsw,
  normalizeBrowseRecord,
  allowRequest,
  clientKey,
  responseJson,
  publicError,
  logNswFailure,
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
  const modeValues = params.getAll("mode");
  const mode = modeValues[0] || "name";
  if (modeValues.length > 1 || !["name", "location"].includes(mode)) {
    return responseJson({ error: "Invalid search mode." }, 400);
  }
  const q = typeof raw === "string" ? raw.trim().replace(/ +/g, " ") : "";
  if (mode === "location" && !/^[\p{L}\p{M}\p{N} .'-]{2,60}$/u.test(q)) {
    return responseJson({ error: "Enter a suburb or postcode (2–60 characters)." }, 400);
  }
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
    if (!Array.isArray(data)) {
      logNswFailure("browse_shape_invalid");
      return responseJson(
        { error: "Unexpected response from the NSW service." },
        502,
      );
    }
    // A locality term is sent through the existing OneGov general browse
    // search, not a claimed suburb-filter endpoint. Its coverage is unverified.
    // Display only matching registered-address fields, never imply an exhaustive
    // directory of agents working in that suburb.
    const records = data
      .map(normalizeBrowseRecord)
      .filter((r) => /^[\w-]{1,50}$/.test(r.licenceID));
    const locality = q.toLocaleLowerCase("en-AU");
    const matches = mode === "location"
      ? records.filter((r) =>
          r.suburb.toLocaleLowerCase("en-AU") === locality ||
          r.postcode === q)
      : records;
    return responseJson({
      results: matches.slice(0, 20),
      truncated: matches.length > 20 || (mode === "location" && data.length > 20),
      limitedLocationSearch: mode === "location",
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    return publicError(e);
  }
}
