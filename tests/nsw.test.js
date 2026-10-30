'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeBrowseRecord, normalizeDetails, allowRequest } = require('../lib/nsw');

test('browse returns only needed public fields', () => {
  const r = normalizeBrowseRecord({ licenceID: '9099589', licenceName: 'Test Agent', licenceNumber: '12345', status: 'Current', licenseeBirthDate: 'secret' });
  assert.equal(r.licenceID, '9099589');
  assert.equal(r.licenceName, 'Test Agent');
  assert.equal('licenseeBirthDate' in r, false);
});
test('details does not imply clean history for empty arrays', () => {
  const r = normalizeDetails({ licenceDetail: { status: 'Current' }, complianceActions: { infringementNotices: [], publicWarningsCount: 0 } });
  assert.equal(r.compliance.actions.find(a => a.label === 'Infringement notices').count, 0);
  assert.equal(r.compliance.publicWarningsCount, 0);
});
test('limiter blocks rapid searches in one process', () => {
  const key = `test-${Date.now()}`;
  assert.equal(allowRequest(key,1), true);
  assert.equal(allowRequest(key,1), false);
});
