/* =================================================================
   ARAMOS — menu editor engine (admin.html)
   Edits a local DRAFT and exports menu.json. It NEVER writes to the
   live site: publishing = download menu.json + upload it to the host.
   Driven by config.json (brand + languages) so it works for any venue.
   ================================================================= */

const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;

let CFG, LANGS, BRAND, DRAFT_KEY, PIN_KEY, MARKET = '—';
let data = [];                 // working copy: [{ id, name{lang}, items:[{name,description,price,featured,tags}] }]
let saveTimer;

/* ---------- shared bits (mirrors the menu engine) ---------- */
function spiralSVG(turns = 2.7, pts = 170) {
  const c = 50, maxR = 43; let d = '';
  for (let i = 0; i <= pts; i++) {
    const t = i / pts, a = t * turns * Math.PI * 2, r = maxR * t;
    d += (i === 0 ? 'M' : 'L') + (c + r * Math.cos(a)).toFixed(2) + ' ' + (c + r * Math.sin(a)).toFixed(2) + ' ';
  }
  return `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d.trim()}"/></svg>`;
}
function paintSpirals(scope = document) {
  const svg = spiralSVG();
  $$('[data-spiral]', scope).forEach(n => { if (!n.children.length) n.innerHTML = svg; });
}
const slug = (s) => String(s).toLowerCase().normalize('NFD')
  .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'venue';
function applyTheme(theme = {}) { Object.entries(theme).forEach(([k, v]) => root.style.setProperty('--' + k, v)); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- safe storage ---------- */
const safeGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } };
const safeRemove = (k) => { try { localStorage.removeItem(k); } catch (_) {} };
const hasDraft = () => !!safeGet(DRAFT_KEY);

/* ---------- language-object helpers ---------- */
const emptyLangs = () => { const o = {}; LANGS.forEach(l => o[l.code] = ''); return o; };
const fillLangs = (obj) => { const o = {}; LANGS.forEach(l => o[l.code] = (obj && typeof obj[l.code] === 'string') ? obj[l.code] : ''); return o; };
const hasText = (obj) => LANGS.some(l => (obj && obj[l.code] || '').trim() !== '');
const firstVal = (obj, fb = 'item') => { for (const l of LANGS) { const v = (obj && obj[l.code] || '').trim(); if (v) return v; } return fb; };
const langObj = (obj) => { const o = {}; LANGS.forEach(l => o[l.code] = (obj && obj[l.code] || '').trim()); return o; };

const newItem = () => ({ name: emptyLangs(), description: emptyLangs(), price: '', featured: false, tags: [] });
const newCat  = () => ({ id: '', name: emptyLangs(), items: [] });
const priceVal = (p) => (p === '' || p == null) ? '' : String(p);

/* ---------- import (any menu shape → working copy) ---------- */
function normalize(input) {
  const arr = Array.isArray(input) ? input : (input && input.menu) || [];
  return arr.map(cat => ({
    id: typeof cat.id === 'string' ? cat.id : '',
    name: fillLangs(cat.name),
    items: Array.isArray(cat.items) ? cat.items.map(it => ({
      name: fillLangs(it.name),
      description: fillLangs(it.description),
      price: (typeof it.price === 'number' && it.price > 0) ? it.price : '',
      featured: !!it.featured,
      tags: Array.isArray(it.tags) ? it.tags.map(fillLangs) : []
    })) : []
  }));
}

/* ---------- export (working copy → clean menu.json) ---------- */
function serItem(it) {
  const o = { name: langObj(it.name) };
  if (hasText(it.description)) o.description = langObj(it.description);
  const n = parseFloat(String(it.price).replace(',', '.'));
  o.price = isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  if (it.featured) o.featured = true;
  const tags = (it.tags || []).filter(hasText).map(langObj);
  if (tags.length) o.tags = tags;
  return o;
}
function serialize() {
  const seen = {};
  const menu = data.map(cat => {
    let id = slug((cat.id || '').trim() || slug(firstVal(cat.name, 'category')));
    if (seen[id]) { let n = 2; while (seen[id + '-' + n]) n++; id = id + '-' + n; }
    seen[id] = true;
    return { id, name: langObj(cat.name), items: (cat.items || []).map(serItem) };
  });
  return { menu };
}

/* ---------- boot ---------- */
boot();
async function boot() {
  try {
    CFG = await fetch('./config.json').then(r => r.json());
  } catch (_) { CFG = {}; }
  applyTheme(CFG.theme || {});
  LANGS = (CFG.languages && CFG.languages.length) ? CFG.languages : [{ code: 'en', label: 'EN' }];
  BRAND = (CFG.brand && CFG.brand.name) || 'Menu';
  MARKET = (CFG.brand && CFG.brand.marketPriceLabel) || '—';
  DRAFT_KEY = 'menu.draft.' + slug(BRAND);
  PIN_KEY   = 'menu.adminpin.' + slug(BRAND);

  $('#adm-name').textContent = BRAND;
  document.title = BRAND + ' — menu editor';
  paintSpirals();
  injectPinButton();
  wireToolbar();

  await maybeLock();          // optional on-device soft lock

  // load working data: prefer the local draft, else the published file
  const draft = safeGet(DRAFT_KEY);
  if (draft) {
    try { data = normalize(JSON.parse(draft)); setStatus('Loaded local draft'); }
    catch (_) { data = []; }
  }
  if (!data.length) {
    try {
      const m = await fetch('./menu.json?_=' + Date.now()).then(r => r.json());
      data = normalize(m);
      setStatus(draft ? 'Loaded local draft' : 'Loaded published menu');
    } catch (_) {
      setStatus('Could not load menu.json — use Import, or start a new menu');
    }
  }
  render();
  validate();
}

/* ---------- render ---------- */
function render() {
  const ed = $('#editor');
  if (!data.length) {
    ed.innerHTML = `<div class="empty-editor">No categories yet. Use “Add category” below to start, or “Import” a menu.json.</div>`;
    return;
  }
  ed.innerHTML = data.map((cat, ci) => catCard(cat, ci)).join('');
}

function catCard(cat, ci) {
  const names = LANGS.map(l => `
    <div class="field">
      <label><span class="lng">${esc(l.label)}</span> name</label>
      <input class="in" data-k="cat-name" data-ci="${ci}" data-lang="${esc(l.code)}"
             value="${esc(cat.name[l.code])}" placeholder="Category name (${esc(l.label)})">
    </div>`).join('');
  return `
  <section class="cat">
    <div class="cat__head">
      <div class="cat__names">${names}</div>
      <div class="field cat__id">
        <label>id</label>
        <input class="in in--id" data-k="cat-id" data-ci="${ci}" spellcheck="false"
               value="${esc(cat.id)}" placeholder="auto">
      </div>
      <div class="cat__ctl">
        <button class="iconbtn" data-act="cat-up" data-ci="${ci}" ${ci === 0 ? 'disabled' : ''} title="Move up"><i class="fa-solid fa-arrow-up"></i></button>
        <button class="iconbtn" data-act="cat-down" data-ci="${ci}" ${ci === data.length - 1 ? 'disabled' : ''} title="Move down"><i class="fa-solid fa-arrow-down"></i></button>
        <button class="iconbtn iconbtn--danger" data-act="cat-del" data-ci="${ci}" title="Delete category"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
    <div class="cat__items">
      ${(cat.items || []).map((it, ii) => itemCard(it, ci, ii, cat.items.length)).join('')}
    </div>
    <div class="cat__foot">
      <button class="btn btn--ghost" data-act="item-add" data-ci="${ci}"><i class="fa-solid fa-plus"></i> Add item</button>
    </div>
  </section>`;
}

function itemCard(it, ci, ii, count) {
  const names = LANGS.map(l => `
    <div class="field">
      <label><span class="lng">${esc(l.label)}</span> name</label>
      <input class="in" data-k="item-name" data-ci="${ci}" data-ii="${ii}" data-lang="${esc(l.code)}"
             value="${esc(it.name[l.code])}" placeholder="Item name (${esc(l.label)})">
    </div>`).join('');
  const descs = LANGS.map(l => `
    <div class="field">
      <label><span class="lng">${esc(l.label)}</span> description</label>
      <input class="in" data-k="item-desc" data-ci="${ci}" data-ii="${ii}" data-lang="${esc(l.code)}"
             value="${esc(it.description && it.description[l.code])}" placeholder="optional">
    </div>`).join('');
  const tags = `
    <div class="field">
      <div class="item__top">
        <span class="item__tag-label">Tags <span style="font-weight:500;text-transform:none;color:var(--muted)">(optional pills, e.g. Vegan)</span></span>
        <button class="iconbtn" data-act="tag-add" data-ci="${ci}" data-ii="${ii}" title="Add tag"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div class="tags">
        ${(it.tags || []).map((tg, ti) => `
          <div class="tag-row">
            ${LANGS.map(l => `<input class="in" data-k="tag" data-ci="${ci}" data-ii="${ii}" data-ti="${ti}" data-lang="${esc(l.code)}"
                   value="${esc(tg[l.code])}" placeholder="Tag (${esc(l.label)})">`).join('')}
            <button class="iconbtn iconbtn--danger" data-act="tag-del" data-ci="${ci}" data-ii="${ii}" data-ti="${ti}" title="Remove tag"><i class="fa-solid fa-xmark"></i></button>
          </div>`).join('')}
      </div>
    </div>`;
  return `
  <div class="item">
    <div class="item__top">
      <span class="item__tag-label">Item ${ii + 1}</span>
      <div class="cat__ctl">
        <button class="iconbtn" data-act="item-up" data-ci="${ci}" data-ii="${ii}" ${ii === 0 ? 'disabled' : ''} title="Move up"><i class="fa-solid fa-arrow-up"></i></button>
        <button class="iconbtn" data-act="item-down" data-ci="${ci}" data-ii="${ii}" ${ii === count - 1 ? 'disabled' : ''} title="Move down"><i class="fa-solid fa-arrow-down"></i></button>
        <button class="iconbtn iconbtn--danger" data-act="item-del" data-ci="${ci}" data-ii="${ii}" title="Delete item"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
    <div class="item__grid">
      <div class="item__row">${names}</div>
      <div class="item__row">${descs}</div>
      <div class="item__meta">
        <div class="field">
          <label>Price</label>
          <input class="in in--price" data-k="price" data-ci="${ci}" data-ii="${ii}" inputmode="decimal"
                 value="${esc(priceVal(it.price))}" placeholder="${esc(MARKET)} (market)">
        </div>
        <label class="check"><input type="checkbox" data-k="featured" data-ci="${ci}" data-ii="${ii}" ${it.featured ? 'checked' : ''}> Featured ★</label>
      </div>
      ${tags}
    </div>
  </div>`;
}

/* ---------- editing (event delegation) ---------- */
$('#editor').addEventListener('input', e => {
  const el = e.target, k = el.dataset.k; if (!k) return;
  const ci = +el.dataset.ci, ii = el.dataset.ii != null ? +el.dataset.ii : null,
        ti = el.dataset.ti != null ? +el.dataset.ti : null, lang = el.dataset.lang;
  const cat = data[ci]; if (!cat) return;
  if (k === 'cat-id') cat.id = el.value;
  else if (k === 'cat-name') cat.name[lang] = el.value;
  else if (k === 'item-name') cat.items[ii].name[lang] = el.value;
  else if (k === 'item-desc') cat.items[ii].description[lang] = el.value;
  else if (k === 'price') {
    cat.items[ii].price = el.value;
    const v = el.value.trim(), n = parseFloat(v.replace(',', '.'));
    el.classList.toggle('in--invalid', v !== '' && (!isFinite(n) || n < 0));
  } else if (k === 'tag') cat.items[ii].tags[ti][lang] = el.value;
  autosave(); scheduleValidate();
});
$('#editor').addEventListener('change', e => {
  const el = e.target; if (el.dataset.k !== 'featured') return;
  data[+el.dataset.ci].items[+el.dataset.ii].featured = el.checked;
  autosaveNow();
});
$('#editor').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  doAct(btn.dataset.act, +btn.dataset.ci,
        btn.dataset.ii != null ? +btn.dataset.ii : null,
        btn.dataset.ti != null ? +btn.dataset.ti : null);
});

function move(arr, i, j) { if (j < 0 || j >= arr.length) return; const x = arr[i]; arr[i] = arr[j]; arr[j] = x; }

function doAct(act, ci, ii, ti) {
  const cat = data[ci];
  switch (act) {
    case 'cat-up':   move(data, ci, ci - 1); break;
    case 'cat-down': move(data, ci, ci + 1); break;
    case 'cat-del':
      if (!confirm(`Delete category “${firstVal(cat.name, 'category')}” and its ${cat.items.length} item(s)?`)) return;
      data.splice(ci, 1); break;
    case 'item-add': cat.items.push(newItem()); break;
    case 'item-up':   move(cat.items, ii, ii - 1); break;
    case 'item-down': move(cat.items, ii, ii + 1); break;
    case 'item-del':
      if (!confirm(`Delete item “${firstVal(cat.items[ii].name)}”?`)) return;
      cat.items.splice(ii, 1); break;
    case 'tag-add': cat.items[ii].tags.push(emptyLangs()); break;
    case 'tag-del': cat.items[ii].tags.splice(ti, 1); break;
    default: return;
  }
  render(); autosaveNow(); validate();
  if (act === 'item-add') focusLastIn($$('.cat')[ci] && $$('.item', $$('.cat')[ci]).slice(-1)[0]);
}

function addCategory() {
  data.push(newCat());
  render(); autosaveNow(); validate();
  focusLastIn($$('.cat').slice(-1)[0]);
}
function focusLastIn(scope) {
  if (!scope) return;
  scope.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const inp = scope.querySelector('.in'); if (inp) inp.focus();
}

/* ---------- autosave + status ---------- */
function autosaveNow() {
  const ok = safeSet(DRAFT_KEY, JSON.stringify(serialize().menu));
  setStatus(ok ? 'Draft saved ' + new Date().toLocaleTimeString() : 'Draft kept in memory (storage blocked)');
}
function autosave() { clearTimeout(saveTimer); saveTimer = setTimeout(autosaveNow, 300); }
function setStatus(msg) { const s = $('#adm-status'); if (s) s.textContent = msg; }

/* ---------- validation (content warnings — never blocks) ---------- */
let valTimer;
function scheduleValidate() { clearTimeout(valTimer); valTimer = setTimeout(validate, 350); }
function validate() {
  const issues = [], ids = {};
  data.forEach((cat, ci) => {
    if (!hasText(cat.name)) issues.push(`Category #${ci + 1} has no name.`);
    const id = slug((cat.id || '').trim() || slug(firstVal(cat.name, 'category')));
    if (ids[id] != null) issues.push(`Two categories share the id “${id}” (#${ids[id] + 1} and #${ci + 1}).`);
    else ids[id] = ci;
    (cat.items || []).forEach((it) => {
      if (!hasText(it.name)) issues.push(`An item in “${firstVal(cat.name, 'category')}” has no name.`);
      const pr = String(it.price).trim();
      if (pr !== '') { const n = parseFloat(pr.replace(',', '.')); if (!isFinite(n) || n < 0) issues.push(`“${firstVal(it.name)}” has an invalid price (“${pr}”).`); }
    });
  });
  const box = $('#adm-issues'), list = $('#adm-issues-list');
  if (issues.length) {
    list.innerHTML = issues.slice(0, 12).map(s => `<li>${esc(s)}</li>`).join('') +
      (issues.length > 12 ? `<li>…and ${issues.length - 12} more</li>` : '');
    box.classList.add('is-shown');
  } else box.classList.remove('is-shown');
  return issues;
}

/* ---------- toolbar ---------- */
function wireToolbar() {
  $('#btn-add-cat').addEventListener('click', addCategory);
  $('#btn-download').addEventListener('click', download);
  $('#btn-preview').addEventListener('click', preview);
  $('#btn-load').addEventListener('click', loadPublished);
  $('#btn-discard').addEventListener('click', discard);
  $('#btn-import').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', importFile);
}

function download() {
  const json = JSON.stringify(serialize(), null, 2) + '\n';
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'menu.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus('Downloaded — upload menu.json to your host to publish');
}

function preview() {
  autosaveNow();
  const w = window.open('index.html#preview', '_blank');
  if (!w) setStatus('Pop-up blocked — open index.html#preview manually to preview');
}

async function loadPublished() {
  if (hasDraft() && !confirm('Replace your working copy with the published menu? Edits in this draft will be lost.')) return;
  try {
    const m = await fetch('./menu.json?_=' + Date.now()).then(r => r.json());
    data = normalize(m); render(); autosaveNow(); validate();
    setStatus('Loaded published menu');
  } catch (_) {
    alert('Could not load menu.json from the server.\nIf you opened this file directly (file://), use “Import” instead.');
  }
}

async function discard() {
  if (!confirm('Delete the local draft on this device and reload the published menu?')) return;
  safeRemove(DRAFT_KEY);
  try { data = normalize(await fetch('./menu.json?_=' + Date.now()).then(r => r.json())); }
  catch (_) { data = []; }
  render(); validate(); setStatus('Draft discarded');
}

function importFile(e) {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(r.result);
      const arr = Array.isArray(parsed) ? parsed : (parsed && parsed.menu);
      if (!Array.isArray(arr)) throw new Error('expected a "menu" array');
      data = normalize(parsed); render(); autosaveNow(); validate();
      setStatus('Imported ' + f.name);
    } catch (err) {
      alert('That file is not a valid menu.json (' + err.message + ').');
    } finally { e.target.value = ''; }
  };
  r.readAsText(f);
}

/* ---------- optional on-device PIN (soft lock, clearly labelled) ---------- */
async function hashPin(pin) {
  const s = 'aramos-pin:' + pin;
  if (globalThis.crypto && crypto.subtle && crypto.subtle.digest) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return 'f' + h.toString(16);
}
function injectPinButton() {
  const btn = document.createElement('button');
  btn.className = 'btn btn--ghost'; btn.id = 'btn-pin'; btn.type = 'button';
  btn.title = 'Set or change the on-device PIN (soft lock)';
  btn.innerHTML = '<i class="fa-solid fa-lock"></i>';
  btn.addEventListener('click', setPin);
  const actions = $('.adm-actions'); if (actions) actions.prepend(btn);
}
async function setPin() {
  const v = (typeof window.prompt === 'function')
    ? window.prompt('Set an editor PIN for THIS device (a soft lock, not internet security).\nLeave blank to remove it:')
    : null;
  if (v === null) return;
  if (v.trim() === '') { safeRemove(PIN_KEY); alert('On-device PIN removed.'); return; }
  if (safeSet(PIN_KEY, await hashPin(v.trim())))
    alert('On-device PIN set. You’ll be asked for it next time you open the editor on this device.');
  else alert('Could not save the PIN (browser storage is blocked here).');
}
async function maybeLock() {
  const stored = safeGet(PIN_KEY);
  if (!stored) return;
  return new Promise(resolve => {
    const lock = $('#lock'), pin = $('#lock-pin'), go = $('#lock-go'), err = $('#lock-err');
    lock.classList.add('is-shown');
    setTimeout(() => pin.focus(), 50);
    const attempt = async () => {
      if (await hashPin(pin.value) === stored) { lock.classList.remove('is-shown'); resolve(); }
      else { err.textContent = 'Wrong PIN.'; pin.value = ''; pin.focus(); }
    };
    go.addEventListener('click', attempt);
    pin.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  });
}
