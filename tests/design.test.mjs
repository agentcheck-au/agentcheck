import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeDetails} from '../lib/nsw-worker.js';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
test('premium AgentCheck interface keeps independent NSW attribution',()=>{
  assert.match(html,/Know your agent/);
  assert.match(html,/Check the facts/);
  assert.match(html,/Independent NSW agent verification/);
  assert.doesNotMatch(html,/NSW Property API/);
  assert.match(css,/prefers-reduced-motion/);
});
test('API lookup and secure two-step handoff remain available',()=>{
  assert.match(html,/id="search-form"/);
  assert.match(js,/\/api\/search\?q=/);
  assert.match(js,/\/api\/details\?id=/);
  assert.match(js,/syncCopy\(number\)/);
  assert.match(js,/window\.open\(REGISTRY_URL/);
  assert.match(js,/window\.location\.assign\(REGISTRY_URL\)/);
});
test('red flag is only displayed after a visitor reports a matching action',()=>{
  assert.match(js,/setOutcome\('found'\)/);
  assert.match(js,/not independently confirmed by AgentCheck/);
  assert.match(js,/This is not an official declaration of a clean disciplinary history/);
  assert.doesNotMatch(html+js,/Zero records here does NOT mean/);
});
test('details only use public premises and conditions',()=>{
  const data=normalizeDetails({licenceDetail:{licenceName:'Example'},premises:[{businessAddress:'Shop 1 Test Street',secret:'hidden'}],conditions:[{description:'CPD required',isActive:'True'}],licenseeBirthDate:'private'});
  assert.deepEqual(data.premises,['Shop 1 Test Street']);
  assert.deepEqual(data.conditions,['CPD required']);
  assert.equal(JSON.stringify(data).includes('private'),false);
});
