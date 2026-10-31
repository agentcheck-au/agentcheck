import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as search } from "../functions/api/search.js";
import { readFileSync } from "node:fs";
const mockEnv = { NSW_API_KEY: "mock", NSW_API_SECRET: "secret" };
test("location mode returns only matching registered suburbs, without private data", async (t) => {
  const queries = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.includes("/oauth/"))
      return Response.json({ access_token:"token", expires_in:3600 });
    queries.push(parsed.searchParams.get("searchText"));
    return Response.json([
      { licenceID:"loc1", licenceName:"One", suburb:"Riverstone", postcode:"2765", licenseeBirthDate:"private" },
      { licenceID:"loc2", licenceName:"Two", suburb:"Schofields", postcode:"2762" },
      { licenceID:"loc3", licenceName:"Three", suburb:"RIVERSTONE", postcode:"2765" }
    ]);
  });
  const r = await search({request:new Request("https://agentcheck.au/api/search?q=Riverstone&mode=location"),env:mockEnv});
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.limitedLocationSearch,true);
  assert.deepEqual(data.results.map(x=>x.licenceID),["loc1","loc3"]);
  assert.deepEqual(queries,["Riverstone"]);
  assert.doesNotMatch(JSON.stringify(data),/private/);
});
test("mode rejects malformed or duplicated values before upstream lookup", async () => {
  for(const url of ["/api/search?q=Riverstone&mode=invalid","/api/search?q=Riverstone&mode=name&mode=location","/api/search?q=abc%3D%3D&mode=location"]){
    const r=await search({request:new Request("https://agentcheck.au"+url),env:{}});
    assert.equal(r.status,400);
  }
});
test("UI distinguishes provisional locality matches from registered identity checks",()=>{
 const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
 assert.match(html,/data-search-mode="location"/);
 assert.match(html,/not a list of every agent serving that area/);
 assert.match(js,/&mode=location/);
 assert.match(js,/Coverage may be incomplete/);
});
