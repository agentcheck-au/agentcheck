import { requestNsw, normalizeDetails, allowRequest, clientKey, responseJson } from '../../lib/nsw-worker.js';

export async function onRequestGet({ request, env }) {
  if (!allowRequest(`detail:${clientKey(request)}`, 12)) {
    return responseJson({ error: 'Too many lookups. Please try again shortly.' }, 429);
  }
  const id = new URL(request.url).searchParams.get('id');
  if (typeof id !== 'string' || !/^[\w-]{1,50}$/.test(id)) {
    return responseJson({ error: 'Invalid licence identifier.' }, 400);
  }
  try {
    const data = await requestNsw(env, '/propertyregister/v1/details', { licenceid: id });
    if (!data || typeof data !== 'object' || !data.licenceDetail) {
      return responseJson({ error: 'Unexpected licence details response.' }, 502);
    }
    return responseJson({ detail: normalizeDetails(data), checkedAt: new Date().toISOString() });
  } catch (e) {
    return responseJson({ error: e.message || 'Licence details temporarily unavailable.' }, e.status || 502);
  }
}
