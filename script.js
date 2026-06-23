/* =================================================================
   ARAMOS — menu engine
   Loads config.json (branding/theme/behaviour) + menu.json (content),
   then renders a bilingual, searchable, scroll-spy menu.
   No build step, no dependencies.
   ================================================================= */

const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const root = document.documentElement;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMOOTH = REDUCED ? 'auto' : 'smooth';

let CFG, MENU, LANG, observer, lastActive = null;
let B, basketOn = true, STORAGE_KEY, DRAFT_KEY, PREVIEW = false;
const BASKET = new Map();      // key -> { key, name, price, qty }
let ITEMS = new Map();         // key -> { name, price }  (lookup for the menu)
let sheetOpen = false, lastFocus = null;

/* ---------- spiral motif (drawn from the Aramos logo mark) ---------- */
function spiralSVG(turns = 2.7, pts = 170) {
  const c = 50, maxR = 43;
  let d = '';
  for (let i = 0; i <= pts; i++) {
    const t = i / pts;
    const a = t * turns * Math.PI * 2;
    const r = maxR * t;
    const x = (c + r * Math.cos(a)).toFixed(2);
    const y = (c + r * Math.sin(a)).toFixed(2);
    d += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
  }
  return `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor"
    stroke-width="5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="${d.trim()}"/></svg>`;
}
function paintSpirals(scope = document) {
  const svg = spiralSVG();
  $$('[data-spiral]', scope).forEach(n => { if (!n.children.length) n.innerHTML = svg; });
}

/* ---------- helpers ---------- */
const t = (obj) => (obj && (obj[LANG] ?? obj.en ?? obj.el)) || '';
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

function fmtPrice(p) {
  const n = Number(p);
  if (!isFinite(n) || n <= 0) return { ask: true, text: CFG.brand.marketPriceLabel || '—' };
  const v = n.toFixed(2);
  const cur = CFG.brand.currency || '';
  return { ask: false, text: CFG.brand.currencyPosition === 'before' ? cur + v : v + cur };
}

function pickLanguage() {
  const codes = CFG.languages.map(l => l.code);
  if (CFG.autoDetectLanguage) {
    for (const nav of (navigator.languages || [navigator.language || ''])) {
      const hit = codes.find(c => nav.toLowerCase().startsWith(c));
      if (hit) return hit;
    }
  }
  return codes.includes(CFG.defaultLanguage) ? CFG.defaultLanguage : codes[0];
}

/* ---------- theme ---------- */
function applyTheme(theme = {}) {
  Object.entries(theme).forEach(([k, v]) => root.style.setProperty('--' + k, v));
}

/* ---------- boot ---------- */
boot();
async function boot() {
  try {
    CFG = await fetch('./config.json').then(r => r.json());
    applyTheme(CFG.themes);
    basketOn = CFG.features?.basket !== false;
    B = CFG.basket || BASKET_TEXT;
    STORAGE_KEY = 'menu.basket.' + slug(CFG.brand?.name || 'venue');
    DRAFT_KEY = 'menu.draft.' + slug(CFG.brand?.name || 'venue');
    PREVIEW = /(?:^|[#&])preview\b/.test(location.hash || '');
    LANG = pickLanguage();
    paintSpirals();
    buildChrome();

    MENU = (await loadMenuData()).menu;
    assignKeys();
    loadBasket();
    render();

    initSearch();
    initBackToTop();
    initBasket();
    window.addEventListener('resize', debounce(() => { measureBar(); buildObserver(); }, 150));
  } catch (err) {
    console.error(err);
    $('#menu').innerHTML =
      `<p style="text-align:center;padding:60px 20px;color:var(--muted)">
         The menu could not be loaded. Please refresh.</p>`;
  }
}

/* ---------- chrome: hero, brand, language, notice, social, footer ---------- */
function buildChrome() {
  const b = CFG.brand;
  document.title = b.tagline ? `${b.name} — ${b.tagline}` : b.name;
  root.lang = LANG;

  // hero
  const logo = $('#hero-logo'), wm = $('#hero-wordmark'), tag = $('#hero-tagline');
  if (b.logo) { logo.src = b.logo; logo.alt = `${b.name}${b.tagline ? ' — ' + b.tagline : ''}`; logo.hidden = false; }
  if (b.showWordmark || !b.logo) {
    wm.textContent = b.name; wm.hidden = false;
    if (b.tagline) { tag.textContent = b.tagline; tag.hidden = false; }
  }
  $('#brandmini-name').textContent = b.name;

  // language toggle (label = the language you'll switch to)
  const btn = $('#lang-toggle');
  if (CFG.languages.length < 2) { btn.style.display = 'none'; }
  else {
    btn.textContent = nextLang().label;
    btn.addEventListener('click', () => {
      LANG = nextLang().code;
      root.lang = LANG;
      btn.textContent = nextLang().label;
      applyLangTexts();
      render();
      if (currentQuery()) runSearch(currentQuery());
      if (basketOn) { updateBar(); if (sheetOpen) renderSheet(); }
    });
  }

  // feature flags
  if (CFG.features?.search === false) $('#search').style.display = 'none';
  if (CFG.features?.categoryNav === false) $('#catnav').style.display = 'none';

  // social
  const ICON = {
    instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook-f',
    map: 'fa-solid fa-location-dot', tripadvisor: 'fa-brands fa-tripadvisor',
    whatsapp: 'fa-brands fa-whatsapp', x: 'fa-brands fa-x-twitter',
    tiktok: 'fa-brands fa-tiktok', phone: 'fa-solid fa-phone'
  };
  $('#social').innerHTML = (CFG.social || []).map(s =>
    `<a class="social-icon" data-net="${s.net}" href="${s.url}" target="_blank"
        rel="noopener" aria-label="${s.net}"><i class="${ICON[s.net] || 'fa-solid fa-link'}"></i></a>`
  ).join('');

  $('#copyright').textContent = `© ${new Date().getFullYear()} ${b.name}`;
  setupNav();
  applyLangTexts();
}

/* one-time: smooth scroll to a category when its pill is tapped */
function setupNav() {
  $('#catnav').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    e.preventDefault();
    const sec = document.getElementById('cat-' + pill.dataset.cat);
    if (sec) sec.scrollIntoView({ behavior: SMOOTH, block: 'start' });
  });
}

function nextLang() {
  const i = CFG.languages.findIndex(l => l.code === LANG);
  return CFG.languages[(i + 1) % CFG.languages.length];
}

/* language-dependent static strings */
function applyLangTexts() {
  $('#notice-text').textContent = t(CFG.notice);
  const sp = $('#search-input'); if (sp) sp.placeholder = t(CFG.searchPlaceholder);
  const es = CFG.emptyState?.[LANG] || CFG.emptyState?.en || {};
  $('#empty-title').textContent = es.title || '';
  $('#empty-text').textContent = es.text || '';
  const tagEl = $('#hero-tagline'); if (!tagEl.hidden) tagEl.textContent = CFG.brand.tagline;
}

/* ---------- render menu + category nav ---------- */
function render() {
  const nav = $('#catnav');
  const menu = $('#menu');
  nav.innerHTML = '';
  menu.innerHTML = '';

  MENU.forEach(cat => {
    // pill
    const pill = document.createElement('a');
    pill.className = 'pill';
    pill.href = '#cat-' + cat.id;
    pill.dataset.cat = cat.id;
    pill.textContent = t(cat.name);
    nav.appendChild(pill);

    // section
    const sec = document.createElement('section');
    sec.className = 'category';
    sec.id = 'cat-' + cat.id;

    const head = document.createElement('div');
    head.className = 'category__head';
    head.innerHTML =
      `<span class="category__spiral" data-spiral></span>
       <h2 class="category__title">${escapeHTML(t(cat.name))}</h2>`;
    sec.appendChild(head);

    const ul = document.createElement('ul');
    (cat.items || []).forEach(item => ul.appendChild(renderItem(item)));
    sec.appendChild(ul);
    menu.appendChild(sec);
  });

  paintSpirals(menu);
  paintSpirals(nav);

  measureBar();
  buildObserver();
  lastActive = null;
  setActivePill(MENU[0] && 'cat-' + MENU[0].id);
}

function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'item';
  li.dataset.search = norm(t(item.name) + ' ' + t(item.description));

  const star = item.featured ? `<i class="fa-solid fa-star item__star" aria-hidden="true"></i>` : '';
  let tags = '';
  if (Array.isArray(item.tags) && item.tags.length) {
    tags = `<div class="item__tags">` +
      item.tags.map(tg => `<span class="tag">${escapeHTML(t(tg))}</span>`).join('') +
      `</div>`;
  }
  const desc = item.description
    ? `<div class="item__desc">${escapeHTML(t(item.description))}</div>` : '';

  const p = fmtPrice(item.price);
  const key = item._key || '';
  if (key) li.dataset.key = key;
  const add = basketOn
    ? `<div class="item__add" data-key="${escapeHTML(key)}">${controlHTML(key)}</div>`
    : '';

  li.innerHTML =
    `<div class="item__main">
       <div class="item__name">${star}${escapeHTML(t(item.name))}</div>
       ${desc}${tags}
     </div>
     <div class="item__price${p.ask ? ' item__price--ask' : ''}">${p.text}</div>
     ${add}`;
  return li;
}

/* ---------- scroll-spy ---------- */
function buildObserver() {
  if (observer) observer.disconnect();
  const barH = measureBar();
  observer = new IntersectionObserver(onIntersect, {
    rootMargin: `-${barH + 8}px 0px -68% 0px`,
    threshold: 0
  });
  $$('.category', $('#menu')).forEach(sec => observer.observe(sec));
}
const visible = new Map();
function onIntersect(entries) {
  entries.forEach(e => visible.set(e.target.id, e.isIntersecting));
  const order = $$('.category', $('#menu'));
  const active = order.find(sec => visible.get(sec.id));
  if (active) setActivePill(active.id);
}
function setActivePill(id) {
  if (!id || id === lastActive) return;
  lastActive = id;
  const nav = $('#catnav');
  let target = null;
  $$('.pill', nav).forEach(p => {
    const on = ('cat-' + p.dataset.cat) === id;
    p.classList.toggle('is-active', on);
    if (on) target = p;
  });
  if (target) {
    const left = target.offsetLeft - nav.clientWidth / 2 + target.clientWidth / 2;
    nav.scrollTo({ left, behavior: SMOOTH });
  }
}

/* ---------- search ---------- */
function initSearch() {
  if (CFG.features?.search === false) return;
  const input = $('#search-input');
  const clear = $('#search-clear');
  const wrap = $('#search');
  input.addEventListener('input', () => {
    wrap.classList.toggle('is-filled', input.value.length > 0);
    runSearch(input.value);
  });
  clear.addEventListener('click', () => {
    input.value = '';
    wrap.classList.remove('is-filled');
    runSearch('');
    input.focus();
  });
}
const currentQuery = () => ($('#search-input') ? $('#search-input').value : '');
function runSearch(raw) {
  const q = norm(raw.trim());
  const sections = $$('.category', $('#menu'));
  let total = 0;

  sections.forEach(sec => {
    let shown = 0;
    $$('.item', sec).forEach(li => {
      const match = !q || li.dataset.search.includes(q);
      li.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    const hide = q && shown === 0;
    sec.classList.toggle('is-hidden', hide);
    const pill = $(`.pill[data-cat="${cssAttr(sec.id.replace(/^cat-/, ''))}"]`, $('#catnav'));
    if (pill) pill.classList.toggle('is-hidden', hide);
    total += shown;
  });

  $('#empty').classList.toggle('is-shown', q && total === 0);
}

/* ---------- back to top ---------- */
function initBackToTop() {
  const btn = $('#totop');
  if (CFG.features?.backToTop === false) { btn.style.display = 'none'; return; }
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-shown', window.scrollY > 520);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: SMOOTH }));
}

/* ---------- misc ---------- */
function measureBar() {
  const h = Math.round($('.bar').getBoundingClientRect().height);
  root.style.setProperty('--bar-h', h + 'px');
  return h;
}
function debounce(fn, ms) { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; }
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cssAttr(s) { return String(s).replace(/"/g, '\\"'); }

/* ---------- menu source (supports an owner-only draft preview) ----------
   The published menu.json is always the default. Only when the URL carries
   #preview AND a saved draft exists do we render that draft instead — so
   customers (who never use #preview) can't see unpublished edits. */
async function loadMenuData() {
  if (PREVIEW) {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) { showPreviewRibbon(); return { menu: JSON.parse(draft) }; }
    } catch (_) { /* fall through to the published file */ }
  }
  return fetch('./menu.json').then(r => r.json());
}
function showPreviewRibbon() {
  if (document.getElementById('preview-ribbon')) return;
  const r = document.createElement('div');
  r.id = 'preview-ribbon';
  r.textContent = LANG === 'el' ? 'ΠΡΟΕΠΙΣΚΟΠΗΣΗ — μη δημοσιευμένο πρόχειρο' : 'PREVIEW — unpublished draft';
  document.body.appendChild(r);
}

/* =================================================================
   BASKET — a tap-to-add order summary the diner can show to staff.
   Toggle with features.basket; all strings live in config.basket.
   No payment backend — it tallies a selection and a total only.
   Persists per venue via localStorage, with a safe in-memory
   fallback when storage is unavailable (e.g. a preview sandbox).
   ================================================================= */

/* fallback strings, used only if config.json omits a "basket" block */
const BASKET_TEXT = {
  title:      { en: 'Your order',  el: 'Η παραγγελία σου' },
  open:       { en: 'View order',  el: 'Δες την παραγγελία' },
  empty:      { en: 'Your order is empty. Tap + on any item to add it.',
                el: 'Η παραγγελία σου είναι άδεια. Πάτησε + σε ένα προϊόν για να το προσθέσεις.' },
  total:      { en: 'Total', el: 'Σύνολο' },
  clear:      { en: 'Clear', el: 'Καθαρισμός' },
  note:       { en: 'This is your selection to show our staff — not a paid order.',
                el: 'Αυτή είναι η επιλογή σου για να τη δείξεις στο προσωπικό — δεν είναι πληρωμένη παραγγελία.' },
  marketNote: { en: 'plus market-price items', el: 'συν προϊόντα σε τιμή ημέρας' },
  itemsOne:   { en: '{n} item',  el: '{n} προϊόν' },
  itemsMany:  { en: '{n} items', el: '{n} προϊόντα' },
  add:        { en: 'Add',    el: 'Προσθήκη' },
  remove:     { en: 'Remove', el: 'Αφαίρεση' }
};

const slug = (s) => String(s).toLowerCase().normalize('NFD')
  .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'venue';

/* a stable, attribute-safe key per item (category + position) */
function assignKeys() {
  ITEMS = new Map();
  MENU.forEach(cat => (cat.items || []).forEach((it, i) => {
    const key = cat.id + '#' + i;
    it._key = key;
    ITEMS.set(key, { name: it.name, price: Number(it.price) || 0 });
  }));
}

function loadBasket() {
  BASKET.clear();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    JSON.parse(raw).forEach(e => {
      if (e && e.key) BASKET.set(e.key, {
        key: e.key,
        name: e.name || { en: '', el: '' },
        price: Number(e.price) || 0,
        qty: Math.max(1, parseInt(e.qty, 10) || 1)
      });
    });
  } catch (_) { /* storage unavailable — basket lives in memory only */ }
}
function saveBasket() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...BASKET.values()])); }
  catch (_) { /* ignore */ }
}

/* money + text helpers (respect currency + currencyPosition) */
function fmtMoney(n) {
  const v = (Number(n) || 0).toFixed(2);
  const cur = CFG.brand.currency || '';
  return CFG.brand.currencyPosition === 'before' ? cur + v : v + cur;
}
const ASK = () => CFG.brand.marketPriceLabel || '—';
const txt = (k, n) => {
  const s = t(B[k]) || (BASKET_TEXT[k] ? t(BASKET_TEXT[k]) : '');
  return n == null ? s : s.replace('{n}', n);
};

function totals() {
  let count = 0, subtotal = 0, market = false;
  BASKET.forEach(e => {
    count += e.qty;
    if (e.price > 0) subtotal += e.price * e.qty; else market = true;
  });
  return { count, subtotal, market };
}

/* the +/stepper shown on each menu row and each sheet line */
function controlHTML(key) {
  const cur = BASKET.get(key);
  if (!cur) {
    return `<button class="additem" type="button" data-act="add" aria-label="${escapeHTML(txt('add'))}">` +
           `<i class="fa-solid fa-plus" aria-hidden="true"></i></button>`;
  }
  return stepperHTML(cur.qty);
}
function stepperHTML(qty) {
  const low = qty <= 1;                       // at 1, the minus becomes a remove
  return `<div class="stepper">
      <button class="stepper__btn" type="button" data-act="${low ? 'remove' : 'dec'}" aria-label="${escapeHTML(low ? txt('remove') : '−')}"><i class="fa-solid ${low ? 'fa-trash-can' : 'fa-minus'}" aria-hidden="true"></i></button>
      <span class="stepper__qty">${qty}</span>
      <button class="stepper__btn" type="button" data-act="inc" aria-label="${escapeHTML(txt('add'))}"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
    </div>`;
}

function applyAct(key, act, src) {
  const cur = BASKET.get(key);
  if (act === 'add') {
    if (cur) cur.qty++;
    else if (src) BASKET.set(key, { key, name: src.name, price: Number(src.price) || 0, qty: 1 });
  } else if (act === 'inc' && cur) {
    cur.qty++;
  } else if (act === 'dec' && cur) {
    cur.qty--; if (cur.qty <= 0) BASKET.delete(key);
  } else if (act === 'remove') {
    BASKET.delete(key);
  }
}

function initBasket() {
  if (!basketOn) { const bar = $('#basket-bar'); if (bar) bar.hidden = true; return; }

  $('#basket-bar').addEventListener('click', openSheet);
  $('#basket-close').addEventListener('click', closeSheet);
  $('#sheet-backdrop').addEventListener('click', closeSheet);
  $('#basket-clear').addEventListener('click', () => {
    BASKET.clear(); saveBasket();
    $$('.item__add', $('#menu')).forEach(c => { c.innerHTML = controlHTML(c.dataset.key); });
    renderSheet(); updateBar();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetOpen) closeSheet(); });

  // add / adjust straight from a menu row
  $('#menu').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const li = e.target.closest('.item'); if (!li) return;
    const key = li.dataset.key;
    applyAct(key, btn.dataset.act, ITEMS.get(key));
    const c = li.querySelector('.item__add'); if (c) c.innerHTML = controlHTML(key);
    saveBasket(); updateBar(); if (sheetOpen) renderSheet();
  });

  // adjust from inside the sheet (and mirror back to the menu row)
  $('#basket-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const line = e.target.closest('.line'); if (!line) return;
    const key = line.dataset.key;
    applyAct(key, btn.dataset.act, BASKET.get(key));
    saveBasket(); renderSheet(); updateBar();
    const c = $(`.item[data-key="${cssAttr(key)}"] .item__add`, $('#menu'));
    if (c) c.innerHTML = controlHTML(key);
  });

  updateBar();
}

function updateBar() {
  if (!basketOn) return;
  const { count, subtotal, market } = totals();
  $('#basket-count').textContent = count;
  $('#basket-open-label').textContent = txt('open');
  $('#basket-bar-total').textContent =
    subtotal > 0 ? fmtMoney(subtotal) + (market ? ' +' : '')
                 : (market ? ASK() : fmtMoney(0));
  showBar(count > 0);
}
function showBar(show) {
  const bar = $('#basket-bar');
  if (show) {
    bar.hidden = false;
    requestAnimationFrame(() => bar.classList.add('is-shown'));
    document.body.classList.add('has-basket-bar');
  } else {
    bar.classList.remove('is-shown');
    document.body.classList.remove('has-basket-bar');
    clearTimeout(bar._hideT);
    bar._hideT = setTimeout(() => { if (!bar.classList.contains('is-shown')) bar.hidden = true; }, 340);
  }
}

function renderSheet() {
  const list = $('#basket-list'), empty = $('#basket-empty'), foot = $('#basket-foot');
  const entries = [...BASKET.values()];
  const { count, subtotal, market } = totals();

  $('#basket-title').textContent = count
    ? `${txt('title')} · ${txt(count === 1 ? 'itemsOne' : 'itemsMany', count)}`
    : txt('title');

  if (!entries.length) {
    empty.hidden = false; empty.textContent = txt('empty');
    list.hidden = true; list.innerHTML = '';
    foot.hidden = true;
    return;
  }
  empty.hidden = true; list.hidden = false; foot.hidden = false;

  list.innerHTML = entries.map(e => {
    const ask = !(e.price > 0);
    const unit = ask ? ASK() : `${e.qty} × ${fmtMoney(e.price)}`;
    const lineTotal = ask ? ASK() : fmtMoney(e.price * e.qty);
    return `<li class="line" data-key="${escapeHTML(e.key)}">
        <div class="line__main">
          <div class="line__name">${escapeHTML(t(e.name))}</div>
          <div class="line__unit">${escapeHTML(unit)}</div>
        </div>
        ${stepperHTML(e.qty)}
        <div class="line__price${ask ? ' line__price--ask' : ''}">${lineTotal}</div>
      </li>`;
  }).join('');

  $('#basket-total-label').textContent = txt('total');
  $('#basket-total-value').textContent =
    subtotal > 0 ? fmtMoney(subtotal) : (market ? ASK() : fmtMoney(0));
  const mk = $('#basket-market');
  if (market && subtotal > 0) { mk.hidden = false; mk.textContent = txt('marketNote'); }
  else mk.hidden = true;
  $('#basket-clear').textContent = txt('clear');
  $('#basket-note').textContent = txt('note');
}

function openSheet() {
  if (!basketOn) return;
  renderSheet();
  lastFocus = document.activeElement;
  $('#sheet-backdrop').hidden = false;
  $('#basket').hidden = false;
  requestAnimationFrame(() => {
    $('#sheet-backdrop').classList.add('is-shown');
    $('#basket').classList.add('is-shown');
  });
  document.body.classList.add('sheet-open');
  sheetOpen = true;
  $('#basket-close').focus();
}
function closeSheet() {
  $('#basket').classList.remove('is-shown');
  $('#sheet-backdrop').classList.remove('is-shown');
  document.body.classList.remove('sheet-open');
  sheetOpen = false;
  setTimeout(() => { $('#basket').hidden = true; $('#sheet-backdrop').hidden = true; }, 340);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
