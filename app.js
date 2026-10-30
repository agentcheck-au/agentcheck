'use strict';
(() => {
  const REGISTRY_URL = 'https://www.nsw.gov.au/departments-and-agencies/fair-trading/how-we-regulate/name-and-shame-register#search-the-register';
  const byId = (id) => document.getElementById(id);
  const form = byId('search-form');
  const input = byId('search-input');
  const button = byId('search-button');
  const region = byId('results-section');
  const list = byId('results-list');
  const panel = byId('detail-panel');
  const status = byId('status-message');
  let run = 0;

  function element(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function add(parent, child) { parent.append(child); return child; }
  function showStatus(message, error = false) {
    status.hidden = !message;
    status.textContent = message || '';
    status.className = `status-message${error ? ' error' : ''}`;
  }
  function pill(value) {
    const p = element('span', `status-pill${value?.toLowerCase() === 'current' ? '' : ' not-current'}`, value || 'Status unavailable');
    return p;
  }
  function detailItem(parent, label, value) {
    const c = add(parent, element('div','detail-item'));
    add(c, element('span','label',label));
    add(c, element('span','value',value || 'Not published'));
  }
  function dateSafe(date) { return date || 'Not published'; }
  function addHandoff(card, licenceNumber) {
    const wrapper = add(card, element('div', 'handoff'));
    add(wrapper, element('h4','', 'Check the NSW Name and Shame Register'));
    add(wrapper, element('p','', 'The government’s separate register may contain published regulatory actions not shown by the Property API. We’ll copy this licence number and open the official search page.'));
    const actions = add(wrapper, element('div','handoff-action'));
    const go = add(actions, element('button','primary-button','Copy licence & open NSW register ↗'));
    go.type = 'button';
    add(actions, element('span','handoff-help','On NSW website: click search field → Ctrl + V → Search. On a phone, tap and hold → Paste.'));
    const feedback = add(wrapper, element('div','handoff-feedback'));
    feedback.hidden = true;
    go.addEventListener('click', async () => {
      // Open directly during the click gesture to avoid popup blockers.
      window.open(REGISTRY_URL, '_blank', 'noopener,noreferrer');
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(licenceNumber);
        feedback.textContent = `Licence ${licenceNumber} copied. Paste it into the NSW search box (Ctrl + V or tap and hold → Paste), then press Search.`;
      } catch {
        feedback.textContent = `Clipboard access was blocked. Copy licence ${licenceNumber} from this page, then paste it into the NSW search box.`;
        const manual = add(feedback, element('button', 'secondary-button', `Copy ${licenceNumber}`));
        manual.style.marginLeft = '10px';
        manual.onclick = () => navigator.clipboard?.writeText(licenceNumber).then(() => { manual.textContent = 'Copied'; }).catch(() => {});
      }
      feedback.hidden = false;
    });
    const backup = add(wrapper, element('a','fallback-link','Open official register directly ↗'));
    backup.href = REGISTRY_URL;
    backup.target = '_blank'; backup.rel = 'noopener noreferrer';
    backup.style.cssText = 'display:inline-block;font-size:12px;color:#315ec2;margin-top:13px;';
  }
  async function showDetails(record) {
    panel.hidden = false;
    panel.replaceChildren();
    const card = add(panel, element('article','detail-card'));
    add(card, element('div','detail-label','NSW GOVERNMENT LICENCE DETAILS'));
    const top = add(card, element('div','detail-top'));
    add(top, element('h3','',record.licenceName || record.licenceNumber));
    add(top, pill(record.status));
    add(card, element('p','result-info','Loading licence details…'));
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const selected = ++run;
    try {
      const response = await fetch(`/api/details?id=${encodeURIComponent(record.licenceID)}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load details.');
      if (selected !== run) return;
      const d = json.detail;
      card.replaceChildren();
      add(card, element('div','detail-label','NSW GOVERNMENT LICENCE DETAILS'));
      const heading = add(card, element('div','detail-top'));
      add(heading, element('h3','',d.licenceName || record.licenceName));
      add(heading, pill(d.status));
      const grid = add(card, element('div','detail-grid'));
      detailItem(grid, 'Licence number', d.licenceNumber);
      detailItem(grid, 'Licence type', d.licenceType);
      detailItem(grid, 'Commenced', dateSafe(d.startDate));
      detailItem(grid, 'Expiry date', dateSafe(d.expiryDate));
      detailItem(grid, 'Authorised class / activities', d.classes?.join(' · '));
      detailItem(grid, 'Source', 'NSW Property API');
      const compliance = add(card, element('div','regulatory'));
      add(compliance, element('h4','', 'Compliance information from the Property API'));
      const known = d.compliance?.actions?.filter(a => a.count !== null) || [];
      const total = known.reduce((n,a) => n + a.count, 0);
      const text = known.length ? `The Property API returned ${total} records across its listed compliance action categories.` : 'No compliance information was supplied by the Property API.';
      add(compliance, element('div','regulatory-count',text));
      for (const item of known.filter(a => a.count > 0)) {
        const row = add(compliance, element('div','raw-notice'));
        add(row, element('strong','',`${item.label}: ${item.count} returned`));
      }
      add(compliance, element('p','', 'Important: the NSW Property API does not reliably reproduce the separate Fair Trading Name and Shame Register. Zero records here does NOT mean no regulatory actions exist. Always check the official register.'));
      addHandoff(card, d.licenceNumber || record.licenceNumber);
      const checked = new Date(json.checkedAt);
      if (!Number.isNaN(checked.valueOf())) add(card, element('p','result-info',`Checked against NSW Property API: ${checked.toLocaleString('en-AU')}.`));
    } catch (err) {
      if (selected === run) {
        card.replaceChildren();
        add(card, element('h3','',record.licenceName));
        add(card, element('p','result-info',err.message));
        addHandoff(card, record.licenceNumber);
      }
    }
  }
  async function search(q) {
    run++;
    list.replaceChildren(); panel.replaceChildren(); panel.hidden = true;
    region.hidden = false;
    byId('results-title').textContent = 'Matching licence records';
    showStatus('Searching official NSW licence records…');
    button.disabled = true;
    button.textContent = 'Searching…';
    region.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Search unavailable.');
      showStatus(json.results.length ? '' : 'No matching licence records were returned. Try a different spelling or licence number. This is not a statement about whether the person is licensed.');
      byId('results-title').textContent = `${json.results.length}${json.truncated ? '+' : ''} matching record${json.results.length === 1 ? '' : 's'}`;
      for (const item of json.results) {
        const card = add(list, element('article','result-card'));
        const info = add(card, element('div'));
        add(info, element('h3','',item.licenceName || 'Name not published'));
        add(info, element('div','result-info',`Licence ${item.licenceNumber || 'not published'} · ${item.licenceType || 'Property'}${item.suburb ? ` · ${item.suburb}` : ''}`));
        const actions = add(card, element('div','result-actions'));
        add(actions,pill(item.status));
        const view = add(actions, element('button','secondary-button','View record →'));
        view.type = 'button'; view.addEventListener('click', () => showDetails(item));
      }
      if (json.truncated) showStatus('Showing the first 20 matches. Refine the search to find a specific agent.');
    } catch (err) {
      showStatus(err.message || 'Unable to search right now.', true);
    } finally {
      button.disabled = false; button.innerHTML = 'Check agent <span aria-hidden="true">→</span>';
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = input.value.replace(/\s+/g,' ').trim();
    if (q.length < 2 || q.length > 80) { input.setCustomValidity('Enter at least two characters.'); input.reportValidity(); return; }
    input.setCustomValidity(''); search(q);
  });
  input.addEventListener('input', () => input.setCustomValidity(''));
  byId('clear-button').addEventListener('click', () => {
    ++run; input.value = ''; region.hidden = true;
    byId('search-panel').scrollIntoView({ behavior: 'smooth', block:'center' }); input.focus();
  });
})();
