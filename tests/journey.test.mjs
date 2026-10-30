// DOM integration tests. Government requests, clipboard, storage and motion are simulated.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parseHTML } from "linkedom";
const html = readFileSync(
  new URL("../public/index.html", import.meta.url),
  "utf8",
);
const client = readFileSync(
  new URL("../public/app.js", import.meta.url),
  "utf8",
);
const record = {
  licenceID: "test-1",
  licenceName: "Alex Example",
  licenceNumber: "TEST123",
  status: "Current",
  suburb: "Riverstone",
  postcode: "2765",
};
const info = {
  licenceName: "Alex Example",
  licenceNumber: "TEST123",
  status: "Current",
  classes: [],
  conditions: [],
  premises: [],
  compliance: { actions: [] },
};
const flush = async () => {
  for (let i = 0; i < 10; i++)
    await new Promise((resolve) => setImmediate(resolve));
};
function boot({
  fetcher,
  clipboard = "success",
  storage = new Map(),
  denyStorage = false,
  reducedMotion = false,
  holdLoading = false,
} = {}) {
  const { document, window: dom } = parseHTML(html);
  const scrolls = [],
    requests = [],
    navigations = [],
    events = new Map();
  let copied = "",
    focused;
  const loadingTimers = [];
  dom.HTMLElement.prototype.scrollIntoView = function (options) {
    scrolls.push(options);
  };
  dom.HTMLElement.prototype.focus = function () {
    focused = this;
  };
  dom.HTMLElement.prototype.select = function () {};
  dom.HTMLElement.prototype.setSelectionRange = function () {};
  dom.HTMLElement.prototype.setCustomValidity = function (text) {
    this.validationMessage = text;
  };
  dom.HTMLElement.prototype.reportValidity = function () {
    return !this.validationMessage;
  };
  document.execCommand = () => false;
  const window = {
    matchMedia: (query) => ({
      matches: query.includes("reduced-motion") ? reducedMotion : false,
      addEventListener() {},
    }),
    addEventListener: (name, fn) => events.set(name, fn),
    location: { assign: (url) => navigations.push(url) },
    scrollY: 0,
  };
  const sessionStorage = {
    getItem: (key) => {
      if (denyStorage) throw new Error("Denied");
      return storage.get(key) ?? null;
    },
    setItem: (key, data) => {
      if (denyStorage) throw new Error("Denied");
      storage.set(key, data);
    },
    removeItem: (key) => storage.delete(key),
  };
  const navigator = {
    clipboard: {
      writeText: async (text) => {
        if (clipboard === "fail") throw new Error("Denied");
        copied = text;
      },
    },
  };
  runInNewContext(client, {
    document,
    window,
    navigator,
    sessionStorage,
    AbortController,
    URL,
    console,
    innerHeight: 900,
    requestAnimationFrame: (fn) => {
      fn();
      return 1;
    },
    setTimeout: (fn, ms) => {
      if (ms >= 900 && ms <= 2200) {
        if (holdLoading) loadingTimers.push(fn);
        else Promise.resolve().then(fn);
      }
      return 1;
    },
    clearTimeout() {},
    fetch: async (url, options) => {
      requests.push({ url, signal: options.signal });
      if (fetcher) return fetcher(url, options);
      return Response.json(
        url.startsWith("/api/search")
          ? { results: [record], checkedAt: new Date().toISOString() }
          : { detail: info, checkedAt: new Date().toISOString() },
      );
    },
  });
  const $ = (id) => document.getElementById(id);
  const click = (node) =>
    node.dispatchEvent(new dom.Event("click", { bubbles: true }));
  const submit = async (q = "Example") => {
    $("search-input").value = q;
    $("search-form").dispatchEvent(
      new dom.Event("submit", { cancelable: true }),
    );
    await flush();
  };
  const select = async () => {
    click(document.querySelector(".row-button"));
    await flush();
  };
  return {
    document,
    $,
    click,
    submit,
    select,
    requests,
    navigations,
    storage,
    scrolls,
    events,
    releaseLoading: () => {
      for (const done of loadingTimers.splice(0)) done();
    },
    get copied() {
      return copied;
    },
    get focused() {
      return focused;
    },
  };
}

test("one result still requires explicit identity selection, then verifies a separate licence record", async () => {
  const ui = boot();
  await ui.submit();
  assert.match(ui.$("results-title").textContent, /Confirm/);
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.$("detail-panel").hidden, true);
  await ui.select();
  assert.equal(ui.requests.length, 2);
  assert.match(ui.$("detail-panel").textContent, /Current licence confirmed/);
  assert.equal(ui.document.querySelector(".register-conclusion").hidden, true);
  assert.match(
    ui.document.querySelector(".regulatory-card").textContent,
    /does not search this register/,
  );
  assert.equal(ui.focused.id, "results-title");
});
test("ambiguous records filter by returned suburb and preserve list on Back", async () => {
  const ui = boot({
    fetcher: async (url) =>
      Response.json(
        url.includes("/search")
          ? {
              results: [
                record,
                { ...record, licenceID: "test-2", suburb: "Richmond" },
              ],
              truncated: true,
            }
          : { detail: info, checkedAt: new Date().toISOString() },
      ),
  });
  await ui.submit();
  ui.$("suburb-filter").value = "Richmond";
  ui.$("suburb-filter").dispatchEvent(
    new ui.document.defaultView.Event("input"),
  );
  assert.equal(ui.document.querySelectorAll(".result-row").length, 1);
  assert.match(ui.$("results-list").textContent, /RICHMOND/);
  await ui.select();
  ui.click(ui.$("back-button"));
  assert.equal(ui.document.querySelectorAll(".result-row").length, 1);
  assert.equal(ui.requests.length, 2);
  assert.match(ui.$("status-message").textContent, /first 20/);
});
test("malicious names render as text and missing detailed status never inherits Current", async () => {
  const ui = boot({
    fetcher: async (url) =>
      Response.json(
        url.includes("/search")
          ? {
              results: [
                { ...record, licenceName: "<img src=x onerror=alert(1)>" },
              ],
            }
          : {
              detail: { ...info, status: "" },
              checkedAt: new Date().toISOString(),
            },
      ),
  });
  await ui.submit();
  assert.match(ui.$("results-list").textContent, /<img/);
  assert.equal(ui.$("results-list").querySelectorAll("img").length, 0);
  await ui.select();
  assert.doesNotMatch(
    ui.$("detail-panel").textContent,
    /Current licence confirmed/,
  );
  assert.match(ui.$("detail-panel").textContent, /not been confirmed/);
});
test("visitor-reported outcomes cannot become a government all-clear", async () => {
  const ui = boot();
  await ui.submit();
  await ui.select();
  const buttons = ui.document.querySelectorAll(".answer-button");
  ui.click(buttons[0]);
  let conclusion = ui.document.querySelector(".register-conclusion");
  assert.match(conclusion.textContent, /RED FLAG · Matching action selected/);
  assert.match(conclusion.textContent, /not a finding independently verified/);
  ui.click(buttons[1]);
  assert.doesNotMatch(conclusion.textContent, /RED FLAG/);
  assert.match(conclusion.textContent, /not an official all-clear/);
  ui.click(buttons[2]);
  assert.match(conclusion.textContent, /still uncertain/);
});
test("simulated clipboard success saves journey then navigates to fixed official URL", async () => {
  const ui = boot();
  await ui.submit();
  await ui.select();
  const readyNumber = ui.document.querySelector(".register-licence-number");
  assert.equal(readyNumber.value, "TEST123");
  assert.equal(readyNumber.readOnly, true);
  assert.equal(ui.document.querySelectorAll(".register-directions li").length, 2);
  assert.equal(ui.document.querySelector(".next-regulatory-step"), null);
  assert.match(ui.document.querySelector(".regulatory-cta").textContent, /^Open Name and Shame Register/);
  ui.click(ui.document.querySelector(".regulatory-cta"));
  await flush();
  assert.equal(ui.copied, "TEST123");
  assert.equal(ui.navigations.length, 1);
  assert.match(ui.navigations[0], /^https:\/\/www.nsw.gov.au\//);
  const saved = JSON.parse(ui.storage.get("agentcheck:resume"));
  assert.equal(saved.details.licenceNumber, "TEST123");
  const returned = boot({ storage: ui.storage });
  await flush();
  assert.equal(returned.requests.length, 0);
  assert.match(returned.$("results-title").textContent, /Welcome back/);
  assert.match(
    returned.$("status-message").textContent,
    /not a new government verification/,
  );
});
test("simulated clipboard failure exposes selectable fallback and still saves manual return", async () => {
  const ui = boot({ clipboard: "fail" });
  await ui.submit();
  await ui.select();
  ui.click(ui.document.querySelector(".regulatory-cta"));
  await flush();
  assert.equal(ui.navigations.length, 0);
  assert.equal(ui.document.querySelector(".fallback-number").value, "TEST123");
  assert.match(
    ui.document.querySelector(".handoff-fallback").textContent,
    /Automatic copying is unavailable/,
  );
  assert.doesNotMatch(ui.$("toast").textContent, /number copied/);
  assert.ok(ui.storage.has("agentcheck:resume"));
});
test("blocked storage preserves current page with a new-tab register option", async () => {
  const ui = boot({ denyStorage: true });
  await ui.submit();
  await ui.select();
  ui.click(ui.document.querySelector(".regulatory-cta"));
  await flush();
  assert.equal(ui.navigations.length, 0);
  assert.match(
    ui.document.querySelector(".regulatory-action").textContent,
    /blocked session storage/,
  );
  const link = [...ui.document.querySelectorAll(".regulatory-action a")].find(
    (a) => a.textContent.includes("new tab"),
  );
  assert.equal(link.target, "_blank");
});
test("expired, future, oversized and malformed resume states fail closed", () => {
  for (const text of [
    "{broken",
    "x".repeat(20001),
    JSON.stringify({
      version: 1,
      created: Date.now() - 1800001,
      record,
      details: info,
    }),
    JSON.stringify({
      version: 1,
      created: Date.now() + 60000,
      record,
      details: info,
    }),
    JSON.stringify({
      version: 1,
      created: Date.now(),
      record,
      details: { classes: {} },
    }),
  ]) {
    const ui = boot({ storage: new Map([["agentcheck:resume", text]]) });
    assert.equal(ui.$("results-section").hidden, true);
    assert.equal(ui.storage.size, 0);
  }
});
test("reset cancels outstanding request and a late response cannot repopulate results", async () => {
  let resolve;
  const ui = boot({ fetcher: () => new Promise((r) => (resolve = r)) });
  await ui.submit();
  ui.click(ui.$("clear-button"));
  assert.equal(ui.requests[0].signal.aborted, true);
  resolve(Response.json({ results: [record] }));
  await flush();
  assert.equal(ui.$("results-section").hidden, true);
  assert.equal(ui.$("results-list").children.length, 0);
});
test("search errors, empty results and unreadable details offer honest recoveries", async () => {
  for (const scenario of ["error", "empty", "bad-detail"]) {
    const ui = boot({
      fetcher: async (url) =>
        scenario === "error"
          ? Response.json({ error: "Simulated busy service" }, { status: 429 })
          : url.includes("/search")
            ? Response.json({ results: scenario === "empty" ? [] : [record] })
            : Response.json({ detail: null }),
    });
    await ui.submit();
    if (scenario === "error") {
      assert.match(ui.$("status-message").textContent, /busy service/);
      assert.ok(ui.$("results-list").querySelector("a"));
    } else if (scenario === "empty")
      assert.match(ui.$("status-message").textContent, /No licence records/);
    else {
      await ui.select();
      assert.match(
        ui.$("detail-panel").textContent,
        /No licence verification has been completed/,
      );
      assert.equal(ui.document.querySelector(".regulatory-cta"), null);
    }
  }
});
test("government compliance counts appear separately from visitor-reported findings", async () => {
  const ui = boot({
    fetcher: async (url) =>
      Response.json(
        url.includes("/search")
          ? { results: [record] }
          : {
              detail: {
                ...info,
                compliance: {
                  actions: [{ label: "Infringement notices", count: 2 }],
                },
              },
              checkedAt: new Date().toISOString(),
            },
      ),
  });
  await ui.submit();
  await ui.select();
  assert.match(
    ui.document.querySelector(".government-actions").textContent,
    /Infringement notices: 2/,
  );
  assert.match(
    ui.document.querySelector(".government-actions").textContent,
    /not a search of the separate/,
  );
  assert.equal(ui.document.querySelector(".register-conclusion").hidden, true);
});
test("reduced motion, pause control, mobile menu and education disclosures work without motion", async () => {
  const ui = boot({ reducedMotion: true });
  await ui.submit();
  assert.ok(ui.scrolls.length);
  assert.ok(ui.scrolls.every((s) => s.behavior === "auto"));
  assert.equal(ui.$("motion-toggle").getAttribute("aria-pressed"), "true");
  ui.click(ui.$("menu-toggle"));
  assert.equal(ui.$("mobile-nav").hidden, false);
  ui.click(ui.$("mobile-nav").querySelector("a"));
  assert.equal(ui.$("mobile-nav").hidden, true);
  assert.equal(ui.$("menu-toggle").getAttribute("aria-label"), "Open menu");
  const toggle = ui.document.querySelector(".question-toggle");
  ui.click(toggle);
  assert.equal(toggle.nextElementSibling.hidden, false);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
});

test("manual-copy option does not misreport a clipboard failure", async () => {
  const ui = boot();
  await ui.submit();
  await ui.select();
  ui.click(ui.document.querySelector(".manual-copy"));
  assert.match(
    ui.document.querySelector(".handoff-fallback").textContent,
    /Copy this licence number manually/,
  );
  assert.doesNotMatch(
    ui.document.querySelector(".handoff-fallback").textContent,
    /unavailable/,
  );
  assert.equal(ui.navigations.length, 0);
});

test("missing or mismatched detailed licence numbers cannot confirm the selected identity", async () => {
  for (const number of ["", "OTHER123"]) {
    const ui = boot({
      fetcher: async (url) =>
        Response.json(
          url.includes("/search")
            ? { results: [record] }
            : {
                detail: { ...info, licenceNumber: number },
                checkedAt: new Date().toISOString(),
              },
        ),
    });
    await ui.submit();
    await ui.select();
    assert.match(ui.$("detail-panel").textContent, /could not confirm/);
    assert.doesNotMatch(
      ui.$("detail-panel").textContent,
      /Current licence confirmed/,
    );
  }
});

test("fast search and detail responses keep their loading screens visible", async () => {
  const ui = boot({ holdLoading: true });
  await ui.submit();
  assert.match(ui.$("results-list").textContent, /Checking NSW licence records/);
  assert.match(ui.$("results-title").textContent, /Searching NSW records/);
  ui.releaseLoading();
  await flush();
  assert.match(ui.$("results-title").textContent, /Confirm/);

  await ui.select();
  assert.match(ui.$("detail-panel").textContent, /Checking official records/);
  ui.releaseLoading();
  await flush();
  assert.match(ui.$("detail-panel").textContent, /Current licence confirmed/);
});

test("starting another search cancels the previous loading hold", async () => {
  const ui = boot({ holdLoading: true });
  await ui.submit("First agent");
  assert.match(ui.$("results-list").textContent, /Checking NSW licence records/);
  await ui.submit("Second agent");
  ui.releaseLoading();
  await flush();
  assert.match(ui.$("results-title").textContent, /Confirm/);
  assert.equal(ui.requests.length, 2);
});
