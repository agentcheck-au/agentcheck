'use strict';
(() => {
  const REGISTRY_URL = 'https://www.nsw.gov.au/departments-and-agencies/fair-trading/how-we-regulate/name-and-shame-register#search-the-register';
  const $ = (id) => document.getElementById(id);
  const form = $('search-form'), input = $('search-input'), searchButton = $('search-button');
  const section = $('results-section'), list = $('results-list'), panel = $('detail-panel'), status = $('status-message');
  const toast = $('toast');
  let requestVersion = 0, toastTimeout = 0, lastResults = [];
  $('year').textContent = String(new Date().getFullYear());

  const el = (tag, className = '', content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = String(content);
    return element;
  };
  const add = (parent, tag, className = '', content) => parent.appendChild(el(tag, className, content));
  const safe = (value, fallback = 'Not published') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
  function displayTime(value) {
    const date = new Date(value);
    return !value || Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-AU', {day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function message(text, isError = false) { status.hidden = !text; status.textContent = text; status.className = `status-message${isError ? ' error' : ''}`; }
  function announce(text) {toast.textContent = text; toast.hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => {toast.hidden=true;},4800);}
  function icon(name) {
    const i = el('span', `inline-icon icon-${name}`);
    i.setAttribute('aria-hidden','true');
    const symbols = {
      pin: '<path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/>',
      check: '<path d="m4 12 5 5L20 6"/>',
      shield: '<path d="M12 2 21 6v6c0 6-4 9-9 11-5-2-9-5-9-11V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
      flag: '<path d="M5 22V4m0 1q5-3 9 0t7 0v11q-4 3-7 0t-9 0"/>',
      arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };
    i.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${symbols[name]||symbols.shield}</svg>`;
    return i;
  }
  function chip(value) {
    const current = String(value || '').toLowerCase() === 'current';
    const pill = el('span', `licence-status ${current ? 'is-current' : 'is-other'}`);
    add(pill,'span','status-dot'); add(pill,'span','',safe(value,'Status not published'));
    return pill;
  }
  function markBusy(busy) {
    section.setAttribute('aria-busy', String(busy));
    searchButton.disabled = busy;
    searchButton.replaceChildren(document.createTextNode(busy ? 'Searching…' : 'Check agent '));
    if (!busy) searchButton.append(el('span','', '→'));
  }
  function initials(name) {return String(name||'').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'AC';}

  function renderList(records) {
    list.hidden=false; list.replaceChildren();
    for (const r of records) {
      const btn = add(list,'button','match-row'); btn.type='button';
      btn.setAttribute('aria-label',`View ${safe(r.licenceName)} licence ${safe(r.licenceNumber)} in ${safe(r.suburb)}`);
      const left=add(btn,'div','match-left'); add(left,'span','avatar',initials(r.licenceName));
      const identity=add(left,'div','match-text'); add(identity,'strong','match-name',safe(r.licenceName));
      add(identity,'span','match-subtitle',`Licence ${safe(r.licenceNumber)} · ${safe(r.licenceType)}`);
      const suburb=add(btn,'span',`suburb-tag${r.suburb ? '' : ' is-unknown'}`);
      suburb.append(icon('pin'));add(suburb,'strong','',safe(r.suburb,'Suburb not listed'));
      btn.append(chip(r.status));
      const cta=add(btn,'span','match-view','View record');cta.append(icon('arrow'));
      btn.addEventListener('click',()=>selectRecord(r));
    }
  }
  function verificationLoading(record) {
    const card=el('div','verification-loading');
    const emblem=add(card,'div','loading-emblem');emblem.append(icon('shield'));
    const t=add(card,'div','loading-copy');add(t,'strong','',`Checking ${safe(record.licenceName)}'s licence`);
    add(t,'p','', 'Retrieving licence status and authorised activities from NSW Government records…');
    const dots=add(card,'div','loading-dots'); for(let i=0;i<3;i++) add(dots,'span');
    return card;
  }
  function field(parent, label, value) {
    const item=add(parent,'div','record-field');add(item,'span','record-label',label);add(item,'strong','record-value',safe(value));return item;
  }
  function verificationHeader(licenceStatus) {
    const current=String(licenceStatus||'').toLowerCase()==='current';
    const box=el('section','verification-banner');
    const top=add(box,'div','verification-progress-top');
    add(top,'span','eyebrow','YOUR TWO-STEP CHECK');add(top,'strong','', '1 of 2 steps completed');
    const meter=add(box,'div','progress-track');add(meter,'span','progress-fill');
    const grid=add(box,'div','verification-status-grid');
    const item1=add(grid,'div','verification-status complete');
    const symbol=add(item1,'span',`status-symbol ${current?'green':'amber'}`);symbol.append(icon('shield'));
    const s1=add(item1,'div');add(s1,'span','verify-step','STEP 1 · NSW LICENCE');
    add(s1,'strong','',current?'Current licence confirmed':`Licence status: ${safe(licenceStatus)}`);
    add(s1,'p','',current?'NSW Government records confirm the licence is current.':'Review the licence status before proceeding.');
    const item2=add(grid,'div','verification-status waiting');
    const w=add(item2,'span','status-symbol amber');w.append(icon('flag'));
    const s2=add(item2,'div');add(s2,'span','verify-step','STEP 2 · REGULATORY REGISTER');
    add(s2,'strong','','Still needs checking');
    add(s2,'p','','The separate NSW Fair Trading register has not been searched by AgentCheck.');
    return box;
  }
  function syncCopy(value) {
    if (!value) return false;
    const selected=document.activeElement;
    const ta=document.createElement('textarea');ta.value=value;ta.readOnly=true;
    ta.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none;width:1px;height:1px';
    document.body.appendChild(ta); ta.focus(); ta.select();ta.setSelectionRange(0,value.length);
    let ok=false;
    try {ok=!!document.execCommand('copy');} catch {ok=false;}
    ta.remove();
    if (selected?.focus) selected.focus({preventScroll:true});
    return ok;
  }
  async function copyNumber(value) {
    if(syncCopy(value)) return true;
    try {if (!navigator.clipboard?.writeText) return false; await navigator.clipboard.writeText(value);return true;}catch{return false;}
  }
  function fallbackCopy(box, number) {
    box.replaceChildren();box.className='handoff-fallback';
    add(box,'strong','','Your browser prevented automatic copying.');
    add(box,'p','','Select the licence number below and copy it, then open the official register.');
    const row=add(box,'div','fallback-row');
    const field=add(row,'input','fallback-number');field.type='text';field.value=number;field.readOnly=true;field.setAttribute('aria-label','Licence number to copy');
    field.addEventListener('click',()=>field.select());field.addEventListener('focus',()=>field.select());
    const retry=add(row,'button','button button-secondary','Copy number');retry.type='button';
    retry.addEventListener('click',async()=>{ if(await copyNumber(number)){announce('Licence number copied');retry.textContent='Copied ✓';}else{field.focus();field.select();} });
    const link=add(box,'a','fallback-link','Open the NSW Government register ↗');link.href=REGISTRY_URL;link.target='_blank';link.rel='noopener noreferrer';
    field.focus();field.select();
  }
  function addRegulatoryStep(parent, number) {
    const card=add(parent,'section','regulatory-card');
    const heading=add(card,'div','regulatory-heading');
    const badge=add(heading,'span','eyebrow action-kicker');badge.append(icon('flag')); badge.append(' STEP 2 OF 2 · YOUR NEXT STEP');
    add(heading,'h3','','Now check for regulatory actions.');
    add(heading,'p','','A current licence does not mean an agent has no published regulatory actions. Check the NSW Fair Trading Name and Shame Register before you appoint.');
    const action=add(card,'div','regulatory-action');
    const preview=add(action,'div','selected-number');add(preview,'span','','LICENCE NUMBER TO SEARCH');add(preview,'strong','',safe(number));
    const button=add(action,'button','button button-primary action-button');button.type='button';
    button.disabled=!number;button.append(icon('copy'));button.append(' Copy number & open NSW register ');button.append(icon('arrow'));
    const instruction=add(card,'p','paste-instruction');instruction.append(icon('check'));instruction.append('One click copies the licence number and opens the NSW search. Paste it there and press Search.');
    const feedback=add(card,'div','handoff-status');feedback.hidden=true;
    let clickCount=0;
    button.addEventListener('click',async()=>{
      if(clickCount>0 && !button.disabled) { /* A repeat click is permitted if the first tab was closed. */ }
      ++clickCount;
      // Synchronous copy inside the actual click gesture avoids the focus loss seen with a new tab.
      const instant=syncCopy(number);
      if(instant){
        feedback.hidden=false;feedback.className='handoff-status copy-success';feedback.textContent='Licence number copied. On the NSW page, paste it into the search field.';
        announce(`Licence ${number} copied. Paste into the NSW register.`);
        const win=window.open(REGISTRY_URL,'_blank','noopener,noreferrer');
        // noopener can return null even when successfully opened. Do not claim the tab opened.
        return win;
      }
      // Asynchronous clipboard fallback: navigating the same tab avoids popup blockers.
      if(await copyNumber(number)){
        feedback.hidden=false;feedback.className='handoff-status copy-success';feedback.textContent='Licence number copied. Opening the NSW register…';
        window.location.assign(REGISTRY_URL);
        return;
      }
      feedback.hidden=false;fallbackCopy(feedback,number);
    });
    const after=add(parent,'section','register-followup');
    add(after,'div','followup-overline','AFTER CHECKING THE NSW REGISTER');
    add(after,'h3','','Did the government register show a matching action?');
    add(after,'p','','Check that the name and licence number match the agent you searched. Then choose what you found.');
    const answers=add(after,'div','answer-buttons');
    const yes=add(answers,'button','answer-button answer-danger','Yes, I found a matching action');yes.type='button';yes.append(icon('arrow'));
    const no=add(answers,'button','answer-button','No matching action appeared');no.type='button';
    const unsure=add(answers,'button','answer-button','Not sure');unsure.type='button';
    const conclusion=add(after,'div','register-conclusion');conclusion.hidden=true;
    const setOutcome=(type)=>{
      conclusion.hidden=false;conclusion.replaceChildren();
      yes.setAttribute('aria-pressed',String(type==='found')); no.setAttribute('aria-pressed',String(type==='none'));unsure.setAttribute('aria-pressed',String(type==='unsure'));
      if(type==='found'){
        conclusion.className='register-conclusion outcome-danger';
        const h=add(conclusion,'div','outcome-title');h.append(icon('flag'));add(h,'strong','','RED FLAG — Regulatory action reported');
        add(conclusion,'p','','You reported finding a published regulatory action for this agent. Treat this as a serious reason to investigate before appointing them. Read the notice, confirm the licence number, and ask for an explanation.');
        add(conclusion,'small','','This result was reported by you, not independently confirmed by AgentCheck. A published action does not by itself establish an agent is currently prohibited from practising.');
      }else if(type==='none'){
        conclusion.className='register-conclusion outcome-neutral';
        const h=add(conclusion,'div','outcome-title');h.append(icon('check'));add(h,'strong','','No matching action reported');
        add(conclusion,'p','','You reported no matching entry in the register. This is not an official declaration of a clean disciplinary history. Consider licence status, experience, fees and references as well.');
      }else{
        conclusion.className='register-conclusion outcome-amber';
        const h=add(conclusion,'div','outcome-title');h.append(icon('clock'));add(h,'strong','','Check is not yet resolved');
        add(conclusion,'p','','If the details are unclear, search by licence number and compare the record carefully. You can revisit the official register.');
      }
      const link=add(conclusion,'a','outcome-link','Review the official register ↗');link.href=REGISTRY_URL;link.target='_blank';link.rel='noopener noreferrer';
      conclusion.scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    yes.addEventListener('click',()=>setOutcome('found'));no.addEventListener('click',()=>setOutcome('none'));unsure.addEventListener('click',()=>setOutcome('unsure'));
  }
  function recordProfile(record, data, checkedAt) {
    const wrap=el('div','profile-layout');
    wrap.append(verificationHeader(data.status||record.status));
    const profile=add(wrap,'article','profile-card');
    const head=add(profile,'div','profile-head');
    const h=add(head,'div');add(h,'span','eyebrow section-eyebrow','NSW GOVERNMENT LICENCE DETAILS');
    add(h,'h3','',safe(data.licenceName||record.licenceName));
    const sub=add(h,'p','profile-subtitle',safe(record.suburb,'NSW')+' · '+safe(data.licenceType||record.licenceType));
    head.append(chip(data.status||record.status));
    const grid=add(profile,'div','record-grid');
    field(grid,'LICENCE NUMBER',data.licenceNumber||record.licenceNumber);
    field(grid,'LICENCE STATUS',data.status||record.status);
    field(grid,'SUBURB',record.suburb);
    field(grid,'LICENCE TYPE',data.licenceType||record.licenceType);
    field(grid,'COMMENCED',data.startDate);
    field(grid,'EXPIRY',data.expiryDate||record.expiryDate);
    field(grid,'AUTHORISED ACTIVITIES',(data.classes||[]).filter(Boolean).join(' · '));
    field(grid,'SOURCE','NSW Government');
    if(Array.isArray(data.premises)&&data.premises.length){
      const premises=add(profile,'div','profile-premises');
      add(premises,'span','record-label','LISTED BUSINESS PREMISES');add(premises,'strong','',data.premises.join(' · '));
    }
    if(Array.isArray(data.conditions)&&data.conditions.length){
      const details=add(profile,'details','conditions-disclosure');
      add(details,'summary','',`View licence conditions (${data.conditions.length})`);
      const ul=add(details,'ul');for(const c of data.conditions){ add(ul,'li','',c); }
    }
    const time=displayTime(checkedAt);if(time)add(profile,'p','retrieved-at',`Licence checked ${time} · NSW Government records`);
    addRegulatoryStep(wrap,data.licenceNumber||record.licenceNumber);
    return wrap;
  }
  async function selectRecord(record) {
    const id=++requestVersion;
    list.hidden=true;
    panel.hidden=false;panel.replaceChildren(verificationLoading(record));
    $('results-kicker').textContent='AGENT VERIFICATION';
    $('results-title').textContent='Your agent licence check';
    $('results-subtitle').textContent='Step 1 checks the government licence. Step 2 checks the separate regulatory register.';
    message('');
    panel.scrollIntoView({behavior:'smooth',block:'start'});
    try {
      const response=await fetch(`/api/details?id=${encodeURIComponent(record.licenceID)}`,{cache:'no-store'});
      const payload=await response.json();
      if(!response.ok)throw Error(payload?.error||'Unable to retrieve the detailed record.');
      if(id!==requestVersion)return;
      panel.replaceChildren(recordProfile(record,payload.detail||{},payload.checkedAt));
    }catch(error){
      if(id!==requestVersion)return;
      panel.replaceChildren();
      const errorBox=add(panel,'div','record-error');add(errorBox,'strong','','Unable to confirm the full licence record');
      add(errorBox,'p','',error?.message||'Please try later.');
      const retry=add(errorBox,'button','button button-secondary','Retry licence lookup');retry.type='button';retry.addEventListener('click',()=>selectRecord(record));
      // An unsuccessful details lookup cannot be presented as verified.
      addRegulatoryStep(panel,record.licenceNumber);
    }
  }
  async function search(query) {
    const id=++requestVersion; lastResults=[];
    section.hidden=false;panel.hidden=true;list.hidden=false;list.replaceChildren();panel.replaceChildren();
    $('results-kicker').textContent='NSW GOVERNMENT RECORDS';
    $('results-title').textContent='Searching licence records';
    $('results-subtitle').textContent='Finding records that match your search.';
    message('Contacting NSW Government records…');markBusy(true);
    section.scrollIntoView({behavior:'smooth',block:'start'});
    try {
      const response=await fetch(`/api/search?q=${encodeURIComponent(query)}`,{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw Error(data?.error||'The search is temporarily unavailable.');
      if(id!==requestVersion)return;
      const records=Array.isArray(data.results)?data.results:[];lastResults=records;
      $('results-title').textContent=records.length===1?'One matching licence':`${records.length}${data.truncated?'+':''} matching licence records`;
      $('results-subtitle').textContent=records.length===1?'Opening the matching government record.':'Use the suburb and licence number to choose the correct person.';
      message(records.length?'':'No matching records. Try the full name or licence number.');
      if(records.length>1)renderList(records);
      else if(records.length===1)await selectRecord(records[0]);
      if(data.truncated)message('Showing the first 20 records. Enter more of the name or licence number to narrow the list.');
    }catch(error){
      if(id!==requestVersion)return;
      $('results-title').textContent='Search unavailable';$('results-subtitle').textContent='Please try again shortly.';
      message(error?.message||'The NSW Government service is temporarily unavailable.',true);
    }finally {markBusy(false);section.setAttribute('aria-busy','false');}
  }
  form.addEventListener('submit',(event)=>{
    event.preventDefault();const query=input.value.trim().replace(/\s+/g,' ');
    if(query.length<2||query.length>80){input.setCustomValidity('Enter an agent name or licence number with 2–80 characters.');input.reportValidity();return;}
    input.setCustomValidity('');search(query);
  });
  input.addEventListener('input',()=>input.setCustomValidity(''));
  $('clear-button').addEventListener('click',()=>{
    ++requestVersion;section.hidden=true;panel.hidden=true;list.hidden=false;list.replaceChildren();panel.replaceChildren();
    input.value='';markBusy(false);$('search-card').scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});
  });
})();
