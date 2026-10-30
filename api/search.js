'use strict';
const { requestNsw, normalizeBrowseRecord, allowRequest, clientKey, headers } = require('../lib/nsw');

module.exports = async function handler(req, res) {
  headers(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (!allowRequest(`search:${clientKey(req)}`, 8)) return res.status(429).json({ error: 'Too many searches. Please try again shortly.' });
  const raw = req.query?.q;
  const q = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (q.length < 2 || q.length > 80 || /[\u0000-\u001f]/.test(q)) return res.status(400).json({ error: 'Enter a name or licence number (2–80 characters).' });
  try {
    const data = await requestNsw('/propertyregister/v1/browse', { searchText: q });
    if (!Array.isArray(data)) return res.status(502).json({ error: 'Unexpected response from the NSW service.' });
    const results = data.slice(0, 20).map(normalizeBrowseRecord).filter(r => r.licenceID);
    return res.status(200).json({ results, truncated: data.length > 20, checkedAt: new Date().toISOString() });
  } catch (e) { return res.status(e.status || 502).json({ error: e.message || 'Search temporarily unavailable.' }); }
};
