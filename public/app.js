"use strict";
(() => {
  const REGISTER =
    "https://www.nsw.gov.au/departments-and-agencies/fair-trading/how-we-regulate/name-and-shame-register#search-the-register";
  const LICENCES = "https://verify.licence.nsw.gov.au/home/Property";
  const RESUME = "agentcheck:resume";
  const MIN_SEARCH_DISPLAY_MS = 1150;
  const MIN_RECORD_DISPLAY_MS = 1900;
  const $ = (id) => document.getElementById(id);
  const el = (tag, css = "", text) => {
    const node = document.createElement(tag);
    if (css) node.className = css;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const add = (parent, tag, css = "", text) =>
    parent.appendChild(el(tag, css, text));
  const value = (text, fallback = "Not supplied") =>
    typeof text === "string" && text.trim() ? text.trim() : fallback;
  const form = $("search-form"),
    input = $("search-input"),
    section = $("results-section");
  const list = $("results-list"),
    detail = $("detail-panel"),
    status = $("status-message");
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let paused = false,
    revision = 0,
    controller,
    records = [],
    activeRecord,
    activeDetails,
    activeCheckedAt;
  let report = "",
    toastTimer,
    truncated = false;
  const reduced = () => paused || motionPreference.matches;
  // Scroll vertically only. iOS Safari can otherwise shift the page
  // sideways when a newly revealed result section is brought into view.
  const scrollTo = (node, block = "start") => {
    const rect = node.getBoundingClientRect();
    const offset = 80;
    let top = rect.top + window.scrollY - offset;
    if (block === "nearest") {
      if (rect.top >= offset && rect.bottom <= window.innerHeight) {
        if (typeof window.scrollTo === "function")
          window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
        return;
      }
      if (rect.top < offset) top = rect.top + window.scrollY - offset;
      else top = rect.bottom + window.scrollY - window.innerHeight + 12;
    }
    if (typeof window.scrollTo === "function") {
      window.scrollTo({
        top: Math.max(0, top),
        left: 0,
        behavior: reduced() ? "auto" : "smooth",
      });
    } else {
      // Test DOMs and older browsers without window.scrollTo support.
      node.scrollIntoView?.({ behavior: "auto", block, inline: "nearest" });
    }
  };
  const isMobileViewport = () => window.matchMedia("(max-width: 760px)").matches;
  const focus = (node) => {
    // iOS can retain the keyboard's magnified visual viewport when focus
    // moves during a programmatic scroll. Do not focus headings on mobile.
    if (isMobileViewport()) return;
    node.tabIndex = -1;
    node.focus({ preventScroll: true });
  };
  const revealResultsOnMobile = (id) => {
    if (id !== revision) return;
    // Defer until the keyboard has had time to close and the result DOM
    // has been laid out. No artificial zoom, viewport scaling or pan.
    const show = () => {
      if (id !== revision) return;
      requestAnimationFrame(() => scrollTo(section));
    };
    const viewport = window.visualViewport;
    if (!viewport) {
      window.setTimeout(show, 200);
      return;
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      viewport.removeEventListener("resize", check);
      show();
    };
    const check = () => {
      if (viewport.height >= window.innerHeight * 0.78) {
        window.setTimeout(finish, 100);
      }
    };
    viewport.addEventListener("resize", check);
    window.setTimeout(finish, 650);
    check();
  };
  const clearSaved = () => {
    try {
      sessionStorage.removeItem(RESUME);
    } catch {}
  };
  $("year").textContent = String(new Date().getFullYear());

  // Only static, developer-owned paths are used in the SVG markup below.
  const paths = {
    pin: '<path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/>',
    shield:
      '<path d="M12 2 21 6v6c0 6-4 9-9 11-5-2-9-5-9-11V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    flag: '<path d="M5 22V4m0 1q5-3 9 0t7 0v11q-4 3-7 0t-9 0"/>',
  };
  function icon(kind) {
    const host = el("span", "svg-icon");
    host.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [key, val] of Object.entries({
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }))
      svg.setAttribute(key, val);
    svg.innerHTML = paths[kind] || paths.shield;
    host.append(svg);
    return host;
  }
  function time(iso) {
    const date = new Date(iso);
    return typeof iso !== "string" || !Number.isFinite(date.valueOf())
      ? ""
      : date.toLocaleString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
  }
  function toast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("toast").hidden = true), 5000);
  }
  function notify(message = "", error = false) {
    status.hidden = !message;
    status.textContent = message;
    status.className = "notice" + (error ? " error" : "");
  }
  function busy(flag) {
    section.setAttribute("aria-busy", String(flag));
    $("search-button").disabled = flag;
    $("search-button").firstChild.textContent = flag
      ? "Searching… "
      : "Check licence ";
  }
  function chip(text) {
    const label = value(text, "Status not supplied");
    const css =
      label.toLowerCase() === "current"
        ? "status-current"
        : /expired|suspended|cancelled|disqualified/i.test(label)
          ? "status-expired"
          : "status-other";
    return el("span", "status-chip " + css, label);
  }
  async function api(path, signal) {
    let response;
    const timeout = new AbortController();
    const stop = () => timeout.abort();
    signal.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(stop, 32000);
    try {
      response = await fetch(path, {
        cache: "no-store",
        credentials: "same-origin",
        signal: timeout.signal,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        // A non-JSON response is a hosting/function problem, not evidence
        // that an agent's licence is invalid. Do not expose response bodies.
        const contentType = response.headers.get("content-type") || "";
        if (/text\/html/i.test(contentType)) {
          throw new Error(
            "The AgentCheck search server returned a webpage instead of licence data (HTTP " +
              response.status +
              "). The server needs attention; this is not a licence result.",
          );
        }
        throw new Error(
          "The AgentCheck search server returned invalid data (HTTP " +
            response.status +
            "). Please try again later.",
        );
      }
      if (!response.ok)
        throw new Error(
          value(
            data?.error,
            "Licence lookup is unavailable. Please try again.",
          ),
        );
      return data;
    } catch (error) {
      if (timeout.signal.aborted && !signal.aborted)
        throw new Error(
          "The lookup took too long. Please try again or use the official licence register.",
        );
      if (error instanceof TypeError)
        throw new Error(
          "We could not connect. Check your connection and try again.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", stop);
    }
  }
  // Keep the existing verification animation visible when government responses
  // are very fast. Slow responses add no extra delay; cancellation is immediate.
  // Respect reduced-motion preferences and the site's Pause motion control.
  function waitForMinimum(startedAt, minimumMs, signal) {
    if (reduced() || signal.aborted) return Promise.resolve();
    const remaining = Math.max(0, minimumMs - (Date.now() - startedAt));
    if (!remaining) return Promise.resolve();
    return new Promise((resolve) => {
      let timer;
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", finish);
        resolve();
      };
      signal.addEventListener("abort", finish, { once: true });
      timer = setTimeout(finish, remaining);
    });
  }
  function begin() {
    controller?.abort();
    controller = new AbortController();
    return { id: ++revision, signal: controller.signal };
  }
  function resultRow(record) {
    const row = el("article", "result-row");
    const suburb = add(row, "div", "result-suburb");
    suburb.append(icon("pin"));
    add(
      suburb,
      "span",
      "",
      value(record.suburb, "SUBURB NOT LISTED").toUpperCase(),
    );
    const identity = add(row, "div", "result-identity");
    add(
      identity,
      "h3",
      "result-name",
      value(record.licenceName, "Name not supplied"),
    );
    add(
      identity,
      "div",
      "result-meta",
      `Licence ${value(record.licenceNumber, "—")} · ${value(record.licenceType, "NSW property licence")}`,
    );
    row.append(chip(record.status));
    const button = add(row, "button", "row-button", "View record ↗");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `View record for ${value(record.licenceName)} in ${value(record.suburb, "suburb not listed")}, licence ${value(record.licenceNumber)}`,
    );
    button.addEventListener("click", () => selectRecord(record));
    return row;
  }
  function drawRows() {
    const term = $("suburb-filter").value.trim().toLocaleLowerCase("en-AU");
    const filtered = records.filter(
      (r) =>
        !term ||
        `${r.suburb} ${r.postcode}`.toLocaleLowerCase("en-AU").includes(term),
    );
    list.replaceChildren(...filtered.map(resultRow));
    $("match-count").textContent =
      `${filtered.length} of ${records.length} returned records`;
    if (!filtered.length && records.length)
      add(
        list,
        "p",
        "notice",
        "No returned records match this suburb. Clear the filter or search again with more of the person’s or company’s name.",
      );
  }
  function showRows(moveFocus = true) {
    busy(false);
    detail.hidden = true;
    list.hidden = false;
    $("results-tools").hidden = records.length === 0;
    $("back-button").hidden = true;
    $("results-kicker").textContent = "NSW GOVERNMENT LICENCE SEARCH";
    $("results-title").textContent =
      records.length === 1
        ? "One record. Confirm the person or company."
        : `${records.length} matching licence records`;
    $("results-subtitle").textContent =
      "Start with the suburb. Match the name and licence number before selecting a record.";
    notify(
      truncated
        ? "Showing the first 20 matches. A suburb filter only filters these returned records; search with a full name for more precise results."
        : records.length
          ? ""
          : "No licence records matched. Try a full name or a licence number.",
    );
    drawRows();
    if (moveFocus) {
      scrollTo(section);
      focus($("results-title"));
    }
  }
  function searchLoading() {
    const wrap = el("div", "loading-stage");
    add(wrap, "div", "loading-crest").append(icon("shield"));
    add(wrap, "h3", "", "Checking NSW licence records");
    add(wrap, "p", "", "Looking for matching records in the official NSW licence register…");
    return wrap;
  }
  function loading(record) {
    const wrap = el("div", "loading-stage");
    add(wrap, "div", "loading-crest").append(icon("shield"));
    add(wrap, "h3", "", "Checking official records");
    add(
      wrap,
      "p",
      "",
      `Retrieving the government licence record for ${value(record.licenceName)}…`,
    );
    return wrap;
  }
  function field(grid, label, content, highlight = false) {
    const item = add(grid, "div", "profile-field");
    add(item, "dt", "field-label", label);
    add(
      item,
      "dd",
      "field-value" + (highlight ? " highlight" : ""),
      value(content),
    );
  }
  function progress(statusText) {
    const current = statusText?.toLowerCase() === "current";
    const part = el("div", "journey-progress");
    add(
      part,
      "span",
      "progress-medallion" + (current ? "" : " warning"),
    ).append(icon("shield"));
    const content = add(part, "div", "progress-content");
    add(
      content,
      "div",
      "progress-label",
      "CHECK 01 · NSW GOVERNMENT LICENCE RECORD",
    );
    add(
      content,
      "strong",
      "",
      current
        ? "Current licence confirmed"
        : `Licence status: ${value(statusText, "not supplied")}`,
    );
    add(
      content,
      "p",
      "",
      current
        ? "Licence status only. The Name and Shame Register is a separate check."
        : "A current licence has not been confirmed. Review the official record before proceeding.",
    );
    const steps = add(part, "div", "progress-steps");
    for (const [name, pending] of [
      ["01 · LICENCE RECORD", false],
      ["02 · NAME AND SHAME REGISTER", true],
    ]) {
      const step = add(
        steps,
        "div",
        "progress-part" + (pending ? " pending" : ""),
      );
      add(step, "span", "", name);
      add(step, "div", "progress-bar").append(el("i"));
    }
    return part;
  }
  function saveJourney() {
    if (!activeRecord || !activeDetails) return false;
    try {
      sessionStorage.setItem(
        RESUME,
        JSON.stringify({
          version: 1,
          record: activeRecord,
          details: activeDetails,
          checkedAt: activeCheckedAt,
          report,
          created: new Date(activeCheckedAt).valueOf(),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
  function officialLink(parent, text, href = REGISTER, sameTab = false) {
    const link = add(parent, "a", "outcome-link", text);
    link.href = href;
    link.rel = "noopener noreferrer";
    if (!sameTab) link.target = "_blank";
    else link.addEventListener("click", saveJourney);
    return link;
  }
  function copyLegacy(number) {
    const focused = document.activeElement,
      area = el("textarea", "clipboard-helper");
    area.value = number;
    area.readOnly = true;
    area.setAttribute("aria-label", "Copy licence number");
    document.body.append(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, number.length);
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {}
    area.remove();
    focused?.focus?.({ preventScroll: true });
    return copied;
  }
  async function copyLicence(number) {
    // The synchronous fallback preserves user activation on older iOS browsers.
    if (copyLegacy(number)) return true;
    try {
      if (navigator.clipboard?.writeText) {
        const copied = navigator.clipboard.writeText(number).then(
          () => true,
          () => false,
        );
        let timer;
        const timeout = new Promise(
          (resolve) => (timer = setTimeout(() => resolve(false), 3000)),
        );
        try {
          return await Promise.race([copied, timeout]);
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {}
    return false;
  }
  function fallbackCopy(host, number, blocked = true) {
    host.hidden = false;
    host.replaceChildren();
    const box = add(host, "div", "handoff-fallback");
    add(
      box,
      "strong",
      "",
      blocked
        ? "Automatic copying is unavailable."
        : "Copy this licence number manually.",
    );
    add(
      box,
      "p",
      "",
      "Select and copy this licence number, then continue to the NSW register. Use your browser’s Back button to return here.",
    );
    const row = add(box, "div", "fallback-row");
    const numberInput = add(row, "input", "fallback-number");
    numberInput.readOnly = true;
    numberInput.value = number;
    numberInput.setAttribute("aria-label", "Licence number to copy manually");
    numberInput.addEventListener("focus", () => numberInput.select());
    numberInput.addEventListener("click", () => numberInput.select());
    const button = add(row, "button", "fallback-copy", "Try copying");
    button.type = "button";
    button.addEventListener("click", async () => {
      if (await copyLicence(number)) {
        button.textContent = "Copied ✓";
        toast("Licence number copied.");
      } else {
        numberInput.focus();
        numberInput.select();
        toast("Select the number and use your device’s Copy command.");
      }
    });
    officialLink(
      box,
      "Continue to the Name and Shame Register ↗",
      REGISTER,
      true,
    );
    host.scrollIntoView({ behavior: "auto", block: "center" });
    numberInput.focus();
    numberInput.select();
  }
  function regulatoryStep(parent, record, info) {
    // Never substitute an identity/status from another source for missing detailed data.
    const number = value(info.licenceNumber, "");
    const card = add(parent, "section", "regulatory-card");
    card.setAttribute("aria-label", "Check two: Name and Shame Register");
    card.id = "regulatory-check";
    const content = add(card, "div", "regulatory-content");
    add(content, "div", "regulatory-kicker", "NEXT · STEP 2 / 2 · NAME AND SHAME REGISTER");
    add(content, "h3", "", "Next: check the Name and Shame Register.");
    add(
      content,
      "p",
      "",
      "A current licence does not rule out regulatory action. Check this separate official register yourself.",
    );
    const directions = add(content, "ol", "register-directions");
    for (const [title, description] of [
      [
        "Open the register and paste",
        "The selected licence number is ready. Open the register, then paste the number into its search bar.",
      ],
      [
        "Return here for guidance",
        "Use your browser’s Back button after checking. Choose what you found below to see what it means.",
      ],
    ]) {
      const step = add(directions, "li");
      add(step, "strong", "", title);
      add(step, "p", "", description);
    }
    const action = add(card, "div", "regulatory-action");
    const licence = add(action, "div", "licence-to-copy");
    const numberLabel = add(licence, "label", "", "SELECTED LICENCE NUMBER");
    numberLabel.htmlFor = "regulatory-licence-number";
    const numberInput = add(licence, "input", "register-licence-number");
    numberInput.id = "regulatory-licence-number";
    numberInput.type = "text";
    numberInput.readOnly = true;
    numberInput.value = number || "Not supplied";
    numberInput.addEventListener("click", () => numberInput.select());
    const button = add(
      action,
      "button",
      "btn btn-primary regulatory-cta",
      "Open Name and Shame Register",
    );
    add(button, "span", "btn-arrow", "↗").setAttribute("aria-hidden", "true");
    button.type = "button";
    button.disabled = !number;
    button.setAttribute("aria-describedby", "regulatory-copy-hint");
    const copyHint = add(
      action,
      "p",
      "regulatory-hint",
      "We’ll copy the number when you open the register. AgentCheck does not search this register.",
    );
    copyHint.id = "regulatory-copy-hint";
    const savedNotice = add(action, "p", "regulatory-hint");
    savedNotice.hidden = true;
    const help = add(action, "details", "handoff-help");
    add(help, "summary", "", "Need help copying?");
    officialLink(
      help,
      "Open Name and Shame Register without copying ↗",
      REGISTER,
      true,
    );
    const fallback = add(parent, "div");
    fallback.hidden = true;
    const manual = add(
      help,
      "button",
      "text-button manual-copy",
      "Copy manually instead",
    );
    manual.type = "button";
    manual.addEventListener("click", () => {
      saveJourney();
      fallbackCopy(fallback, number, false);
    });
    manual.disabled = !number;
    button.addEventListener("click", async () => {
      if (!number) return;
      const expected = revision;
      button.disabled = true;
      const copied = await copyLicence(number);
      button.disabled = false;
      if (expected !== revision || activeRecord?.licenceID !== record.licenceID)
        return;
      if (!saveJourney()) {
        savedNotice.hidden = false;
        savedNotice.textContent =
          "Your browser blocked session storage. Keep this tab open and use the register link in a new tab.";
        const link = officialLink(action, "Open register in a new tab ↗");
        link.focus();
        return;
      }
      if (copied) {
        toast("Licence number copied. Use it to check the Name and Shame Register.");
        window.location.assign(REGISTER);
      } else {
        fallbackCopy(fallback, number);
        toast("Copy unavailable. Select the number to copy it manually.");
      }
    });
    const follow = add(parent, "section", "register-followup");
    add(
      follow,
      "div",
      "followup-overline",
      "YOUR CHECK · NOT INDEPENDENTLY VERIFIED BY AGENTCHECK",
    );
    const header = add(follow, "div", "followup-header"),
      words = add(header, "div");
    add(words, "h3", "", "Did you find this person or company on the Name and Shame Register?");
    add(
      words,
      "p",
      "",
      "After checking the official register, select what you found. Confirm the name, licence number and notice. AgentCheck cannot verify your answer.",
    );
    const buttons = add(follow, "div", "answer-buttons");
    const answer = add(follow, "div", "register-conclusion");
    answer.hidden = true;
    const options = [
      ["found", "Yes — I found a matching entry"],
      ["none", "No matching entry found"],
      ["unsure", "I am not sure"],
    ];
    const controls = options.map(([type, label]) => {
      const control = add(
        buttons,
        "button",
        "answer-button" + (type === "found" ? " answer-danger" : ""),
        label,
      );
      control.type = "button";
      control.setAttribute("aria-pressed", "false");
      control.addEventListener("click", () => setOutcome(type, true));
      return [control, type];
    });
    function setOutcome(type, moveFocus = false) {
      report = type;
      saveJourney();
      answer.hidden = false;
      answer.replaceChildren();
      for (const [control, name] of controls)
        control.setAttribute("aria-pressed", String(name === type));
      const danger = type === "found";
      answer.className =
        "register-conclusion " +
        (danger
          ? "outcome-danger"
          : type === "none"
            ? "outcome-neutral"
            : "outcome-amber");
      add(
        answer,
        "strong",
        "outcome-title",
        danger
          ? "RED FLAG · Matching action selected"
          : type === "none"
            ? "No matching entry · Selection recorded"
            : "Name and Shame check still uncertain",
      );
      add(
        answer,
        "p",
        "",
        danger
          ? "A matching published regulatory action was selected. Read the notice, date, licence number and outcome carefully. Consider the seriousness and seek clarification before appointing this agent or agency."
          : type === "none"
            ? "No matching entry was selected. This is not an official all-clear or a guarantee that there is no other relevant history."
            : "Check both the licence number and name. If the identity or notice is unclear, contact NSW Fair Trading for clarification.",
      );
      add(
        answer,
        "small",
        "",
        "This selection is not a finding independently verified by AgentCheck. A current licence does not establish a clean disciplinary history.",
      );
      if (danger)
        add(
          answer,
          "small",
          "",
          "A published infringement does not automatically mean a licence is suspended. Read the actual regulatory outcome.",
        );
      officialLink(answer, "Review the Name and Shame Register again ↗");
      if (moveFocus) {
        scrollTo(answer, "nearest");
        focus(answer);
      }
    }
    if (["found", "none", "unsure"].includes(report)) setOutcome(report);
  }
  function profile(record, info, checkedAt) {
    const wrapper = el("div", "profile-layout");
    wrapper.append(progress(info.status));
    // Complete check 01 before presenting the separate check 02.
    const card = add(wrapper, "article", "profile-card");
    const header = add(card, "div", "profile-head"),
      title = add(header, "div");
    add(title, "span", "eyebrow eyebrow-dark", "CHECK 01 · RECORD DETAILS");
    add(title, "h3", "", value(info.licenceName, "Name not supplied"));
    add(
      title,
      "p",
      "profile-subtitle",
      `${value(record.suburb, "Suburb not published")} · ${value(info.licenceType)}`,
    );
    if (/corporation/i.test(info.licenceType))
      add(card, "p", "notice corporation-note", "This is a company licence. Check the individual agent separately. If the agency uses a trading name, confirm it belongs to this legal company.");
    header.append(chip(info.status));
    const grid = add(card, "dl", "profile-grid");
    for (const [label, content] of [
      ["LICENCE NUMBER", info.licenceNumber],
      ["STATUS", info.status],
      ["SUBURB (SEARCH RECORD)", record.suburb],
      ["EXPIRY", info.expiryDate],
      ["LICENCE TYPE", info.licenceType],
      ["COMMENCED", info.startDate],
      ["AUTHORISED ACTIVITIES", info.classes?.join(" · ")],
      ["SOURCE", "NSW Government"],
    ])
      field(grid, label, content, label === "LICENCE NUMBER");
    if (info.premises?.length)
      add(
        card,
        "p",
        "profile-bottom",
        `Listed business premises: ${info.premises.join(" · ")}`,
      );
    if (info.conditions?.length) {
      const disclosure = add(card, "details", "conditions-disclosure");
      add(
        disclosure,
        "summary",
        "",
        `View licence conditions (${info.conditions.length})`,
      );
      const ul = add(disclosure, "ul");
      for (const condition of info.conditions) add(ul, "li", "", condition);
    }
    const actions =
      info.compliance?.actions?.filter(
        (action) => Number.isSafeInteger(action.count) && action.count > 0,
      ) || [];
    if (
      actions.length ||
      info.compliance?.cautionsCount > 0 ||
      info.compliance?.publicWarningsCount > 0
    ) {
      const notice = add(card, "div", "notice government-actions");
      add(
        notice,
        "strong",
        "",
        "The government licence response includes compliance information.",
      );
      add(
        notice,
        "p",
        "",
        [
          ...actions.map((a) => `${a.label}: ${a.count}`),
          ...(info.compliance.cautionsCount > 0
            ? [`Cautions/reprimands: ${info.compliance.cautionsCount}`]
            : []),
          ...(info.compliance.publicWarningsCount > 0
            ? [`Public warnings: ${info.compliance.publicWarningsCount}`]
            : []),
        ].join(" · "),
      );
      add(
        notice,
        "p",
        "",
        "These are licence-response counts, not a search of the separate Name and Shame Register. Review the official sources for details.",
      );
    }
    if (time(checkedAt))
      add(
        card,
        "p",
        "checked-at",
        `Licence record checked ${time(checkedAt)} · Source: NSW Government`,
      );
    officialLink(
      card,
      "View the official property licence register ↗",
      LICENCES,
    );
    const refresh = add(
      card,
      "button",
      "text-button refresh-record",
      "Refresh licence lookup",
    );
    refresh.type = "button";
    refresh.addEventListener("click", () => selectRecord(record, true));
    regulatoryStep(wrapper, record, info);
    return wrapper;
  }
  function detailsValid(info) {
    return (
      info &&
      typeof info === "object" &&
      !Array.isArray(info) &&
      [
        "licenceName",
        "licenceNumber",
        "status",
        "licenceType",
        "startDate",
        "expiryDate",
      ].every(
        (key) => info[key] === undefined || typeof info[key] === "string",
      ) &&
      ["classes", "premises", "conditions"].every(
        (key) =>
          info[key] === undefined ||
          (Array.isArray(info[key]) &&
            info[key].length <= 8 &&
            info[key].every(
              (item) => typeof item === "string" && item.length <= 500,
            )),
      ) &&
      (!info.compliance ||
        (typeof info.compliance === "object" &&
          (!info.compliance.actions ||
            (Array.isArray(info.compliance.actions) &&
              info.compliance.actions.length <= 8 &&
              info.compliance.actions.every(
                (a) =>
                  a &&
                  typeof a.label === "string" &&
                  (a.count === null || Number.isSafeInteger(a.count)),
              )))))
    );
  }
  async function selectRecord(record, preserveReport = false) {
    const { id, signal } = begin();
    const startedAt = Date.now();
    activeRecord = record;
    activeDetails = null;
    if (!preserveReport) report = "";
    clearSaved();
    list.hidden = true;
    $("results-tools").hidden = true;
    $("back-button").hidden = records.length === 0;
    detail.hidden = false;
    detail.replaceChildren(loading(record));
    $("results-kicker").textContent = "YOUR TWO SEPARATE CHECKS";
    $("results-title").textContent = "Behind the name. The facts.";
    $("results-subtitle").textContent =
      "Step 1: licence register. Step 2: separately search the NSW Fair Trading Name and Shame Register.";
    notify();
    busy(true);
    if (!isMobileViewport()) {
      scrollTo(section);
      focus($("results-title"));
    }
    try {
      const data = await api(
        `/api/details?id=${encodeURIComponent(record.licenceID)}`,
        signal,
      );
      if (id !== revision) return;
      if (
        !detailsValid(data.detail) ||
        !value(data.detail.licenceNumber, "") ||
        (record.licenceNumber &&
          data.detail.licenceNumber !== record.licenceNumber)
      )
        throw new Error(
          "The licence service returned an incomplete record. Please try again.",
        );
      await waitForMinimum(startedAt, MIN_RECORD_DISPLAY_MS, signal);
      if (id !== revision || signal.aborted) return;
      activeDetails = data.detail;
      activeCheckedAt = data.checkedAt;
      detail.replaceChildren(profile(record, data.detail, data.checkedAt));
      saveJourney();
      if (isMobileViewport()) revealResultsOnMobile(id);
    } catch (error) {
      if (id !== revision) return;
      detail.replaceChildren();
      const box = add(detail, "div", "record-error");
      add(
        box,
        "strong",
        "",
        "We could not confirm the detailed licence record.",
      );
      add(box, "p", "", error.message);
      const retry = add(box, "button", "", "Retry lookup");
      retry.type = "button";
      retry.addEventListener("click", () => selectRecord(record));
      add(
        box,
        "p",
        "",
        "No licence verification has been completed. You can still use the official government registers.",
      );
      officialLink(box, "Open official licence register ↗", LICENCES);
      officialLink(box, "Open Name and Shame Register ↗");
    } finally {
      if (id === revision) busy(false);
    }
  }
  async function search(q) {
    const { id, signal } = begin();
    const startedAt = Date.now();
    clearSaved();
    report = "";
    activeDetails = null;
    activeRecord = null;
    records = [];
    truncated = false;
    $("suburb-filter").value = "";
    section.hidden = false;
    list.hidden = false;
    detail.hidden = true;
    list.replaceChildren(searchLoading());
    detail.replaceChildren();
    $("results-tools").hidden = true;
    $("back-button").hidden = true;
    $("results-kicker").textContent = "NSW GOVERNMENT LICENCE SEARCH";
    $("results-title").textContent = "Searching NSW records…";
    $("results-subtitle").textContent =
      "Matching government licence records for your search.";
    notify("Contacting NSW Government records…");
    busy(true);
    // Do not scroll/focus while the keyboard is open or the results are
    // still loading. Safari otherwise retains a zoomed, clipped viewport.
    if (!isMobileViewport()) {
      scrollTo(section);
      focus($("results-title"));
    }
    try {
      const data = await api(`/api/search?q=${encodeURIComponent(q)}`, signal);
      if (id !== revision) return;
      if (!Array.isArray(data.results))
        throw new Error(
          "The licence service returned an unreadable result list. Please try again.",
        );
      await waitForMinimum(startedAt, MIN_SEARCH_DISPLAY_MS, signal);
      if (id !== revision || signal.aborted) return;
      records = data.results.filter(
        (r) =>
          r &&
          typeof r.licenceID === "string" &&
          /^[\w-]{1,50}$/.test(r.licenceID),
      );
      truncated = data.truncated === true;
      // The mobile keyboard/viewport handler controls the initial scroll.
      // Avoid a second immediate scroll while Safari is still dismissing it.
      showRows(false);
      if (isMobileViewport()) revealResultsOnMobile(id);
    } catch (error) {
      if (id !== revision) return;
      $("results-title").textContent = "Search unavailable";
      $("results-subtitle").textContent =
        "Please try again, or use the official property licence register.";
      notify(error.message, true);
      list.replaceChildren();
      officialLink(
        list,
        "Search the official NSW licence register ↗",
        LICENCES,
      );
      if (isMobileViewport()) revealResultsOnMobile(id);
    } finally {
      if (id === revision) busy(false);
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = input.value;
    const q = raw.trim().replace(/ +/g, " ");
    if (q.length < 2 || q.length > 80 || /[\u0000-\u001f\u007f]/.test(raw)) {
      input.setCustomValidity(
        "Enter a name or licence number using 2 to 80 characters.",
      );
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    // Dismiss the iOS keyboard before changing sections; never suppress
    // pinch zoom or modify the viewport's accessibility settings.
    input.blur();
    search(q);
  });
  input.addEventListener("input", () => input.setCustomValidity(""));
  $("suburb-filter").addEventListener("input", drawRows);
  $("back-button").addEventListener("click", () => {
    begin();
    activeDetails = null;
    activeRecord = null;
    report = "";
    clearSaved();
    showRows();
  });
  $("clear-button").addEventListener("click", () => {
    begin();
    clearSaved();
    records = [];
    report = "";
    activeDetails = null;
    activeRecord = null;
    section.hidden = true;
    list.replaceChildren();
    detail.replaceChildren();
    input.value = "";
    busy(false);
    scrollTo($("search"));
    input.focus({ preventScroll: true });
  });

  // Motion remains optional and never blocks access to content.
  document.documentElement.classList.add("enhanced");
  function syncMotion() {
    document.documentElement.classList.toggle("motion-paused", reduced());
    $("motion-toggle").textContent = reduced() ? "Motion off" : "Pause motion";
    $("motion-toggle").setAttribute("aria-pressed", String(reduced()));
  }
  $("motion-toggle").addEventListener("click", () => {
    paused = !paused;
    syncMotion();
  });
  motionPreference.addEventListener?.("change", syncMotion);
  syncMotion();
  // Reversible, section-specific reveals: the same section responds when
  // scrolling back up. Remove only after it is completely out of view, so
  // nothing disappears while the visitor is still reading it.
  function makeRevealObserver(threshold, rootMargin) {
    return new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= threshold) {
            entry.target.classList.add("visible");
          } else if (!entry.isIntersecting) {
            entry.target.classList.remove("visible");
          }
        }
      },
      { threshold: [0, threshold], rootMargin },
    );
  }
  const canObserve = !reduced() && "IntersectionObserver" in window;
  const observer = canObserve
    ? makeRevealObserver(0.08, "0px 0px -10% 0px")
    : null;
  // The large editorial cards should not animate until the reader has
  // actually reached that section, in either scrolling direction.
  const editorialObserver = canObserve
    ? makeRevealObserver(0.28, "0px 0px -18% 0px")
    : null;
  for (const node of document.querySelectorAll("[data-reveal]")) {
    if (node.matches(".question-card")) {
      if (editorialObserver) editorialObserver.observe(node);
      else node.classList.add("visible");
    } else if (observer) observer.observe(node);
    else node.classList.add("visible");
  }
  let scrollFrame = 0;
  let previousScrollY = window.scrollY || 0;
  function updateScroll() {
    scrollFrame = 0;
    const y = window.scrollY || 0,
      max = document.documentElement.scrollHeight - innerHeight;
    if (Math.abs(y - previousScrollY) > 3) {
      document.documentElement.dataset.scrollDirection =
        y < previousScrollY ? "up" : "down";
    }
    previousScrollY = y;
    $("reading-progress").style.width =
      `${Math.max(0, Math.min(100, max ? (y / max) * 100 : 0))}%`;
    $("site-header").classList.toggle("is-scrolled", y > 60);
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true },
  );
  updateScroll();
  if (window.matchMedia("(pointer:fine)").matches) {
    const hero = $("search");
    let frame = 0;
    hero.addEventListener(
      "pointermove",
      (event) => {
        if (reduced() || frame) return;
        frame = requestAnimationFrame(() => {
          const rect = hero.getBoundingClientRect();
          hero.style.setProperty("--mx", `${event.clientX - rect.left}px`);
          hero.style.setProperty("--my", `${event.clientY - rect.top}px`);
          const ox = (event.clientX - rect.left - rect.width / 2) / rect.width,
            oy = (event.clientY - rect.top - rect.height / 2) / rect.height;
          hero.querySelector(".hero-photo").style.transform =
            `scale(1.04) translate(${(-ox * 8).toFixed(1)}px,${(-oy * 5).toFixed(1)}px)`;
          frame = 0;
        });
      },
      { passive: true },
    );
  }
  const menu = $("menu-toggle"),
    mobile = $("mobile-nav");
  function closeMenu(returnFocus = false) {
    mobile.hidden = true;
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open menu");
    if (returnFocus) menu.focus();
  }
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mobile.hidden = !open;
  });
  for (const link of mobile.querySelectorAll("a"))
    link.addEventListener("click", () => closeMenu());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobile.hidden) closeMenu(true);
  });
  for (const [i, button] of [
    ...document.querySelectorAll(".question-toggle"),
  ].entries()) {
    const answer = button.nextElementSibling;
    answer.id = `question-answer-${i}`;
    button.setAttribute("aria-controls", answer.id);
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      answer.hidden = open;
    });
  }
  function restoreJourney() {
    try {
      const text = sessionStorage.getItem(RESUME);
      if (!text) return;
      if (text.length > 20000) throw new Error("Oversized saved record");
      const saved = JSON.parse(text),
        age = Date.now() - saved.created;
      if (
        saved.version !== 1 ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > 30 * 60 * 1000 ||
        !saved.record ||
        !/^[\w-]{1,50}$/.test(saved.record.licenceID) ||
        !detailsValid(saved.details) ||
        !time(saved.checkedAt)
      )
        throw new Error("Invalid saved record");
      begin();
      records = [];
      activeRecord = saved.record;
      activeDetails = saved.details;
      activeCheckedAt = saved.checkedAt;
      report = ["found", "none", "unsure"].includes(saved.report)
        ? saved.report
        : "";
      section.hidden = false;
      list.hidden = true;
      detail.hidden = false;
      $("results-tools").hidden = true;
      $("back-button").hidden = true;
      detail.replaceChildren(
        profile(activeRecord, activeDetails, activeCheckedAt),
      );
      $("results-kicker").textContent = "YOUR TWO SEPARATE CHECKS";
      $("results-title").textContent = "Welcome back. Finish your check.";
      $("results-subtitle").textContent =
        "Your earlier licence lookup is restored. The time checked appears below; refresh it if you need an updated record.";
      notify(
        "This is your saved licence lookup, not a new government verification.",
      );
      busy(false);
      requestAnimationFrame(() => {
        scrollTo(section);
        focus($("results-title"));
      });
    } catch {
      clearSaved();
    }
  }
  restoreJourney();
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) restoreJourney();
  });
})();
