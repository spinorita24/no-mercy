/* No Mercy — UI helpers: storage, escaping, widgets, sound, wake lock, charts. */
(function (G) {
'use strict';
const U = {};
G.NM_UI = U;

// ---------- Escaping and formatting ----------
U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
U.attr = U.esc;
U.kg = w => (w == null || w === '' ? '' : String(Math.round(Number(w) * 100) / 100));
U.mmss = secs => { secs = Math.max(0, Math.round(secs)); const m = Math.floor(secs / 60), s = secs % 60; return `${m}:${String(s).padStart(2, '0')}`; };
U.pct = v => `${Math.round(v)}%`;
U.plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- Storage: IndexedDB with a localStorage fallback ----------
const DB = 'no-mercy', STORE = 'kv', KEY = 'state';
function idb() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in G)) return rej(new Error('no idb'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbGet(db) {
  return new Promise((res, rej) => { const t = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); });
}
// Two copies: localStorage is written instantly (survives closing the app mid-save); IndexedDB has room for years of logs.
// Each save carries a sequence number, and loading takes whichever copy is newer.
U.load = async () => {
  let a = null, b = null;
  try { const v = await idbGet(await idb()); if (v) a = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { a = null; }
  try { const s = localStorage.getItem('nm-state'); if (s) b = JSON.parse(s); } catch (e) { b = null; }
  if (a && b) return (b.saveSeq || 0) > (a.saveSeq || 0) ? b : a;
  return a || b;
};
U.save = async state => {
  state.saveSeq = (state.saveSeq || 0) + 1;
  const data = JSON.stringify(state, (k, v) => (k === '_derived' ? undefined : v));
  let ok = false;
  try { localStorage.setItem('nm-state', data); ok = true; } catch (e) { /* full or private mode: IndexedDB still has it */ }
  try {
    const db = await idb();
    await new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(data, KEY); t.oncomplete = res; t.onerror = () => rej(t.error); });
    ok = true;
  } catch (e) { /* fall back to localStorage only */ }
  return ok;
};
U.persist = async () => { try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ignore */ } return false; };

// ---------- Widgets ----------
U.stepper = (bind, value, step, opts) => {
  opts = opts || {};
  return `<div class="stepper">
    <button type="button" data-act="step" data-bind="${bind}" data-d="${-step}" aria-label="Minus ${step}">−</button>
    <div><input type="number" inputmode="decimal" step="any" data-bind="${bind}" value="${value == null ? '' : U.kg(value)}" placeholder="${opts.ph || '–'}" aria-label="${U.attr(opts.label || '')}">${opts.unit ? `<span class="u">${U.esc(opts.unit)}</span>` : ''}</div>
    <button type="button" data-act="step" data-bind="${bind}" data-d="${step}" aria-label="Plus ${step}">+</button>
  </div>`;
};
U.switch = (act, on, extra) => `<button type="button" class="switch ${on ? 'on' : ''}" data-act="${act}" ${extra || ''} role="switch" aria-checked="${on ? 'true' : 'false'}"></button>`;
U.badge = out => {
  const map = { beat: ['beat', 'Beat'], edge: ['edge', 'Edge'], miss: ['miss', 'Miss'], 'miss-hard': ['neutral', 'Miss · no change'], base: ['base', 'Baseline'], back: ['neutral', 'Back'], heavy: ['neutral', 'Too heavy'], reset: ['neutral', 'Reset'], partial: ['neutral', 'Partial'] };
  const [c, t] = map[out] || ['neutral', out];
  return `<span class="badge ${c}">${t}</span>`;
};

// ---------- Toast ----------
let toastT = null;
U.toast = msg => {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), 2600);
};

// ---------- Sound (Web Audio; unlocked on first tap) ----------
let actx = null;
U.unlockAudio = () => {
  try {
    if (!actx) actx = new (G.AudioContext || G.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { /* no audio */ }
};
U.beep = (n, freq) => {
  if (!actx) return;
  n = n || 1; freq = freq || 880;
  try {
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      const t0 = actx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.25);
    }
  } catch (e) { /* ignore */ }
  try { if (navigator.vibrate) navigator.vibrate(n > 1 ? [200, 100, 200] : 200); } catch (e) { /* ignore */ }
};

// ---------- Wake lock (keeps the screen on during a session where supported) ----------
let lock = null;
U.keepAwake = async on => {
  try {
    if (on && 'wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
    if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { lock = null; }
};

// ---------- Download / share a file ----------
U.shareFile = async (name, text, mime) => {
  const blob = new Blob([text], { type: mime || 'application/json' });
  try {
    // Some browsers only share plain-text files; the .json name is kept either way
    for (const type of [mime || 'application/json', 'text/plain']) {
      const file = new File([text], name, { type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return 'shared'; }
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
};

// ---------- Icons ----------
const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
U.icon = {
  today: `<svg viewBox="0 0 24 24" ${P}><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>`,
  history: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>`,
  progress: `<svg viewBox="0 0 24 24" ${P}><path d="M3 20h18M5 16l4-5 4 3 6-8"/></svg>`,
  body: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M8 22l4-8 4 8M5.5 10l6.5-1.5L18.5 10"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" ${P}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>`
};

// ---------- Line chart (SVG) ----------
U.lineChart = (points, opts) => {
  opts = opts || {};
  const W = 600, H = 220, padL = 44, padR = 14, padT = 16, padB = 30;
  if (!points.length) return '<div class="empty small">No data yet.</div>';
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 1; x1 += 1; }
  // Nice round gridlines: pick a step so 3-5 lines cover the data
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 4) { const mid = (y0 + y1) / 2; y0 = mid - 2; y1 = mid + 2; }
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500];
  const step = steps.find(s => (y1 - y0) / s <= 4) || 1000;
  y0 = Math.max(0, Math.floor(y0 / step) * step); y1 = Math.ceil(y1 / step) * step;
  if (y1 === y0) y1 = y0 + step;
  const X = x => padL + (x - x0) / (x1 - x0) * (W - padL - padR);
  const Y = y => padT + (1 - (y - y0) / (y1 - y0)) * (H - padT - padB);
  let grid = '';
  for (let v = y0; v <= y1 + 1e-9; v += step) {
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--faint)">${Math.round(v * 10) / 10}</text>`;
  }
  const lab = opts.xLabel || (x => x);
  const xt = [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].filter((p, i, a) => a.indexOf(p) === i);
  for (const p of xt) grid += `<text x="${X(p.x)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--faint)">${U.esc(lab(p.x))}</text>`;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
  const colors = { beat: 'var(--good)', edge: 'var(--warn)', miss: 'var(--bad)' };
  const dots = points.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="5" fill="${colors[p.c] || 'var(--info)'}" stroke="var(--surface)" stroke-width="2"><title>${U.esc(p.t || '')}</title></circle>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.attr(opts.label || 'chart')}">${grid}<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${dots}</svg>`;
};
})(typeof window !== 'undefined' ? window : globalThis);
