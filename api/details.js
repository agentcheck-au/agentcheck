'use strict';
const { requestNsw, normalizeDetails, allowRequest, clientKey, headers } = require('../lib/nsw');

module.exports = async function handler(req, res) {
  headers(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (!allowRequest(`detail:${clientKey(req)}`, 12)) return res.status(429).json({ error: 'Too many lookups. Please try again shortly.' });
  const id = req.query?.id;
  if (typeof id !== 'string' || !/^[\w-]{1,50}$/.test(id)) return res.status(400).json({ error: 'Invalid licence identifier.' });
  try {
    const data = await requestNsw('/propertyregister/v1/details', { licenceid: id });
    if (!data || typeof data !== 'object' || !data.licenceDetail) return res.status(502).json({ error: 'Unexpected licence details response.' });
    return res.status(200).json({ detail: normalizeDetails(data), checkedAt: new Date().toISOString() });
  } catch (e) { return res.status(e.status || 502).json({ error: e.message || 'Licence details temporarily unavailable.' }); }
};
