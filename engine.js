/* No Mercy — planner engine. Fatigue model, logbook, targets, outcomes and the daily planner.
   Pure functions over the saved state; no DOM. Mirrors the rules in the approved training-system doc. */
(function (G) {
'use strict';
const L = G.NM_LIB;
const E = {};
G.NM_ENGINE = E;

// ===========================================================================
// Utilities
// ===========================================================================
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const clone = o => JSON.parse(JSON.stringify(o));
const r1 = v => Math.round(v * 10) / 10;
E.clone = clone;
E.dn = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
E.ds = n => new Date(n * DAY).toISOString().slice(0, 10);
E.addDays = (s, k) => E.ds(E.dn(s) + k);
E.localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
let debugNow = null;
E.setNow = ms => { debugNow = ms; };
E.now = () => (debugNow != null ? debugNow : Date.now());
E.today = () => E.localDate(new Date(E.now()));
E.hourNow = () => { const d = new Date(E.now()); return d.getHours() + d.getMinutes() / 60; };
E.dow = s => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(E.dn(s) * DAY).getUTCDay()];
E.fmtDate = s => { const d = new Date(E.dn(s) * DAY); return `${E.dow(s)} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };
const roundTo = (w, step) => { step = step || 2.5; return Math.round(Math.round(w / step) * step * 100) / 100; };
E.roundTo = roundTo;
const uniq = a => [...new Set(a)];
const pct = v => Math.round(v) + '%';
// Percent next to a line: never let rounding hide which side of the line a value is on (30.4 vs a 30 line shows 30.4%)
const pctAt = (v, line) => {
  if (v > line && Math.round(v) <= line) return (Math.ceil(v * 10) / 10) + '%';
  if (v <= line && Math.round(v) > line) return (Math.floor(v * 10) / 10) + '%';
  return Math.round(v) + '%';
};
E.pctAt = pctAt;
E.kg = w => (Math.round(w * 100) / 100).toString();

// ===========================================================================
// Settings and library (with your edits applied)
// ===========================================================================
function deepMerge(base, over) {
  if (over == null || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const k of Object.keys(over)) out[k] = (base && typeof base[k] === 'object' && !Array.isArray(base[k])) ? deepMerge(base[k], over[k]) : over[k];
  return out;
}
E.settings = state => deepMerge(L.DEFAULTS, state.settings || {});
E.getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

E.ex = (state, id) => {
  const lib = state.library || {};
  const base = (lib.custom && lib.custom[id]) || L.EXERCISES[id];
  if (!base) return null;
  const ov = lib.overrides && lib.overrides[id];
  return ov ? Object.assign({}, base, ov) : base;
};
E.allExerciseIds = state => uniq([...Object.keys(L.EXERCISES), ...Object.keys((state.library && state.library.custom) || {})]);
E.pools = state => (state.library && state.library.pools) || L.POOLS;
E.areas = state => (state.library && state.library.areas) || L.AREAS;
E.sports = state => deepMerge(L.SPORTS, (state.library && state.library.sports) || {});
E.equipOK = (state, x) => (x.e || []).every(e => !!(state.equipment || {})[e]);
E.disabled = (state, id) => !!(state.library && state.library.overrides && state.library.overrides[id] && state.library.overrides[id].off);
E.resolve = (state, id, depth) => {
  depth = depth || 0;
  if (!id || depth > 6) return null;
  const x = E.ex(state, id);
  if (!x) return null;
  if (E.equipOK(state, x) && !E.disabled(state, id)) return id;
  return E.resolve(state, x.alt, depth + 1);
};
E.tweakedJoints = state => uniq(((state.flags && state.flags.tweaks) || []).map(t => t.joint));
E.isTweaked = (state, x) => { const tj = E.tweakedJoints(state); return (x.j || []).some(j => tj.includes(j)); };
E.groupOf = a => Object.keys(L.GROUPS).find(g => L.GROUPS[g].includes(a));
E.isAnchor = id => Object.values(L.GROUPS).some(l => l.includes(id));
E.muscleName = m => (L.MUSCLE[m] ? L.MUSCLE[m].name : m);
E.blockDef = (n, state) => {
  const base = L.BLOCKS[n] || L.BLOCKS[1];
  const ov = state && state.library && state.library.blocks && state.library.blocks[n];
  return ov ? deepMerge(base, ov) : base;
};
E.nextBlock = (state, n) => {
  const order = (E.settings(state).blockOrder || [1, 2, 3, 4]).filter(b => L.BLOCKS[b]);
  const i = order.indexOf(n);
  return order.length ? order[(i + 1) % order.length] : (n % 4) + 1;
};
// Per-exercise rep range and tempo override the global ones
E.liftSettings = (state, x) => {
  const st = E.settings(state);
  if (!x) return st;
  const o = {};
  if (x.repLow != null && x.repLow !== '') o.repLow = +x.repLow;
  if (x.repHigh != null && x.repHigh !== '') o.repHigh = +x.repHigh;
  if (x.tempo) o.tempo = x.tempo;
  return Object.keys(o).length ? Object.assign({}, st, o) : st;
};
// Where you train on a given day (a trip overrides the Today switch)
E.locationOn = (state, D) => {
  const a = state.flags && state.flags.away;
  if (a && D >= a.from && D <= a.until) return a.location || 'bodyweight';
  return (state.flags && state.flags.location) || 'gym';
};

// ===========================================================================
// New state
// ===========================================================================
E.newState = () => ({
  app: 'no-mercy', version: 1, rev: 0,
  createdAt: new Date(E.now()).toISOString(),
  startDate: null,
  settings: {},
  equipment: Object.fromEntries(L.EQUIPMENT.map(e => [e.id, e.def])),
  library: { overrides: {}, custom: {}, pools: null, areas: null, sports: {}, blocks: {} },
  profile: { bodyweight: 75, height: 183, age: 20 },
  log: { sessions: [], games: [], checkins: [] },
  flags: { tweaks: [], sick: null, sickHistory: [], location: 'gym', away: null },
  block: { n: 1, start: null, weekOff: null, history: [] },
  active: null, today: null
});
E.migrate = s => {
  const n = E.newState();
  for (const k of Object.keys(n)) if (s[k] === undefined) s[k] = n[k];
  for (const k of Object.keys(n.equipment)) if (s.equipment[k] === undefined) s.equipment[k] = n.equipment[k];
  for (const k of Object.keys(n.flags)) if (s.flags[k] === undefined) s.flags[k] = n.flags[k];
  for (const k of Object.keys(n.library)) if (s.library[k] === undefined) s.library[k] = n.library[k];
  for (const k of Object.keys(n.log)) if (s.log[k] === undefined) s.log[k] = n.log[k];
  return s;
};

// ===========================================================================
// Muscle loads
// ===========================================================================
function addTo(acc, load, f) { f = f == null ? 1 : f; for (const k in load) acc[k] = (acc[k] || 0) + load[k] * f; return acc; }
E.liftLoad = (state, x, sets, finish) => {
  const st = E.settings(state).load;
  sets = sets == null ? 2 : sets;
  const out = {};
  for (const m of x.m) out[m] = (out[m] || 0) + st.main * sets + (finish ? st.finish : 0);
  for (const m of x.h) out[m] = (out[m] || 0) + st.help * sets;
  for (const m of x.n || []) out[m] = (out[m] || 0) + st.minor * sets;
  return out;
};
E.holdLoad = (state, x, holds) => {
  const st = E.settings(state).load;
  holds = holds == null ? 2 : holds;
  const out = {};
  for (const m of x.m) out[m] = (out[m] || 0) + st.holdMain * holds;
  for (const m of x.h) out[m] = (out[m] || 0) + st.holdHelp * holds;
  return out;
};
E.exLoad = (state, x, n) => (x.k === 'hold' || x.k === 'carry') ? E.holdLoad(state, x, n) : E.liftLoad(state, x, n, true);
E.walkLoad = mins => { const f = mins / 10; return { calves: 4 * f, soleus: 4 * f, glutes: 3 * f, hamstrings: 2 * f }; };
const FINISH_SET = s => !!(s.finishSet2 || s.finishBoth);

// Load actually done in a logged session (used for the fatigue timeline)
E.sessionLoad = (state, sess) => {
  if (sess.loadOverride) return sess.loadOverride;
  const st = E.settings(state);
  const load = {};
  let condTotal = 0, condDone = 0;
  for (const it of sess.items || []) {
    if (it.skipped) { if (it.cond) condTotal++; continue; }
    if (it.cond) { condTotal++; if (it.done || (it.sets && it.sets.some(z => z && z.done))) condDone++; continue; }
    const x = it.ex ? E.ex(state, it.ex) : null;
    const done = (it.sets || []).filter(z => z && z.done);
    if (x && (x.k === 'lift' || x.k === 'bwlift' || x.k === 'reps') && done.length) {
      const n = Math.min(2, done.length);
      addTo(load, E.liftLoad(state, x, n, n >= 2 && FINISH_SET(st)));
    } else if (x && (x.k === 'hold' || x.k === 'carry') && done.length) {
      addTo(load, E.holdLoad(state, x, Math.min(done.length, it.kind === 'vacuum' ? 1 : 2)));
    } else if (it.kind === 'walk' && it.done) {
      addTo(load, E.walkLoad(it.doneMin != null ? it.doneMin : it.min));
    } else if (it.kind === 'piece' && it.done && it.load) {
      addTo(load, it.load);
    }
  }
  if (sess.condLoad && condTotal > 0) addTo(load, sess.condLoad, condDone / condTotal);
  return load;
};
E.sessionCost = (state, sess) => {
  const c = E.settings(state).cost;
  if (sess.type === 'Strength') {
    const anchorsDone = (sess.items || []).filter(it => it.role === 'anchor' && !it.skipped && (it.sets || []).some(z => z && z.done)).length;
    if (!anchorsDone && !(sess.items || []).some(it => !it.skipped && (it.done || (it.sets || []).some(z => z && z.done)))) return 0;
    return anchorsDone >= 3 ? c.strength3 : c.strength2;
  }
  return c[sess.type] || 0;
};
E.gameFactor = g => Math.min(g.minutes / 60, 2) * (g.intensity / 10);
E.gameLoad = (state, g, mult) => {
  const sp = E.sports(state)[g.sport] || E.sports(state).other;
  let base = sp.load || {};
  if (g.sport === 'other' || g.custom) base = g.customLoad || base;
  const f = E.gameFactor(g);
  const out = {};
  const sm = (mult && mult[g.sport]) || {};
  for (const m in base) out[m] = base[m] * f * (sm[m] || 1);
  return out;
};

// ===========================================================================
// Timeline: every session, game and check-in as a fatigue event
// ===========================================================================
E.hl = (state, m) => { const s = E.settings(state).hl; const mm = L.MUSCLE[m]; return mm ? s[mm.hl] : s.med; };
E.timeline = (state, extraSessions, mult) => {
  const events = [];
  const costByDay = {};
  const active = new Set();
  const sessions = (state.log.sessions || []).concat(extraSessions || []);
  for (const s of sessions) {
    const day = E.dn(s.date);
    const load = E.sessionLoad(state, s);
    const cost = s.cost != null ? s.cost : E.sessionCost(state, s);
    if (!cost && !Object.keys(load).length) continue;
    events.push({ t: day * 24 + (s.hour != null ? s.hour : 18), day, load, sore: [], kind: 'session' });
    costByDay[day] = (costByDay[day] || 0) + cost;
    active.add(day);
  }
  for (const g of state.log.games || []) {
    const day = E.dn(g.date);
    const f = E.gameFactor(g);
    events.push({ t: day * 24 + (g.hour != null ? g.hour : 19), day, load: E.gameLoad(state, g, mult), sore: g.sore || [], kind: 'game' });
    costByDay[day] = (costByDay[day] || 0) + E.settings(state).cost.game * f;
    active.add(day);
  }
  for (const c of state.log.checkins || []) {
    const day = E.dn(c.date);
    if ((c.sore || []).length) events.push({ t: day * 24 + 7, day, load: {}, sore: c.sore, kind: 'checkin' });
  }
  events.sort((a, b) => a.t - b.t);
  return { events, costByDay, active };
};
function decay(state, M, hours) { if (hours <= 0) return; for (const k in M) M[k] *= Math.pow(0.5, hours / E.hl(state, k)); }
E.zeroM = () => Object.fromEntries(L.MUSCLES.map(m => [m.id, 0]));
E.fatigueAt = (state, tl, tHours) => {
  const M = E.zeroM();
  let last = tHours - 21 * 24;
  for (const e of tl.events) {
    if (e.t < last) continue;
    if (e.t > tHours) break;
    decay(state, M, e.t - last);
    for (const k in e.load) M[k] = Math.min(100, (M[k] || 0) + e.load[k]);
    for (const k of e.sore || []) M[k] = Math.max(M[k] || 0, 60);
    last = e.t;
  }
  decay(state, M, tHours - last);
  return M;
};
E.meterMorning = (state, tl, day) => {
  const st = E.settings(state);
  let W = 0;
  for (const k in tl.costByDay) { const d = +k; if (d < day && d >= day - 40) W += tl.costByDay[k] * Math.pow(1 - st.drain, day - d); }
  const ci = (state.log.checkins || []).find(c => E.dn(c.date) === day);
  if (ci && ci.sleep != null && ci.sleep < 6) W += 10;
  for (const r of state.flags.sickHistory || []) if (r.end && E.dn(r.end) === day) W = Math.max(W, 50);
  return W;
};

// ===========================================================================
// Derived state: replay the whole log (logbooks, gaps, outcomes, culprits)
// ===========================================================================
const LIFT_KINDS = ['lift', 'bwlift', 'reps'];
E.gapDefaults = (state, key, x) => {
  const g = E.settings(state).gap;
  if (E.isAnchor(key)) {
    const big = key === 'squat' || key === 'deadlift';
    return { start: g.anchorStart, floor: big ? g.bigFloor : g.anchorFloor, ceil: big ? g.bigCeil : g.anchorCeil };
  }
  if (x && x.c === 'area') return { start: g.areaStart, floor: g.areaFloor, ceil: g.areaCeil };
  return { start: g.stapleStart, floor: g.stapleFloor, ceil: g.stapleCeil };
};
function workingSets(it) { return (it.sets || []).filter(z => z && z.done && !z.ramp); }
function weekOffStarts(state) {
  const out = [];
  for (const h of (state.block && state.block.history) || []) if (h.weekOffStart) out.push(E.dn(h.weekOffStart));
  if (state.block && state.block.weekOff) out.push(E.dn(state.block.weekOff.start));
  return out;
}

function maxBreak(days, from, to, resets) {
  // days: sorted session days. Longest gap between consecutive training days in [from, to], skipping weeks off.
  let prev = from, best = 0;
  for (const d of days) {
    if (d <= from) continue;
    if (d > to) break;
    if (!resets.some(r => r > prev && r <= d)) best = Math.max(best, d - prev);
    prev = d;
  }
  if (to > prev && !resets.some(r => r > prev && r <= to)) best = Math.max(best, to - prev);
  return best;
}
E.maxBreak = maxBreak;
E.derive = state => {
  if (state._derived && state._derived.rev === state.rev) return state._derived;
  const st = E.settings(state);
  const D = {
    rev: state.rev, book: {}, lifts: {}, last: {}, results: {}, trims: [], sportMult: {}, sportMiss: {},
    anchorMisses: [], clusterUntil: null, progress: {}, finCount: 0, pieceIdx: 0, walk: null, bridgeLevel: 0, notes: {}
  };
  const resets = weekOffStarts(state);
  const sessions = (state.log.sessions || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.finishedAt || '') < (b.finishedAt || '') ? -1 : 1));
  const tlAll = E.timeline(state, null, null);
  const blockStart = state.block && state.block.start ? E.dn(state.block.start) : null;
  const games = (state.log.games || []).map(g => ({ g, t: E.dn(g.date) * 24 + (g.hour != null ? g.hour : 19), day: E.dn(g.date) }));
  D.sessionDays = uniq(sessions.map(s => E.dn(s.date))).sort((a, b) => a - b);
  D.resets = resets;

  for (const s of sessions) {
    const day = E.dn(s.date);
    const tS = day * 24 + (s.hour != null ? s.hour : 18);
    const res = [];
    let pos = 0;
    if (s.type === 'Strength' && blockStart != null && day >= blockStart) {
      D.finCount++;
      if ((s.items || []).some(it => it.kind === 'piece' && !it.skipped)) D.pieceIdx++;
    }
    if (s.type && s.type !== 'Strength' && (s.items || []).some(it => !it.skipped)) {
      D.last['t:' + s.type] = day;
      for (const a of L.COVERS[s.type] || []) D.last['r:' + a] = day;
    }
    for (const it of s.items || []) {
      if (it.skipped) continue;
      // Walk progression and other non-lift progress
      if (it.kind === 'walk' && it.done) {
        D.walk = { min: it.doneMin != null ? it.doneMin : it.min, speed: it.speed, incline: it.incline, mode: it.mode || 'steady', day };
        if ((it.alt || it.title !== 'Incline walk') && it.value != null) D.progress['p:cardio_alt'] = { value: +it.value, day };
      }
      if (it.kind === 'sprint' && it.pid && +it.time > 0) {
        const pt = D.progress['t:' + it.pid];
        if (!pt || +it.time < pt.best) D.progress['t:' + it.pid] = { best: +it.time, day };
      }
      if (it.kind === 'bridge' && it.level != null) {
        const best = Math.max(0, ...((it.holds || []).map(Number).filter(Boolean)), 0);
        const reps = Math.max(0, ...((it.reps || []).map(Number).filter(Boolean)), 0);
        D.progress['bridge'] = { level: it.level, best, reps, day };
        if (best >= 60 || reps >= 20) D.bridgeLevel = Math.max(D.bridgeLevel, Math.min(5, it.level + 1)); else D.bridgeLevel = Math.max(D.bridgeLevel, it.level);
      }
      if (it.kind === 'circuit' && it.stationReps) for (const sid in it.stationReps) if (it.stationReps[sid] != null) D.progress['st:' + sid] = { value: it.stationReps[sid], day };
      if ((it.kind === 'interval' || it.kind === 'piece' || it.kind === 'sprint' || it.kind === 'swing') && it.value != null && it.pid) {
        const prevP = D.progress['p:' + it.pid];
        const better = prevP ? (it.lowerBetter ? +it.value < prevP.value : +it.value > prevP.value) : false;
        let streak = prevP && better ? (prevP.streak || 0) + 1 : 0;
        let extra = prevP ? prevP.extra || 0 : 0;
        if (it.kind === 'interval' && streak >= 2 && extra < 2) { extra++; streak = 0; }
        D.progress['p:' + it.pid] = { value: +it.value, day, streak, extra };
      }
      if (it.kind === 'drill' && it.did && it.value != null) D.progress['d:' + it.did] = { value: it.value, day };
      if (it.kind === 'vacuum' && it.sets) D.progress['vacuum'] = { holds: it.sets.filter(z => z && z.done).map(z => z.s), day, pos: it.position || 0 };
      if (!it.ex) continue;
      const x = E.ex(state, it.ex);
      if (!x) continue;
      // Last-done marks
      const asAnchor = it.anchor && !it.swapped;
      D.last['x:' + it.ex] = day;
      if (asAnchor) D.last['a:' + it.anchor] = day;
      if (it.area) D.last['r:' + it.area] = day;
      for (const a of L.COVERS[asAnchor ? it.anchor : it.ex] || []) D.last['r:' + a] = day;
      if (it.role === 'area-pool') D.last['p:' + it.ex] = day;
      // Holds / carries progress
      if (x.k === 'hold' || x.k === 'carry') {
        const done = workingSets(it);
        if (done.length) {
          const best = x.k === 'hold' ? Math.max(...done.map(z => z.s || 0)) : Math.max(...done.map(z => z.m || 0));
          const w = Math.max(...done.map(z => z.w || 0));
          D.progress['h:' + it.ex] = { best, w, day, holds: done.map(z => (x.k === 'hold' ? z.s : z.m)) };
        }
        continue;
      }
      if (!LIFT_KINDS.includes(x.k)) continue;
      const done = workingSets(it);
      if (!done.length) continue;
      const key = asAnchor ? it.anchor : it.ex;
      const lst = E.liftSettings(state, x);
      const book = D.book[it.ex] || (D.book[it.ex] = []);
      const prev = book[book.length - 1];
      const ls = D.lifts[key] || (D.lifts[key] = Object.assign({ beats: 0, misses: 0, stalled: false, lastDay: null, comeback: 0 }, { gap: E.gapDefaults(state, key, x).start }));
      // Week off resets gaps
      if (ls.lastDay != null && resets.some(r => r > ls.lastDay && r <= day)) {
        ls.gap = E.gapDefaults(state, key, x).start; ls.beats = 0; ls.misses = 0; ls.stalled = false;
      }
      const sets = done.map(z => ({ w: +z.w || 0, r: +z.r || 0 }));
      const entry = { day, date: s.date, sid: s.id, sets, cal: !!it.cal, pos: pos++, swapped: !!it.swapped };
      // Interpret the entry: single baseline set vs a pair at one weight
      if (sets.length >= 2 && sets[0].w !== sets[1].w) { entry.single = true; entry.w = sets[1].w; entry.b = sets[1].r; }
      else if (sets.length === 1) { entry.single = true; entry.w = sets[0].w; entry.b = sets[0].r; }
      else { entry.w = sets[0].w; entry.reps = [sets[0].r, sets[1].r]; }
      // Outcome
      let out = 'base', why = '';
      const daysSince = prev ? day - prev.day : null;
      if (!prev || it.cal) { out = 'base'; why = prev ? 'Calibration sets a new baseline.' : 'First session sets the logbook.'; }
      else if (entry.single && sets.length === 1) { out = 'partial'; why = 'Only one working set logged.'; }
      else if (entry.single) { out = 'base'; why = 'Weight changed between sets: new baseline.'; }
      else {
        const total = entry.reps[0] + entry.reps[1];
        const refW = prev.w;
        if (entry.w > refW + 1e-9) { out = entry.reps[0] >= lst.repLow ? 'beat' : 'heavy'; why = out === 'beat' ? 'Weight went up and set 1 landed in range.' : 'The jump was too big: back to the old weight next time.'; }
        else if (entry.w < refW - 1e-9) { out = 'reset'; why = 'Lighter than last time: logged as a reset.'; }
        else if (prev.single) {
          const tgt = (prev.b + 1) + Math.max(1, prev.b - 1);
          out = total >= tgt ? 'beat' : total === tgt - 1 ? 'edge' : 'miss';
        } else {
          const ptotal = prev.reps[0] + prev.reps[1];
          const completed = entry.reps[0] >= lst.repHigh && entry.reps[1] >= lst.repHigh && !(prev.reps[0] >= lst.repHigh && prev.reps[1] >= lst.repHigh);
          const delta = total - ptotal;
          out = (delta >= st.beatReps || completed) ? 'beat' : delta >= 1 ? 'edge' : 'miss';
        }
        // Coming back after time off (not a planned week off): misses don't count
        const brk = maxBreak(D.sessionDays, prev.day, day - 1, resets);
        const sinceGap = maxBreak(D.sessionDays.filter(z => z < day), prev.day, day, resets);
        const away = Math.max(brk, sinceGap);
        if (away >= 7) ls.comeback = away >= 14 ? 2 : 1;
        const afterWeekOff = resets.some(r => r > prev.day && r <= day);
        if (out === 'miss' && (ls.comeback > 0 || afterWeekOff)) { out = 'back'; why = afterWeekOff ? 'First session after the week off: a miss doesn\'t change the gap.' : 'First sessions back after time off: misses don\'t count.'; }
        else if (out === 'miss' && (it.swapped || entry.pos > prev.pos || it.repaired)) { out = 'miss-hard'; why = 'Harder setting (later in the session or swapped kit): the gap stays.'; }
        if (ls.comeback > 0) ls.comeback--;
      }
      entry.outcome = out;
      book.push(entry);
      // Gap mechanics
      const gd = E.gapDefaults(state, key, x);
      const interval = ls.lastDay != null ? day - ls.lastDay : null;
      const before = ls.gap;
      const extra = [];
      if (out === 'beat') {
        ls.beats++; ls.misses = 0; ls.stalled = false;
        if (ls.beats >= st.beatsToShrink) { ls.gap = Math.max(gd.floor, ls.gap - 1); ls.beats = 0; if (ls.gap !== before) extra.push(`${st.beatsToShrink} Beats in a row: gap ${before} → ${ls.gap} days.`); }
      } else if (out === 'edge') { ls.beats = 0; ls.misses = 0; }
      else if (out === 'miss') {
        ls.beats = 0; ls.misses++;
        const basis = Math.max(ls.gap, interval || 0);
        ls.gap = Math.min(gd.ceil, basis + (ls.misses === 1 ? st.missAdd : st.missAdd2));
        extra.push(`Gap ${before} → ${ls.gap} days (it had ${interval != null ? interval : '?'}).`);
        if (ls.misses >= 3) { ls.stalled = true; extra.push('Stalled: 3 misses in a row.'); }
        // Culprit check
        const culprit = culpritCheck(state, D, s, it, x, key, tS, sessions, games);
        if (culprit) extra.push(culprit);
        if (E.isAnchor(key)) {
          D.anchorMisses.push({ day, key });
          const recent = D.anchorMisses.filter(z => z.day > day - 7);
          if (uniq(recent.map(z => z.key)).length >= 2) D.clusterUntil = day + 14;
        }
      } else if (out === 'base') { ls.beats = 0; ls.misses = 0; }
      ls.lastDay = day;
      res.push({ ex: it.ex, key, anchor: it.anchor || null, outcome: out, why, extra, sets, gap: ls.gap });
    }
    D.results[s.id] = res;
  }
  // Stall list
  D.stalled = Object.keys(D.lifts).filter(k => E.isAnchor(k) && D.lifts[k].stalled);
  state._derived = D;
  return D;
};

function culpritCheck(state, D, s, it, x, key, tS, sessions, games) {
  // The lift's main and helper muscles; core helpers (abs, obliques) are trained almost daily, so they don't count
  const S = new Set([...x.m, ...x.h.filter(m => m !== 'abs' && m !== 'obliques')]);
  const day = E.dn(s.date);
  const found = [];
  for (const o of sessions) {
    const oDay = E.dn(o.date);
    const oT = oDay * 24 + (o.hour != null ? o.hour : 18);
    if (oT >= tS || oT < tS - 72) continue;
    for (const oi of o.items || []) {
      if (oi.skipped || oi.role === 'anchor' || oi.role === 'warmup') continue;
      if (oi.ex) {
        const ox = E.ex(state, oi.ex);
        if (ox && ox.m.some(m => S.has(m)) && oi.ex !== it.ex) {
          D.trims.push({ item: 'x:' + oi.ex, protects: key, until: day + 20 });
          found.push(ox.name);
        }
      }
      if (oi.kind === 'circuit' && oi.stations) {
        const bad = oi.stations.filter(sid => { const stn = L.SOVIET.stations.find(z => z.id === sid); return stn && stn.m.some(m => S.has(m)); });
        for (const sid of bad) D.trims.push({ item: 's:' + sid, protects: key, until: day + 20 });
        if (bad.length) found.push(`${o.type} circuit stations (${bad.map(b => (L.SOVIET.stations.find(z => z.id === b) || {}).name).join(', ')})`);
      }
      if (oi.kind === 'piece' && oi.load && Object.keys(oi.load).some(m => S.has(m))) {
        D.trims.push({ item: 'f:' + oi.pid, protects: key, until: day + 20 });
        found.push(oi.title || 'finisher');
      }
    }
  }
  for (const { g, t } of games) {
    if (t >= tS || t < tS - 72) continue;
    const ld = E.gameLoad(state, g, null);
    if (!Object.keys(ld).some(m => S.has(m) && ld[m] > 0)) continue;
    const arr = D.sportMiss[g.sport] || (D.sportMiss[g.sport] = []);
    if (tS - t <= 48) arr.push(day);
    found.push(`${(E.sports(state)[g.sport] || {}).name || g.sport} game`);
    if (arr.length >= 2) {
      const mult = D.sportMult[g.sport] || (D.sportMult[g.sport] = {});
      for (const m of S) if (ld[m]) mult[m] = Math.min(2, (mult[m] || 1) * 1.2);
      D.sportMiss[g.sport] = [];
      found.push(`(${(E.sports(state)[g.sport] || {}).name} now counts 20% harder on those muscles)`);
    }
  }
  if (!found.length) return 'Culprit check: nothing that can be cut (staples, add-ons, conditioning) loaded these muscles in the last 72 h, so only the gap grows.';
  const list = uniq(found);
  return `Culprit check: ${list.slice(0, 3).join('; ')}${list.length > 3 ? ` and ${list.length - 3} more` : ''} loaded these muscles in the last 72 h. They're kept away from this lift for the next 2 cycles.`;
}

// ===========================================================================
// Targets
// ===========================================================================
E.stepFor = (state, x) => x.step || E.settings(state).steps.barbell;
E.rampFor = (state, x, w, cal) => {
  if (x.k === 'bwlift') return w > 7.5 ? [{ w: 0, r: 4 }, { w: roundTo(w / 2, 2.5), r: 2 }] : [{ w: 0, r: 3 }];
  if (x.k === 'reps') return [];
  if (cal && x.cal && x.cal.ramp) return x.cal.ramp.map(([ww, rr]) => ({ w: ww, r: rr }));
  if (!w) return [];
  const step = x.e.includes('dumbbells') ? 2.5 : (x.step || 2.5);
  if (x.iso || x.c === 'area') return [{ w: roundTo(w * 0.6, step), r: 5 }];
  return [{ w: roundTo(w * 0.5, step), r: 6 }, { w: roundTo(w * 0.7, step), r: 3 }, { w: roundTo(w * 0.85, step), r: 1 }];
};
// Returns { mode, w, reps:[a,b], stretch, text, note, ramp, cal }
E.target = (state, derived, exId, D, opts) => {
  opts = opts || {};
  const x = E.ex(state, exId);
  if (!x) return { mode: 'none', text: '' };
  const st = E.liftSettings(state, x);
  const book = derived.book[exId] || [];
  const last = book[book.length - 1];
  const day = E.dn(D);
  const unit = x.k === 'bwlift' ? 'added kg' : 'kg';
  const wtxt = w => (x.k === 'bwlift' ? (w > 0 ? `BW + ${E.kg(w)} kg` : 'Bodyweight') : `${E.kg(w)} kg`);
  if (x.k === 'hold' || x.k === 'carry') {
    const p = derived.progress['h:' + exId];
    if (!p) return { mode: 'start', text: x.k === 'hold' ? '2 holds to failure (baseline)' : '2 carries to grip failure (baseline: pick a heavy weight)', hold: true };
    if (x.k === 'hold') {
      const t = p.best + 5;
      return { mode: 'normal', s: t, text: `Beat ${p.best} s: aim ${t} s`, note: p.best >= 60 ? 'Past 60 s: add load or move to the harder version.' : '', hold: true };
    }
    const m = p.best + 5;
    return { mode: 'normal', m, w: p.w, text: `${E.kg(p.w)} kg/hand: beat ${p.best} m, aim ${m} m`, note: p.best >= 60 ? 'Past 60 m: add 2.5 kg per hand.' : '', hold: true };
  }
  if (!last) {
    if (x.cal) {
      const cal = x.cal === true ? {} : x.cal;
      if (cal.bw || x.k === 'bwlift' || x.k === 'reps') return { mode: 'cal', w: 0, cal: true, ramp: E.rampFor(state, x, 0, true), text: x.k === 'reps' ? 'Calibrate: 2 sets to failure' : 'Calibrate at bodyweight: set 1 all-out (aim 4–8)', note: '9+ reps on set 1 → set 2 adds 2.5–5 kg. 13+ → +5 kg.' };
      if (cal.at) return { mode: 'cal', w: cal.at, cal: true, ramp: E.rampFor(state, x, cal.at, true), text: `Calibrate: ramp up, then one all-out set at ~${E.kg(cal.at)} kg (aim 4–8)`, note: 'Set 2\'s weight comes from set 1.' };
      return { mode: 'cal', w: null, cal: true, ramp: [], text: 'Calibrate: ramp up in small jumps, then one all-out set that lands at 4–8 reps', note: 'Pick the weight you think gives about 6 reps. Set 2\'s weight comes from set 1.' };
    }
    const w = x.start != null ? x.start : 0;
    if (x.k === 'reps') return { mode: 'start', w: 0, reps: null, ramp: [], text: 'Baseline: 2 sets to failure', note: 'Count clean reps only.' };
    return { mode: 'start', w, reps: null, ramp: E.rampFor(state, x, w), text: `Baseline: ${wtxt(w)}, 2 sets to failure`, note: 'Slow tempo and the pause may cost a rep or two today. It can\'t count as a miss.' };
  }
  // Rep-only exercises (no load to add): beat last time by a rep a set; past 12 move to a harder version
  if (x.k === 'reps') {
    const prevReps = last.reps || [last.b, Math.max(1, last.b - 1)];
    const reps = [prevReps[0] + 1, prevReps[1] + 1];
    return { mode: 'normal', w: 0, reps, stretch: [reps[0], reps[1] + 1], ramp: [], text: `${reps[0]}, ${reps[1]} reps`, note: `Last time ${prevReps[0]}, ${prevReps[1]}.${Math.min(...prevReps) >= 12 ? ' Past 12 on both sets: move to a harder version.' : ''}` };
  }
  const step = E.stepFor(state, x);
  const since = maxBreak((derived.sessionDays || []).filter(z => z < day), last.day, day, derived.resets || []);
  if (since >= 14 && !opts.ignoreReturn) {
    return { mode: 'return', w: last.w, reps: null, ramp: E.rampFor(state, x, last.w), text: `Back after ${since} days off: ramp to ${wtxt(last.w)}`, note: 'If set 1 lands under 4 reps, drop one step. Misses don\'t count for 2 sessions.' };
  }
  if (since >= 7 && !opts.ignoreReturn && last.reps) {
    return { mode: 'match', w: last.w, reps: last.reps.slice(), ramp: E.rampFor(state, x, last.w), text: `Back after ${since} days off: match ${wtxt(last.w)} × ${last.reps.join(', ')}`, note: 'Misses don\'t count today.' };
  }
  if (last.outcome === 'heavy') {
    const ref = book.slice(0, -1).reverse().find(b => b.w < last.w - 1e-9 && b.reps);
    if (state.equipment && state.equipment.micro_plates && ref && x.k !== 'bwlift') {
      const half = roundTo(ref.w + (last.w - ref.w) / 2, 0.5);
      if (half > ref.w + 1e-9 && half < last.w - 1e-9) return { mode: 'jump', w: half, reps: null, ramp: E.rampFor(state, x, half), text: `${wtxt(half)}: aim ${st.repLow}+ reps on set 1`, note: 'Last jump was too big: half a step with micro plates this time.' };
    }
    const w = ref ? ref.w : roundTo(last.w - step, step);
    const reps = ref ? [Math.min(st.repHigh, ref.reps[0] + 1), Math.min(st.repHigh, ref.reps[1] + 1)] : [6, 5];
    return { mode: 'normal', w, reps, stretch: [reps[0], reps[1] + 1], ramp: E.rampFor(state, x, w), text: `${wtxt(w)} × ${reps.join(', ')}`, note: 'Last jump was too big: back to this weight, one more rep each set.' };
  }
  if (last.single) {
    const reps = [last.b + 1, Math.max(1, last.b - 1)].map(v => Math.min(st.repHigh, v));
    if (last.b >= st.repHigh + 1) {
      const w = roundTo(last.w + step, step);
      return { mode: 'jump', w, reps: null, ramp: E.rampFor(state, x, w), text: `${wtxt(w)}: aim ${st.repLow}+ reps on set 1`, note: 'Up one step.' };
    }
    return { mode: 'normal', w: last.w, reps, stretch: [reps[0], reps[1] + 1], ramp: E.rampFor(state, x, last.w), text: `${wtxt(last.w)} × ${reps.join(', ')}`, note: 'First target after your baseline.' };
  }
  const [a, b] = last.reps;
  if (a >= st.repHigh && b >= st.repHigh) {
    const steps = (a >= st.repHigh + 2 && b >= st.repHigh + 2) ? 2 : 1;   // 10+ on a 4–8 range
    const w = roundTo(last.w + step * steps, step);
    return { mode: 'jump', w, reps: null, ramp: E.rampFor(state, x, w), text: `${wtxt(w)}: aim ${st.repLow}+ reps on set 1`, note: `Both sets hit ${st.repHigh}: up ${steps === 2 ? 'two steps' : 'one step'}. Set 1 at ${st.repLow}+ is a Beat.` };
  }
  const t1 = Math.min(st.repHigh, a + 1);
  const t2 = a >= st.repHigh ? Math.min(st.repHigh, b + 2) : Math.min(st.repHigh, b + 1);
  return { mode: 'normal', w: last.w, reps: [t1, t2], stretch: [t1, t2 + 1], ramp: E.rampFor(state, x, last.w), text: `${wtxt(last.w)} × ${t1}, ${t2}`, note: `Last time ${a}, ${b}. Stretch: ${t1}, ${t2 + 1}.` };
};
// Calibration: weight for set 2 from set 1
E.calSet2 = (state, exId, w1, reps1) => {
  const x = E.ex(state, exId);
  const st = E.liftSettings(state, x);
  const step = E.stepFor(state, x);
  if (x.k === 'bwlift' || x.k === 'reps') {
    if (x.k === 'reps') return { w: 0, note: 'Same again: set 2 to failure.' };
    if (reps1 >= 13) return { w: roundTo(w1 + 5, 2.5), note: '13+ reps: set 2 adds 5 kg.' };
    if (reps1 >= 9) return { w: roundTo(w1 + (reps1 >= 11 ? 5 : 2.5), 2.5), note: '9+ reps: set 2 adds weight.' };
    if (reps1 < st.repLow) return { w: Math.max(0, w1 - 2.5), note: 'Under 4: set 2 goes lighter (or band-assisted).' };
    return { w: w1, note: 'In range: set 2 at the same load.' };
  }
  if (reps1 >= 13) return { w: roundTo(w1 * 1.15, step), note: '13+ reps: set 2 is 15% heavier.' };
  if (reps1 >= 11) return { w: roundTo(w1 * 1.10, step), note: '11–12 reps: set 2 is 10% heavier.' };
  if (reps1 >= 9) return { w: roundTo(Math.max(w1 * 1.05, w1 + step), step), note: '9–10 reps: set 2 is about 5% heavier.' };
  if (reps1 < st.repLow) return { w: roundTo(w1 * 0.9, step), note: 'Under 4 reps: set 2 is 10% lighter.' };
  return { w: w1, note: 'In range: set 2 at the same weight.' };
};
E.restFor = (state, x, role) => {
  const r = E.settings(state).rest;
  if (role === 'anchor') return (x.id === 'squat' || x.id === 'deadlift') ? r.big : r.anchor;
  if (x.c === 'area' || x.k === 'hold' || x.k === 'carry') return r.small;
  if (x.iso) return r.iso;
  return r.staple;
};
E.tempoCue = (state, x) => {
  if (x.k === 'hold') return 'Hold to failure; breathe steadily.';
  if (x.k === 'carry') return 'Walk tall until grip fails.';
  const t = x.tempo || E.settings(state).tempo;
  const dl = x.id === 'deadlift' || x.id === 'rdl' || x.id === 'pendlay' || x.id === 'sumo_dl' || x.id === 'trapbar_high' ? ' Dead stop on the floor every rep.' : '';
  return `Tempo ${t}: ${t.split('-')[0]} s down · ${t.split('-')[1]} s stop in the stretch · up in ~${t.split('-')[2]} s, no momentum.${x.iso ? ' 1 s squeeze at the top.' : ''}${dl}`;
};

// ===========================================================================
// Planning snapshot (a lightweight copy of the state the planner can step forward)
// ===========================================================================
const SEED_TYPE = { Soviet: 1, Fascia: 3, Track: 6 };
E.snapshot = (state, D, extraSessions, knownGames) => {
  const st = E.settings(state);
  const derived = E.derive(state);
  const day = E.dn(D);
  const tl = E.timeline(state, extraSessions, derived.sportMult);
  const S = {
    state, st, derived, day0: E.dn(state.startDate || D),
    M: E.fatigueAt(state, tl, day * 24 + 7),
    W: E.meterMorning(state, tl, day),
    last: Object.assign({}, derived.last),
    gap: {}, streak: 0,
    block: (state.block && state.block.n) || 1,
    finCount: derived.finCount, pieceIdx: derived.pieceIdx,
    walk: E.nextWalk(state, derived),
    tweaked: E.tweakedJoints(state),
    trims: derived.trims.filter(t => t.until >= day),
    restLine: (derived.clusterUntil != null && derived.clusterUntil >= day) ? st.restLineClustered : st.restLine,
    location: E.locationOn(state, D),
    baseLocation: state.flags.location || 'gym',
    awayUntil: state.flags.away && D <= state.flags.away.until ? E.dn(state.flags.away.until) : null,
    sick: !!state.flags.sick,
    known: knownGames || {}
  };
  // extra (hypothetical) sessions update last-done marks too
  for (const s of extraSessions || []) markSession(S, E.dn(s.date), s);
  for (const k in derived.lifts) S.gap[k] = derived.lifts[k].gap;
  for (const g of Object.keys(L.GROUPS)) for (const a of L.GROUPS[g]) if (S.gap[a] == null) S.gap[a] = st.gap.anchorStart;
  let d = day - 1;
  while (tl.active.has(d)) { S.streak++; d--; }
  return S;
};
function markSession(S, day, s) {
  if (s.type && s.type !== 'Strength') { S.last['t:' + s.type] = day; for (const a of L.COVERS[s.type] || []) S.last['r:' + a] = day; }
  for (const it of s.items || []) {
    if (!it.ex || it.skipped) continue;
    S.last['x:' + it.ex] = day;
    const asAnchor = it.anchor && !it.swapped;
    if (asAnchor) S.last['a:' + it.anchor] = day;
    if (it.area) S.last['r:' + it.area] = day;
    for (const a of L.COVERS[asAnchor ? it.anchor : it.ex] || []) S.last['r:' + a] = day;
  }
}
function cloneS(S) {
  return Object.assign({}, S, { M: Object.assign({}, S.M), last: Object.assign({}, S.last), gap: Object.assign({}, S.gap), walk: Object.assign({}, S.walk) });
}

// --------------------------------------------------------------------------
// Anchor readiness
// --------------------------------------------------------------------------
function variantOf(S, a) { return E.resolve(S.state, a); }
function sitsOut(S, a) {
  const v = variantOf(S, a);
  if (!v) return 'no kit';
  const x = E.ex(S.state, v);
  if ((x.j || []).some(j => S.tweaked.includes(j))) return 'tweaked joint';
  return null;
}
function anchorDue(S, a) { const l = S.last['a:' + a]; return l != null ? l + S.gap[a] : S.day0 + L.SEED[E.groupOf(a)]; }
function spacingDays(S, k) { return S.st.spacing[k]; }
function spacingBlock(S, a, d) {
  for (const [p, q, k] of L.SPACING) {
    if (p !== a && q !== a) continue;
    const b = p === a ? q : p;
    const l = S.last['a:' + b];
    if (l != null && d - l < spacingDays(S, k)) return { other: b, days: spacingDays(S, k) };
  }
  return null;
}
function readyLinesFail(S, x, M) {
  const r = S.st.ready;
  for (const m of x.m) if (M[m] > r.main) return { m, v: M[m], line: r.main };
  for (const m of x.h) if (M[m] > r.help) return { m, v: M[m], line: r.help };
  return null;
}
function anchorReady(S, a, d, M) {
  M = M || S.M;
  const l = S.last['a:' + a];
  if (l != null && d - l < S.gap[a]) return false;
  const v = variantOf(S, a); if (!v) return false;
  if (readyLinesFail(S, E.ex(S.state, v), M)) return false;
  return !spacingBlock(S, a, d);
}
function activeAnchors(S, g) { return L.GROUPS[g].filter(a => !sitsOut(S, a)); }
function groupReady(S, g, d) {
  const act = activeAnchors(S, g);
  if (!act.length) return false;
  return act.every(a => anchorReady(S, a, d) && d >= anchorDue(S, a));
}
function groupPriority(S, g) { const act = activeAnchors(S, g); return act.length ? Math.min(...act.map(a => anchorDue(S, a))) : Infinity; }
function strengthCandidate(S, d) {
  const full = [];
  for (const g of Object.keys(L.GROUPS)) if (groupReady(S, g, d)) full.push(g);
  if (!full.length) return null;
  full.sort((x, y) => groupPriority(S, x) - groupPriority(S, y));
  const g = full[0];
  return { kind: 'Strength', group: g, anchors: activeAnchors(S, g) };
}

// --------------------------------------------------------------------------
// Protection: other work must not make an upcoming anchor unready
// --------------------------------------------------------------------------
function earliestDay(S, a, d, todayAnchors) {
  let e = Math.max(d + 1, S.last['a:' + a] != null ? S.last['a:' + a] + S.gap[a] : 0);
  for (const [p, q, k] of L.SPACING) {
    if (p !== a && q !== a) continue;
    const b = p === a ? q : p;
    const lb = todayAnchors.includes(b) ? d : S.last['a:' + b];
    if (lb != null) e = Math.max(e, lb + spacingDays(S, k));
  }
  return e;
}
function protectedAnchors(S, d, exclude) {
  const out = [];
  for (const g of Object.keys(L.GROUPS)) for (const a of L.GROUPS[g]) {
    if (exclude.includes(a) || sitsOut(S, a)) continue;
    const e = earliestDay(S, a, d, exclude);
    if (e <= d + S.st.protectDays) out.push([a, e]);
  }
  return out;
}
function readyDay(v, line, hl, d) {
  if (v <= line) return d + 1;
  const hours = hl * Math.log2(v / line);
  return d + 1 + Math.max(0, Math.ceil((hours - 13) / 24));
}
function addsHarm(S, baseAfter, extra, d, exclude, slack) {
  slack = slack || 0;
  const r = S.st.ready;
  for (const [a, dd] of protectedAnchors(S, d, exclude)) {
    const x = E.ex(S.state, variantOf(S, a));
    for (const [m, line] of x.m.map(m => [m, r.main]).concat(x.h.map(m => [m, r.help]))) {
      if (!(extra[m] > 0)) continue;
      const hl = E.hl(S.state, m);
      const r0 = readyDay(baseAfter[m] || 0, line, hl, d);
      const r1v = readyDay(Math.min(100, (baseAfter[m] || 0) + extra[m]), line, hl, d);
      if (r1v > Math.max(dd + slack, r0)) return a;
    }
  }
  return null;
}
function capForProtection(S, load, d, exclude) {
  load = Object.assign({}, load);
  const r = S.st.ready;
  for (const [a, dd] of protectedAnchors(S, d, exclude || [])) {
    const hours = (dd - d) * 24 - 11;
    const x = E.ex(S.state, variantOf(S, a));
    for (const [m, line] of x.m.map(m => [m, r.main]).concat(x.h.map(m => [m, r.help]))) {
      const f = Math.pow(0.5, hours / E.hl(S.state, m));
      const allowed = Math.max(0, line / f - (S.M[m] || 0));
      if ((load[m] || 0) > allowed) load[m] = allowed;
    }
  }
  return load;
}
function trimmedNear(S, itemKey, d, exclude) {
  const prot = protectedAnchors(S, d, exclude || []).map(p => p[0]);
  return S.trims.some(t => t.item === itemKey && t.until >= d && (prot.includes(t.protects) || exclude.includes(t.protects)));
}

// --------------------------------------------------------------------------
// Other session types
// --------------------------------------------------------------------------
function typeIdeal(S, t) { return E.blockDef(S.block, S.state).ideal[t]; }
function typeLast(S, t) { const l = S.last['t:' + t]; return l != null ? l : S.day0 + SEED_TYPE[t] - S.st.typeMinGap; }
function typeRatio(S, t, d) { return (d - typeLast(S, t)) / typeIdeal(S, t); }
function sprintLegsFail(S) {
  const r = S.st.ready;
  if (S.M.hamstrings > r.sprintHam) return { m: 'hamstrings', v: S.M.hamstrings, line: r.sprintHam };
  for (const m of ['calves', 'glutes', 'quads', 'impact']) if (S.M[m] > r.sprintOther) return { m, v: S.M[m], line: r.sprintOther };
  return null;
}
function typeReady(S, t, d) {
  const minGap = t === 'Track' ? S.st.trackMinGap : S.st.typeMinGap;
  if (d - typeLast(S, t) < minGap) return false;
  if (S.location === 'field' && t === 'Fascia') return false;
  if (S.location === 'bodyweight' && t === 'Track') return false;
  if (t === 'Track') {
    if (sprintLegsFail(S)) return false;
    if (typeRatio(S, t, d) < 0.6) return false;
    if (addsHarm(S, Object.assign({}, S.M), L.TEMPLATE_LOAD.TrackLegs, d, [], typeRatio(S, t, d) >= 1 ? 1 : 0)) return false;
  }
  return true;
}
function hardStop(S, d, game) {
  if (game && game.planned) return 'Playing later today';
  if (S.sick) return 'Sick';
  if (S.W >= S.restLine) return `Whole-body meter ${Math.round(S.W)}`;
  if (S.streak >= S.st.maxStreak) return `${S.st.maxStreak} training days in a row`;
  return null;
}

// --------------------------------------------------------------------------
// Day stepping (used by the lookahead and the forecast)
// --------------------------------------------------------------------------
function applyDay(S, d, sess, game) {
  decay(S.state, S.M, 11);
  if (sess.kind === 'Rest' || sess.kind === 'WeekOff') {
    S.streak = game ? S.streak + 1 : 0;
  } else {
    for (const k in sess.load) S.M[k] = Math.min(100, (S.M[k] || 0) + sess.load[k]);
    S.W += sess.cost; S.streak++;
    markSession(S, d, { type: sess.kind, items: sess.items });
    if (sess.kind === 'Strength') {
      S.finCount++;
      if (sess.items.some(it => it.kind === 'piece')) S.pieceIdx++;
      const wk = sess.items.find(it => it.kind === 'walk');
      if (wk) S.walk = E.progressWalk(S.st, { min: wk.min, speed: wk.speed, incline: wk.incline, mode: wk.mode });
    }
  }
  if (game) {
    const ld = E.gameLoad(S.state, game, S.derived.sportMult);
    for (const k in ld) S.M[k] = Math.min(100, (S.M[k] || 0) + ld[k]);
    for (const m of game.sore || []) S.M[m] = Math.max(S.M[m], 60);
    S.W += S.st.cost.game * E.gameFactor(game);
  }
  decay(S.state, S.M, 13);
  S.W *= (1 - S.st.drain);
}
const REST = (why) => ({ kind: 'Rest', why, load: {}, cost: 0, items: [], minutes: 0, anchors: [] });
function nextStrengthDay(S, d, known, horizon) {
  S = cloneS(S);
  for (let k = 0; k < horizon; k++) {
    const dd = d + k;
    if (!hardStop(S, dd, known[dd]) && strengthCandidate(S, dd)) return dd;
    applyDay(S, dd, REST(''), known[dd]);
  }
  return Infinity;
}

// --------------------------------------------------------------------------
// The daily decision (strength first, then the most due other session, else rest)
// --------------------------------------------------------------------------
function choose(S, d, known) {
  if (S.awayUntil != null && d > S.awayUntil) { S.location = S.baseLocation; S.awayUntil = null; }
  const game = known[d];
  const hs = hardStop(S, d, game);
  if (hs) return { opt: { kind: 'Rest' }, why: hs, code: 'hard' };
  if (S.location !== 'gym') return chooseAway(S, d, known);
  let sc = strengthCandidate(S, d);
  const blk = E.blockDef(S.block, S.state);
  const types = blk.prio.filter(t => typeReady(S, t, d)).sort((x, y) => (typeRatio(S, y, d) - typeRatio(S, x, d)) || (blk.prio.indexOf(x) - blk.prio.indexOf(y)));
  let held = null;
  if (sc) {
    // Fairness: a ready group can't jump ahead of a group whose lifts have waited longer
    const gDue = groupPriority(S, sc.group);
    for (const h of Object.keys(L.GROUPS)) {
      if (h === sc.group || groupReady(S, h, d)) continue;
      if (groupPriority(S, h) >= gDue) continue;
      const hDay = (S0) => { const S2 = cloneS(S0); for (let k = 1; k <= 3; k++) { const dd = d + k; if (!hardStop(S2, dd, known[dd]) && groupReady(S2, h, dd)) return dd; applyDay(S2, dd, REST(''), known[dd]); } return Infinity; };
      const S0 = cloneS(S); applyDay(S0, d, REST(''), game);
      const S1 = cloneS(S); const s1 = buildOption(S1, sc, d); applyDay(S1, d, s1, game);
      const e0 = hDay(S0), e1 = hDay(S1);
      if (e0 < Infinity && e1 > e0) { held = { group: sc.group, for: h }; sc = null; break; }
    }
  }
  if (sc) {
    for (const t of types) {
      const ideal = typeIdeal(S, t);
      if (d - typeLast(S, t) >= S.st.overdueFactor * ideal) {
        const S1 = cloneS(S); const s1 = buildOption(S1, { kind: t }, d); applyDay(S1, d, s1, game);
        if (nextStrengthDay(S1, d + 1, known, 1) === d + 1) return { opt: { kind: t }, why: `${t} is well overdue; group ${sc.group} can go tomorrow instead`, code: 'overdue' };
      }
    }
    return { opt: sc, why: 'strength', code: 'strength' };
  }
  const S0 = cloneS(S); applyDay(S0, d, REST(''), game);
  const base = nextStrengthDay(S0, d + 1, known, S.st.lookahead);
  for (const t of types) {
    const S1 = cloneS(S); const s1 = buildOption(S1, { kind: t }, d); applyDay(S1, d, s1, game);
    if (nextStrengthDay(S1, d + 1, known, S.st.lookahead) <= base) return { opt: { kind: t }, why: 'most due', code: 'type', held };
  }
  if (types.length) return { opt: { kind: 'Rest' }, why: 'protect', code: 'protect', held, rejected: types, base };
  return { opt: { kind: 'Rest' }, why: 'nothing', code: 'nothing', held };
}
function chooseAway(S, d, known) {
  const blk = E.blockDef(S.block, S.state);
  const allowed = S.location === 'field' ? ['Track', 'Soviet'] : ['Soviet', 'Fascia'];
  const types = blk.prio.filter(t => allowed.includes(t) && typeReady(S, t, d)).sort((x, y) => typeRatio(S, y, d) - typeRatio(S, x, d));
  if (types.length) return { opt: { kind: types[0], away: S.location }, why: 'away', code: 'away' };
  return { opt: { kind: 'Rest' }, why: 'away-nothing', code: 'away-nothing' };
}

// --------------------------------------------------------------------------
// Session builders
// --------------------------------------------------------------------------
function poolItemsFor(S, g) {
  const pools = E.pools(S.state)[g] || [];
  const blk = S.block;
  const out = [];
  for (const sl of pools) {
    if ((sl.skipBlocks || []).includes(blk)) continue;
    const items = [];
    for (const [id, v] of Object.entries(sl.items)) {
      const gap = typeof v === 'number' ? v : v.gap;
      const blocks = typeof v === 'number' ? null : v.blocks;
      if (blocks && !blocks.includes(blk)) continue;
      const x = E.ex(S.state, id);
      if (!x) continue;
      let f = 1;
      const bd = E.blockDef(blk, S.state);
      if (bd.extrasFactor && x.c === 'extra') f = bd.extrasFactor;
      if (bd.staplesFactor && x.c === 'staple') f = bd.staplesFactor;
      items.push({ id, ideal: gap * f, base: gap });
    }
    out.push({ slot: sl.slot, items });
  }
  return out;
}
function daysSince(S, key, d, idealForNever) { const l = S.last[key]; return l != null ? d - l : (d - S.day0) + idealForNever; }
function areaIdeal(S, a) { const ar = E.areas(S.state)[a]; const bd = E.blockDef(S.block, S.state); return (a === 'neck' && bd.neckIdeal) ? bd.neckIdeal : ar.ideal; }
function pickAreaExercise(S, a, d, exclude) {
  const ar = E.areas(S.state)[a];
  let best = null;
  for (const id of ar.pool) {
    const v = E.resolve(S.state, id);
    if (!v) continue;
    const x = E.ex(S.state, v);
    if ((x.j || []).some(j => S.tweaked.includes(j))) continue;
    if (x.minGap && S.last['x:' + v] != null && d - S.last['x:' + v] < x.minGap) continue;
    if (exclude && exclude.includes(v)) continue;
    const l = S.last['x:' + v];
    const score = l == null ? -1e9 + ar.pool.indexOf(id) : l;   // least recently used; never-used first, in pool order
    if (!best || score < best.score) best = { id: v, base: id, score };
  }
  return best;
}
function buildStrength(S, anchors, g, d) {
  const st = S.st;
  const items = [];
  const load = {};
  let t = 8;
  items.push({ role: 'warmup', kind: 'warmup', title: 'Warm-up', min: 5 });
  items.push({ role: 'warmup', kind: 'vacuum', ex: null, title: 'Stomach vacuum', min: 3 });
  for (const a of anchors) {
    const v = variantOf(S, a);
    const x = E.ex(S.state, v);
    items.push({ role: 'anchor', anchor: a, ex: v, min: x.min });
    t += x.min;
    addTo(load, E.liftLoad(S.state, x, 2, FINISH_SET(st)));
  }
  const sitOut = L.GROUPS[g].length - anchors.length;
  const nSlots = (st.slots[g] || 2) + sitOut;
  const trackDue = typeRatio(S, 'Track', d) >= 1.0;
  let used = 0;
  const notes = [];
  for (const sl of poolItemsFor(S, g)) {
    if (used >= nSlots) break;
    const cands = [];
    for (const it of sl.items) {
      const v = E.resolve(S.state, it.id);
      if (!v) continue;
      const x = E.ex(S.state, v);
      if ((x.j || []).some(j => S.tweaked.includes(j))) continue;
      const fail = readyLinesFail(S, x, S.M);
      if (fail) { if (it.ideal <= 20) notes.push({ ex: v, fail }); continue; }
      const lk = 'x:' + v;
      if (S.last[lk] != null && S.gap[v] != null && d - S.last[lk] < S.gap[v]) continue;
      const ratio = daysSince(S, lk, d, it.ideal / 2) / it.ideal;
      cands.push({ ratio, ideal: it.ideal, v, x, slot: sl.slot });
    }
    cands.sort((p, q) => (q.ratio - p.ratio) || (p.ideal - q.ideal));
    for (const c of cands) {
      if (t + c.x.min > st.staplesUntil) break;
      if (trimmedNear(S, 'x:' + c.v, d, anchors)) continue;
      items.push({ role: 'staple', ex: c.v, slot: c.slot, min: c.x.min, extra: c.x.c === 'extra' });
      t += c.x.min; used++;
      addTo(load, E.liftLoad(S.state, c.x, 2, FINISH_SET(st)));
      break;
    }
  }
  // Must-train add-ons
  const nAdd = (st.addons[g] || 1) + sitOut;
  const coveredToday = uniq(anchors.flatMap(a => L.COVERS[a] || []).concat(items.filter(i => i.role === 'staple').flatMap(i => L.COVERS[i.ex] || [])));
  const areaC = [];
  for (const [a, ar] of Object.entries(E.areas(S.state))) {
    const ideal = areaIdeal(S, a);
    const ratio = daysSince(S, 'r:' + a, d, ideal) / ideal;
    if (ar.main.some(m => S.M[m] > st.ready.addon)) continue;
    areaC.push({ a, ratio });
  }
  areaC.sort((p, q) => q.ratio - p.ratio);
  let added = 0;
  for (const c of areaC) {
    if (added >= nAdd) break;
    if (c.ratio < 0.75) break;
    if (coveredToday.includes(c.a)) continue;
    if (t + 5 > st.addonsUntil) break;
    const pick = pickAreaExercise(S, c.a, d, items.map(i => i.ex));
    if (!pick) continue;
    const x = E.ex(S.state, pick.id);
    const xl = E.exLoad(S.state, x);
    const after = Object.assign({}, S.M); addTo(after, load);
    if (addsHarm(S, after, xl, d, anchors)) continue;
    if (trimmedNear(S, 'x:' + pick.id, d, anchors)) continue;
    items.push({ role: 'addon', ex: pick.id, area: c.a, min: 5 });
    t += 5; added++;
    addTo(load, xl);
  }
  // Finisher
  const pattern = E.blockDef(S.block, S.state).finishers;
  const kind = pattern[S.finCount % pattern.length];
  const maxMin = E.blockDef(S.block, S.state).finisherMax || 20;
  // Short session? Top it up toward the floor with one area that is nearly due (same readiness and protection checks)
  const finGuess = () => (kind === 'walk' ? Math.min(S.walk.min, st.sessionMax - t, maxMin) : Math.min(15, st.sessionMax - t));
  if (t + finGuess() < st.sessionMin) {
    const doneAreas = items.filter(i => i.role === 'addon').map(i => i.area);
    for (const c of areaC) {
      if (t + finGuess() >= st.sessionMin || t + 5 > st.addonsUntil) break;
      if (c.ratio < st.fillRatio) break;
      if (coveredToday.includes(c.a) || doneAreas.includes(c.a)) continue;
      const pick = pickAreaExercise(S, c.a, d, items.map(i => i.ex));
      if (!pick) continue;
      const x = E.ex(S.state, pick.id);
      const xl = E.exLoad(S.state, x);
      const after = Object.assign({}, S.M); addTo(after, load);
      if (addsHarm(S, after, xl, d, anchors) || trimmedNear(S, 'x:' + pick.id, d, anchors)) continue;
      items.push({ role: 'addon', ex: pick.id, area: c.a, min: 5, fill: true });
      t += 5; addTo(load, xl); doneAreas.push(c.a);
      break;
    }
  }
  const room = st.sessionMax - t;
  if (kind === 'soviet' || kind === 'jumps') {
    const pool = (kind === 'soviet' ? L.FINISHERS.soviet : L.FINISHERS.jumps).filter(p => (p.e || []).every(e => S.state.equipment[e]));
    const p = pool[S.pieceIdx % pool.length];
    const after = Object.assign({}, S.M); addTo(after, load);
    const pl = {};
    for (const m in p.load) {
      if (addsHarm(S, after, { [m]: p.load[m] }, d, anchors)) continue;
      if (trimmedNear(S, 'f:' + p.id, d, anchors)) continue;
      pl[m] = trackDue && ['hamstrings', 'calves', 'impact'].includes(m) ? Math.min(p.load[m], 5) : p.load[m];
    }
    const mins = Math.max(0, Math.min(15, room));
    items.push({ role: 'finisher', kind: 'piece', pid: p.id, title: p.name, desc: p.desc, unit: p.unit, min: mins, load: pl, timer: p.timer || null });
    t += mins; addTo(load, pl);
  } else {
    const w = S.walk;
    const treadmill = S.state.equipment.treadmill;
    const mins = Math.max(0, Math.min(w.min, room, maxMin));
    items.push({ role: 'finisher', kind: 'walk', title: treadmill ? 'Incline walk' : 'Cardio (stair climber, rower or bike)', min: mins, speed: w.speed, incline: w.incline, mode: w.mode });
    t += mins; addTo(load, E.walkLoad(mins));
  }
  const cost = anchors.length >= 3 ? st.cost.strength3 : st.cost.strength2;
  return { kind: 'Strength', group: g, anchors, items, load, cost, minutes: Math.round(t), notes };
}
function condLoad(S, t, d) {
  let load;
  if (t === 'Track') {
    const gpp = capForProtection(S, L.TEMPLATE_LOAD.TrackGPP, d, []);
    for (const m in gpp) if (S.M[m] > S.st.ready.cond) gpp[m] = 0;
    load = Object.assign({}, L.TEMPLATE_LOAD.TrackLegs, gpp);
  } else {
    load = capForProtection(S, L.TEMPLATE_LOAD[t], d, []);
    if (typeRatio(S, 'Track', d + 1) >= 1.0) for (const m of ['hamstrings', 'calves', 'impact']) load[m] = Math.min(load[m] || 0, 5);
    for (const m in load) if (S.M[m] > S.st.ready.cond) load[m] = 0;
  }
  return load;
}
function buildOther(S, t, d, away) {
  const load = condLoad(S, t, d);
  const mins = { Soviet: 85, Fascia: 80, Track: 80 }[t];
  return { kind: t, items: [], load, cost: S.st.cost[t], minutes: mins, anchors: [], away: away || null };
}
function buildOption(S, opt, d) {
  if (opt.kind === 'Rest') return REST('');
  if (opt.kind === 'Strength') return buildStrength(S, opt.anchors, opt.group, d);
  return buildOther(S, opt.kind, d, opt.away);
}

// --------------------------------------------------------------------------
// Walk progression
// --------------------------------------------------------------------------
E.progressWalk = (st, last) => {
  const w = st.walk;
  let { min, speed, incline, mode } = last;
  if (mode === 'intervals') return { min: w.max, speed, incline, mode };
  if (min < w.max) return { min: min + 1, speed, incline, mode: 'steady' };
  if (speed < w.speedMax - 1e-9) return { min, speed: Math.round((speed + w.speedStep) * 10) / 10, incline, mode: 'steady' };
  if (incline < w.inclineMax) return { min, speed, incline: w.inclineMax, mode: 'steady' };
  return { min, speed, incline, mode: 'intervals' };
};
E.nextWalk = (state, derived) => {
  const st = E.settings(state);
  if (!derived.walk) return { min: st.walk.start, speed: st.walk.speed, incline: st.walk.incline, mode: 'steady' };
  return E.progressWalk(st, derived.walk);
};

// ===========================================================================
// Composition of conditioning sessions (what you actually do on the day)
// ===========================================================================
function stationAllowed(S, stn, d, protMuscles, pullDue) {
  if ((stn.e || []).some(e => !S.state.equipment[e])) return false;
  if (stn.m.some(m => m !== 'impact' && S.M[m] > S.st.ready.cond)) return false;
  if (stn.m.some(m => protMuscles.has(m))) return false;
  if (stn.pull && pullDue) return false;
  if (trimmedNear(S, 's:' + stn.id, d, [])) return false;
  return true;
}
function protMusclesFor(S, d) {
  const set = new Set();
  for (const [a] of protectedAnchors(S, d, [])) { const x = E.ex(S.state, variantOf(S, a)); x.m.forEach(m => set.add(m)); }
  return set;
}
function rotate(arr, k) { if (!arr.length) return arr; k = ((k % arr.length) + arr.length) % arr.length; return arr.slice(k).concat(arr.slice(0, k)); }
function composeCircuit(S, d, ids, n, seed) {
  const prot = protMusclesFor(S, d);
  const pullDue = protectedAnchors(S, d, []).some(([a]) => a === 'pullups' || a === 'chins');
  const pool = ids.map(id => L.SOVIET.stations.find(s => s.id === id)).filter(Boolean);
  const ok = rotate(pool, seed).filter(s => stationAllowed(S, s, d, prot, pullDue));
  // Balance: prefer different muscle groups
  const pick = [];
  const usedM = new Set();
  for (const s of ok) { if (pick.length >= n) break; if (s.m.filter(m => m !== 'impact').every(m => usedM.has(m)) && ok.length > n) continue; pick.push(s); s.m.forEach(m => usedM.add(m)); }
  for (const s of ok) { if (pick.length >= n) break; if (!pick.includes(s)) pick.push(s); }
  return { stations: pick.map(s => s.id), skipped: pool.filter(s => !ok.includes(s)).length, prot };
}
function composeSoviet(S, d, plan, away) {
  const k = S.derived.notes.sovietCount || 0;
  const items = [];
  items.push({ role: 'block', kind: 'checklist', cond: true, title: 'Warm-up', min: 12, list: L.SOVIET.warmup });
  const lvl = Math.min(5, S.derived.bridgeLevel || 0);
  const br = L.SOVIET.bridges[lvl];
  if (S.M.neck <= S.st.ready.cond) items.push({ role: 'block', kind: 'bridge', cond: true, title: `Bridging: ${br.name}`, how: br.how, level: lvl, min: 15 });
  const allIds = L.SOVIET.stations.filter(s => away === 'bodyweight' || away === 'field' ? !(s.e || []).some(e => e !== 'pullup_bar' && e !== 'partner') : true).map(s => s.id);
  const circ = composeCircuit(S, d, allIds, 7, S.block * 5);   // same rotation all block, so totals compare
  items.push({ role: 'block', kind: 'circuit', cond: true, title: 'GPP circuit', min: 25, stations: circ.stations, rounds: 5, work: 30, move: 15, roundRest: 75 });
  const ints = L.SOVIET.intervals.filter(f => (f.e || []).every(e => S.state.equipment[e]) && !f.m.some(m => m !== 'impact' && S.M[m] > S.st.ready.cond));
  const iv = rotate(ints.length ? ints : L.SOVIET.intervals, k)[0];
  items.push({ role: 'block', kind: 'interval', cond: true, pid: iv.id, title: `Wrestling intervals: ${iv.name}`, desc: iv.desc, unit: iv.unit, lowerBetter: !!iv.lowerBetter, timer: iv.timer || null, min: 15 });
  const burn = [];
  if (S.state.equipment.pullup_bar && S.M.abs <= S.st.ready.cond) burn.push('hanging_leg_raise');
  if (S.state.equipment.pullup_bar && S.M.forearms <= S.st.ready.cond) burn.push('towel_hang');
  for (const id of burn) items.push({ role: 'burnout', ex: id, cond: true, min: 4 });
  items.push({ role: 'burnout', kind: 'vacuum', cond: true, title: 'Stomach vacuum', min: 2 });
  plan.protectNote = circ.prot.size ? `goes light on ${[...circ.prot].slice(0, 5).map(E.muscleName).join(', ').toLowerCase()} for the next strength session` : '';
  return items;
}
function composeFascia(S, d, plan, away) {
  const k = S.derived.notes.fasciaCount || 0;
  const items = [];
  items.push({ role: 'block', kind: 'checklist', cond: true, title: 'Bounce-in', min: 8, list: L.FASCIA.bounceIn });
  for (const sec of L.FASCIA.sections) {
    const ok = sec.drills.filter(dr => {
      if (dr.blocks && !dr.blocks.includes(S.block)) return false;
      const e = dr.ex ? (E.ex(S.state, E.resolve(S.state, dr.ex) || dr.ex) || {}).e || [] : dr.e || [];
      if (dr.ex && !E.resolve(S.state, dr.ex)) return false;
      if (!dr.ex && (dr.e || []).some(q => !S.state.equipment[q])) return false;
      if (away === 'bodyweight' && e.some(q => q !== 'bench')) return false;
      if (dr.m.some(m => m !== 'impact' && S.M[m] > S.st.ready.cond)) return false;
      if (S.tweaked.length && dr.ex && (E.ex(S.state, dr.ex).j || []).some(j => S.tweaked.includes(j))) return false;
      return true;
    });
    const ess = ok.filter(z => !z.niche), niche = ok.filter(z => z.niche);
    const chosen = rotate(ess, k).slice(0, Math.max(1, sec.pick - 1));
    if (niche.length) chosen.push(rotate(niche, k)[0]); else for (const z of rotate(ess, k + 1)) { if (chosen.length >= sec.pick) break; if (!chosen.includes(z)) chosen.push(z); }
    for (const dr of chosen.slice(0, sec.pick)) {
      if (dr.ex) items.push({ role: 'block', section: sec.name, ex: E.resolve(S.state, dr.ex), cond: true, min: Math.round(sec.min / sec.pick) });
      else items.push({ role: 'block', section: sec.name, kind: 'drill', did: dr.id, cond: true, title: dr.name, dk: dr.k, unit: dr.unit || (dr.k === 'hold' ? 's' : 'reps'), cue: dr.cue || '', how: dr.how || '', uni: !!dr.uni, min: Math.round(sec.min / sec.pick) });
    }
  }
  if (S.state.equipment.kettlebells && away !== 'bodyweight' && S.M.hamstrings <= S.st.ready.cond) items.push({ role: 'block', kind: 'swing', cond: true, pid: 'fascia_swing', title: L.FASCIA.swing.name, unit: L.FASCIA.swing.unit, timer: L.FASCIA.swing.timer, min: 12 });
  items.push({ role: 'block', kind: 'checklist', cond: true, title: 'Bouncing stretches, then Horn-style maneuvers', min: 12, list: L.FASCIA.stretches.concat(rotate(L.FASCIA.maneuvers, k).slice(0, 4)) });
  return items;
}
function composeTrack(S, d, plan) {
  const k = S.derived.notes.trackCount || 0;
  const items = [];
  items.push({ role: 'block', kind: 'checklist', cond: true, title: 'Warm-up', min: 15, list: L.TRACK.warmup });
  const sp = L.TRACK.speed[k % L.TRACK.speed.length];
  items.push({ role: 'block', kind: 'sprint', cond: true, pid: sp.id, title: `Speed: ${sp.name}`, desc: sp.desc, unit: sp.unit, base: sp.target, max: sp.max, min: 15 });
  const reps = L.TRACK.repeat[S.block] || L.TRACK.repeat[1];
  const rp = reps[k % reps.length];
  items.push({ role: 'block', kind: 'sprint', cond: true, pid: rp.id, title: rp.name, desc: rp.desc, unit: rp.unit, base: rp.target, max: rp.max, min: S.block === 3 ? 20 : 10 });
  const circ = composeCircuit(S, d, L.TRACK.field, 5, k);
  items.push({ role: 'block', kind: 'circuit', cond: true, title: 'Field circuit', min: S.block === 3 ? 20 : 30, stations: circ.stations, rounds: 4, work: 30, move: 15, roundRest: 60 });
  items.push({ role: 'block', kind: 'checklist', cond: true, title: 'Cool-down', min: 5, list: L.TRACK.cooldown });
  return items;
}

// ===========================================================================
// Why-notes
// ===========================================================================
function groupBlocker(S, g, d) {
  const act = activeAnchors(S, g);
  if (!act.length) return 'every lift is sitting out';
  for (const a of act) {
    const l = S.last['a:' + a];
    const nm = E.ex(S.state, variantOf(S, a) || a).name.toLowerCase();
    if (l != null && d - l < S.gap[a]) { const left = S.gap[a] - (d - l); return `${nm} needs ${left} more day${left > 1 ? 's' : ''} (gap ${S.gap[a]})`; }
    if (d < anchorDue(S, a)) return `not due until ${E.dow(E.ds(anchorDue(S, a)))}`;
    const sb = spacingBlock(S, a, d);
    if (sb) return `${nm} needs ${sb.days * 24} h after ${E.ex(S.state, variantOf(S, sb.other) || sb.other).name.toLowerCase()}`;
    const v = variantOf(S, a);
    const f = readyLinesFail(S, E.ex(S.state, v), S.M);
    if (f) return `${E.muscleName(f.m).toLowerCase()} ${pctAt(f.v, f.line)} (needs ${f.line} or under)`;
  }
  return 'not ready';
}
function blockWeek(state, D) {
  const b = state.block || {};
  if (!b.start) return '';
  const wk = Math.floor((E.dn(D) - E.dn(b.start)) / 7) + 1;
  return `Block ${b.n}, ${E.blockDef(b.n, state).name}, week ${wk}`;
}
function musclesList(S, ms) { return uniq(ms).map(m => `${E.muscleName(m).toLowerCase()} ${pct(S.M[m])}`).join(', '); }

// ===========================================================================
// Housekeeping: week off, block switch, planned games
// ===========================================================================
E.housekeeping = (state, D) => {
  const st = E.settings(state);
  const msgs = [];
  const day = E.dn(D);
  if (!state.startDate) { state.startDate = D; msgs.push('start'); }
  const b = state.block;
  if (!b.start) b.start = state.startDate;
  // End of week off → next block
  if (b.weekOff && day >= E.dn(b.weekOff.start) + st.weekOffDays) {
    b.history.push({ n: b.n, start: b.start, weekOffStart: b.weekOff.start, end: E.addDays(b.weekOff.start, st.weekOffDays) });
    b.n = E.nextBlock(state, b.n); b.start = E.addDays(b.weekOff.start, st.weekOffDays); b.weekOff = null;
    msgs.push(`Block ${b.n} starts: ${E.blockDef(b.n, state).name}.`);
    state.rev++;
  }
  if (!b.weekOff) {
    const age = day - E.dn(b.start);
    const derived = E.derive(state);
    let why = null;
    if (age >= st.blockMaxWeeks * 7) why = `end of week ${st.blockMaxWeeks}`;
    else if (derived.stalled.length >= 2) why = `2 anchors stalled (${derived.stalled.join(', ')})`;
    else if (age >= st.blockMinWeeks * 7) {
      const misses = derived.anchorMisses.filter(z => z.day > day - 10).length;
      if (misses >= 3) why = `${misses} anchor misses in the last 10 days`;
      else {
        const tl = E.timeline(state, null, derived.sportMult);
        let sum = 0; for (let k = 1; k <= 7; k++) sum += E.meterMorning(state, tl, day - k + 1);
        if (sum / 7 > 50) why = 'whole-body meter averaged over 50 this week';
      }
    }
    if (why) { b.weekOff = { start: D, why }; state.rev++; msgs.push(`Week off starts today: ${why}.`); }
  }
  // A finished trip clears itself
  if (state.flags.away && day > E.dn(state.flags.away.until)) { state.flags.away = null; state.rev++; }
  // Planned games from earlier days become played games
  for (const g of state.log.games) if (g.planned && E.dn(g.date) < day) { g.planned = false; state.rev++; }
  return msgs;
};
E.startWeekOff = (state, D, why) => { state.block.weekOff = { start: D, why: why || 'started by you' }; state.rev++; };

// ===========================================================================
// Plan a real day
// ===========================================================================
E.plan = (state, D) => {
  const st = E.settings(state);
  const day = E.dn(D);
  const b = state.block;
  const blk = E.blockDef(b.n, state);
  const plannedGame = (state.log.games || []).find(g => g.date === D && g.planned);
  const known = {}; if (plannedGame) known[day] = plannedGame;
  // Games already played today count in this morning's numbers only if they happened before 07:00 (rare)
  const S = E.snapshot(state, D, null, known);
  S.derived.notes.sovietCount = (state.log.sessions || []).filter(s => s.type === 'Soviet').length;
  S.derived.notes.fasciaCount = (state.log.sessions || []).filter(s => s.type === 'Fascia').length;
  S.derived.notes.trackCount = (state.log.sessions || []).filter(s => s.type === 'Track').length;
  const base = { date: D, block: b.n, blockName: blk.name, week: blockWeek(state, D), W: Math.round(S.W), restLine: S.restLine, M: S.M };
  if (b.weekOff) {
    const left = E.dn(b.weekOff.start) + st.weekOffDays - day;
    return Object.assign(base, { kind: 'WeekOff', title: 'Week off', items: [], minutes: 0, why: [`Week off (${b.weekOff.why}). Easy 30–60 min walk only.`, `${left} day${left === 1 ? '' : 's'} left; block ${E.nextBlock(state, b.n)}, ${E.blockDef(E.nextBlock(state, b.n), state).name}, starts after.`] });
  }
  const ch = choose(S, day, known);
  const why = [];
  let sess;
  if (ch.opt.kind === 'Rest') {
    sess = REST(ch.why);
    if (ch.code === 'hard') {
      if (ch.why === 'Playing later today') why.push(`You're playing ${(E.sports(state)[plannedGame.sport] || {}).name || 'a game'} later: rest day. Confirm the numbers after.`);
      else if (ch.why === 'Sick') why.push('Flagged ill: rest until you clear it. Your first day back starts the whole-body meter at 50.');
      else if (ch.why.startsWith('Whole-body')) why.push(`Whole-body meter at ${Math.round(S.W)} (rest line ${S.restLine}).`);
      else {
        const gameDays = (state.log.games || []).filter(g => { const gd = E.dn(g.date); return gd < day && gd >= day - S.streak; });
        why.push(`${st.maxStreak} training days in a row${gameDays.length ? `, counting ${gameDays.length > 1 ? 'games' : `${E.dow(gameDays[0].date)}'s ${(E.sports(state)[gameDays[0].sport] || {}).name || 'game'}`}` : ''}.`);
      }
    } else if (ch.code === 'protect') {
      const nsd = ch.base;
      const nxt = nsd < Infinity ? `${E.dow(E.ds(nsd))}'s strength session` : 'the next strength session';
      why.push(`Any session today would push ${nxt} back.`);
      const g0 = Object.keys(L.GROUPS).map(g => `${g}: ${groupBlocker(S, g, day)}`);
      why.push(`Not ready today: ${g0.join('; ')}.`);
    } else if (ch.code === 'away-nothing') {
      why.push(`Away from the gym (${S.location}) and nothing that fits there is due. Anchors wait.`);
    } else {
      why.push('Nothing is ready today, so recovery wins.');
      why.push(Object.keys(L.GROUPS).map(g => `${g}: ${groupBlocker(S, g, day)}`).join('; ') + '.');
    }
    if (ch.held) why.push(`Group ${ch.held.group} is ready but held back so group ${ch.held.for}, which has waited longer, isn't delayed.`);
    return Object.assign(base, { kind: 'Rest', title: plannedGame ? 'Rest day: game later' : 'Rest day', items: [{ role: 'rest', kind: 'checklist', title: 'Easy walk', list: ['Easy 30–60 min walk'] }], minutes: 0, why, game: plannedGame || null });
  }
  sess = buildOption(S, ch.opt, day);
  if (sess.kind === 'Strength') {
    const g = sess.group;
    const late = Math.min(...sess.anchors.map(a => day - anchorDue(S, a)));
    const lastG = Math.max(...sess.anchors.map(a => S.last['a:' + a] != null ? S.last['a:' + a] : -1e9));
    const since = lastG > -1e9 ? day - lastG : null;
    const ms = sess.anchors.flatMap(a => E.ex(state, variantOf(S, a)).m);
    let first = since == null ? `Group ${g}'s first session: every lift sets its baseline.` : `Group ${g} is ${late > 0 ? `${late} day${late > 1 ? 's' : ''} late` : `due (${since} days)`}. Ready: ${musclesList(S, ms)}.`;
    why.push(first);
    const out = L.GROUPS[g].filter(a => !sess.anchors.includes(a));
    if (out.length) why.push(`${out.map(a => E.ex(state, a).name).join(', ')} sit${out.length > 1 ? '' : 's'} out (${out.map(a => sitsOut(S, a)).join(', ')}); an extra staple and add-on take the time.`);
    const skipped = (sess.notes || []).filter(n => !sess.items.some(i => i.ex === n.ex)).slice(0, 2);
    for (const n of skipped) why.push(`${E.ex(state, n.ex).name} waits: ${E.muscleName(n.fail.m).toLowerCase()} ${pctAt(n.fail.v, n.fail.line)} (needs ${n.fail.line} or under).`);
    const adds = sess.items.filter(i => i.role === 'addon');
    if (adds.length) {
      const ages = adds.map(i => { const l = S.last['r:' + i.area]; return l != null ? `${day - l} days` : 'not trained yet'; });
      why.push(`${adds.map(i => E.areas(state)[i.area].name).join(' and ')} ${adds.length > 1 ? 'are' : 'is'} due (${uniq(ages).length === 1 && ages.length > 1 ? `${ages[0]}${ages[0].endsWith('days') ? ' each' : ''}` : ages.join(', ')}).`);
    }
  } else {
    const lines = Object.keys(L.GROUPS).map(g => `${g}: ${groupBlocker(S, g, day)}`);
    if (ch.code === 'overdue') why.push(ch.why + '.');
    else if (ch.code === 'away') why.push(`Away from the gym (${S.location}): ${sess.kind} fits there. Anchors wait.`);
    else why.push(`No strength group is ready (${lines.join('; ')}).`);
    const ls = S.last['t:' + sess.kind];
    why.push(`${sess.kind} is the most due session (${ls != null ? `${day - ls} days; ideal ${typeIdeal(S, sess.kind)}` : 'first one'}).`);
    if (ch.held) why.push(`Group ${ch.held.group} is ready but held back so group ${ch.held.for}, which has waited longer, isn't delayed.`);
    if (sess.kind === 'Track') {
      why.push(`Hamstrings ${pctAt(S.M.hamstrings, st.ready.sprintHam)}, at or under the ${st.ready.sprintHam}% sprint line.`);
    }
    // compose the day's content
    const plan = {};
    if (sess.kind === 'Soviet') sess.items = composeSoviet(S, day, plan, sess.away);
    else if (sess.kind === 'Fascia') sess.items = composeFascia(S, day, plan, sess.away);
    else sess.items = composeTrack(S, day, plan);
    if (plan.protectNote) why.push(`The circuit ${plan.protectNote}.`);
    const over = L.MUSCLES.filter(m => m.id !== 'impact' && S.M[m.id] > st.ready.cond).map(m => `${m.name.toLowerCase()} ${pctAt(S.M[m.id], st.ready.cond)}`);
    if (over.length) why.push(`Skipped because they're above ${st.ready.cond}%: ${over.slice(0, 4).join(', ')}.`);
  }
  why.push(base.week);
  const title = sess.kind === 'Strength' ? `Strength ${sess.group}` : sess.kind === 'Soviet' ? 'Soviet "Borets" day' : sess.kind === 'Fascia' ? 'Fascia "Elastic" day' : 'Track day';
  const subtitle = sess.kind === 'Strength' ? sess.anchors.map(a => E.ex(state, variantOf(S, a)).name).join(' · ') : '';
  return Object.assign(base, { kind: sess.kind, title, subtitle, group: sess.group || null, anchors: sess.anchors || [], items: sess.items, minutes: sess.minutes, load: sess.load, cost: sess.cost, why, game: plannedGame || null });
};

// Turn a plan into a hypothetical logged session (for forecasting)
function planAsSession(plan) {
  if (!plan || plan.kind === 'Rest' || plan.kind === 'WeekOff') return null;
  return { id: 'hyp', date: plan.date, type: plan.kind, group: plan.group, hour: 18, loadOverride: plan.load, cost: plan.cost,
    items: plan.items.map(it => Object.assign({}, it, { sets: [{ done: true }, { done: true }], done: true })) };
}
E.forecast = (state, D, todayPlan, n) => {
  n = n || 3;
  const out = [];
  const day = E.dn(D);
  const doneToday = (state.log.sessions || []).some(s => s.date === D);
  const extra = [];
  if (!doneToday) { const h = planAsSession(todayPlan); if (h) extra.push(h); }
  const tomorrow = E.ds(day + 1);
  if (state.block.weekOff) {
    const left = E.dn(state.block.weekOff.start) + E.settings(state).weekOffDays - day - 1;
    for (let k = 1; k <= n; k++) out.push({ date: E.ds(day + k), label: k <= left ? 'Week off: easy walk' : 'New block starts' });
    return out;
  }
  const S = E.snapshot(state, tomorrow, extra, {});
  // today's played/planned game counts in tomorrow's numbers already via the timeline
  for (let k = 0; k < n; k++) {
    const d = day + 1 + k;
    const ch = choose(S, d, {});
    const sess = buildOption(S, ch.opt, d);
    let label;
    if (sess.kind === 'Rest') label = ch.code === 'hard' ? `Rest (${ch.why.toLowerCase()})` : 'Rest';
    else if (sess.kind === 'Strength') label = `Strength ${sess.group}: ${sess.anchors.map(a => E.ex(state, E.resolve(state, a) || a).name).join(', ')}`;
    else label = { Soviet: 'Soviet day', Fascia: 'Fascia day', Track: 'Track day' }[sess.kind];
    out.push({ date: E.ds(d), label, kind: sess.kind, group: sess.group || null, anchors: sess.anchors || [] });
    applyDay(S, d, sess, null);
  }
  return out;
};

// ===========================================================================
// Fatigue now (Body screen)
// ===========================================================================
E.fatigueNow = state => {
  const derived = E.derive(state);
  const tl = E.timeline(state, null, derived.sportMult);
  const now = E.now();
  const D = E.today();
  const t = E.dn(D) * 24 + E.hourNow();
  return { M: E.fatigueAt(state, tl, t), W: E.meterMorning(state, tl, E.dn(D)), restLine: (derived.clusterUntil != null && derived.clusterUntil >= E.dn(D)) ? E.settings(state).restLineClustered : E.settings(state).restLine };
};
E.anchorStatus = (state, D) => {
  const S = E.snapshot(state, D, null, {});
  const day = E.dn(D);
  return Object.keys(L.GROUPS).map(g => ({
    group: g,
    anchors: L.GROUPS[g].map(a => {
      const l = S.last['a:' + a];
      const ls = S.derived.lifts[a] || {};
      return { id: a, name: E.ex(state, variantOf(S, a) || a).name, gap: S.gap[a], last: l != null ? E.ds(l) : null, due: E.ds(anchorDue(S, a)), beats: ls.beats || 0, misses: ls.misses || 0, stalled: !!ls.stalled, out: sitsOut(S, a) };
    }),
    ready: groupReady(S, g, day), blocker: groupBlocker(S, g, day)
  }));
};

// ===========================================================================
// Running a session
// ===========================================================================
E.itemInfo = (state, it) => {
  if (it.ex) {
    const x = E.ex(state, it.ex);
    const title = it.role === 'addon' ? `${x.name}` : x.name;
    return { title, x, sub: it.role === 'anchor' ? 'Anchor' : it.role === 'staple' ? (it.extra ? `Extra compound · ${it.slot}` : `Staple · ${it.slot}`) : it.role === 'addon' ? `Must-train: ${E.areas(state)[it.area].name}` : it.section || '' };
  }
  return { title: it.title || '', x: null, sub: it.section || '' };
};
const VACUUM_POS = ['On all fours', 'Kneeling', 'Seated', 'Standing'];
E.startSession = (state, plan) => {
  const derived = E.derive(state);
  const items = plan.items.map((it, i) => {
    const c = Object.assign({ idx: i, sets: [], done: false, skipped: false }, clone(it));
    if (c.ex) {
      const x = E.ex(state, c.ex);
      const tg = E.target(state, derived, c.ex, plan.date);
      c.target = tg; c.cal = tg.mode === 'cal';
      c.rest = E.restFor(state, x, c.role);
      if (x.k === 'hold') c.sets = [{ s: null, done: false }, { s: null, done: false }];
      else if (x.k === 'carry') c.sets = [{ w: tg.w || null, m: null, done: false }, { w: tg.w || null, m: null, done: false }];
      else {
        const w = tg.w != null ? tg.w : null;
        const reps = tg.reps || [null, null];
        c.sets = [{ w, r: reps[0], done: false }, { w, r: reps[1], done: false }];
        c.ramp = (tg.ramp || []).map(z => ({ w: z.w, r: z.r, done: false }));
      }
    } else if (c.kind === 'vacuum') {
      // Positions get harder once a hold reaches 60 s: all fours → kneeling → seated → standing
      const p = derived.progress.vacuum;
      let pos = p ? (p.pos || 0) : 0;
      const best = p && p.holds.length ? Math.max(...p.holds) : 0;
      const up = !!p && best >= 60 && pos < VACUUM_POS.length - 1;
      if (up) pos++;
      c.position = pos;
      c.title = `Stomach vacuum: ${VACUUM_POS[pos].toLowerCase()}`;
      c.sets = [0, 1, 2, 3].map(k => ({ s: null, done: false }));
      c.target = { text: !p || up ? `${VACUUM_POS[pos]}: 4 holds, as long as you can` : `${VACUUM_POS[pos]}: beat ${p.holds.join(', ')} s (+5 s each)`,
        note: up ? 'Your best hold reached 60 s: next position.' : pos < VACUUM_POS.length - 1 ? 'A 60 s hold moves you to the next position.' : 'Final position: keep adding time.', hold: true };
      c.rest = 30;
    } else if (c.kind === 'circuit') {
      c.stationReps = {};
      c.targets = Object.fromEntries((c.stations || []).map(sid => [sid, derived.progress['st:' + sid] ? derived.progress['st:' + sid].value : null]));
    } else if (c.kind === 'interval' || c.kind === 'piece' || c.kind === 'swing' || c.kind === 'sprint') {
      const p = derived.progress['p:' + c.pid];
      c.value = null;
      if (c.kind === 'sprint') { c.targetValue = p ? Math.min(c.max || 99, p.value + 1) : c.base; const pt = derived.progress['t:' + c.pid]; c.bestTime = pt ? pt.best : null; }
      else c.targetValue = p ? p.value : null;
      if (c.kind === 'interval' && p && p.extra && c.timer && c.timer.rounds) {
        const add = p.extra * (c.timer.setEvery || 1);
        c.timer = Object.assign({}, c.timer, { rounds: c.timer.rounds + add });
        c.desc = `${c.desc} Longer now: +${add} round${add > 1 ? 's' : ''} (you beat it twice in a row${p.extra > 1 ? ', twice over' : ''}).`;
        c.min = (c.min || 15) + Math.round(add * ((c.timer.work || 0) + (c.timer.rest || 0)) / 60);
      }
    } else if (c.kind === 'drill') {
      const p = derived.progress['d:' + c.did];
      c.value = null; c.targetValue = p ? p.value : null;
    } else if (c.kind === 'bridge') {
      const p = derived.progress.bridge;
      c.holds = [null, null]; c.reps = [null, null];
      c.target = { text: p && p.level === c.level ? `Beat ${p.best} s hold and ${p.reps} rocks` : 'Baseline: 2 holds to failure, then rocks' };
    } else if (c.kind === 'checklist' || c.kind === 'warmup') {
      c.checks = (c.list || (c.kind === 'warmup' ? ['3-min fascia primer: pogo bounces, torsional rotations, arm swings', 'Joint prep: shoulders, hips, knees, ankles'] : [])).map(() => false);
      if (c.kind === 'warmup') c.list = ['3-min fascia primer: pogo bounces, torsional rotations, arm swings', 'Joint prep: shoulders, hips, knees, ankles', 'Crocodile breathing ×5 breaths'];
      c.checks = c.list.map(() => false);
    } else if (c.kind === 'walk') {
      c.doneMin = null;
      c.altTarget = derived.progress['p:cardio_alt'] ? derived.progress['p:cardio_alt'].value : null;
    }
    return c;
  });
  return { id: 'S' + E.now().toString(36), date: plan.date, type: plan.kind, group: plan.group, anchors: plan.anchors, block: plan.block,
    startedAt: new Date(E.now()).toISOString(), items, condLoad: plan.kind !== 'Strength' ? plan.load : null, why: plan.why, title: plan.title, current: 0, planMinutes: plan.minutes };
};
E.finishSession = (state, active) => {
  const s = clone(active);
  s.finishedAt = new Date(E.now()).toISOString();
  const now = new Date(E.now());
  s.hour = (E.localDate(now) === s.date) ? now.getHours() + now.getMinutes() / 60 : 18;
  delete s.current;
  s.cost = E.sessionCost(state, s);
  state.log.sessions.push(s);
  state.active = null;
  state.rev++;
  const derived = E.derive(state);
  return { session: s, results: derived.results[s.id] || [] };
};
E.resultsFor = (state, sid) => (E.derive(state).results[sid] || []);
E.alternatives = (state, it, sessionItems) => {
  const x0 = E.ex(state, it.ex);
  if (!x0) return [];
  const out = [];
  // Never offer another anchor, or something already in today's session
  const taken = new Set((sessionItems || []).filter(z => z && z.ex && !z.skipped).map(z => z.ex));
  for (const id of E.allExerciseIds(state)) {
    if (id === it.ex || taken.has(id) || E.isAnchor(id)) continue;
    const x = E.ex(state, id);
    if (!x || !E.equipOK(state, x) || E.disabled(state, id) || E.isTweaked(state, x)) continue;
    if (x.k !== x0.k && !(LIFT_KINDS.includes(x.k) && LIFT_KINDS.includes(x0.k))) continue;
    const shared = x.m.filter(m => x0.m.includes(m)).length;
    if (!shared) continue;
    const score = shared * 3 + x.h.filter(m => x0.h.includes(m) || x0.m.includes(m)).length - Math.abs(x.m.length - x0.m.length);
    out.push({ id, score, name: x.name });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
};

// ===========================================================================
// PRs and charts
// ===========================================================================
E.e1rm = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);
E.liftHistory = (state, exId) => {
  const d = E.derive(state);
  const x = E.ex(state, exId);
  const bw = state.profile.bodyweight || 75;
  return (d.book[exId] || []).map(e => {
    const best = e.sets.reduce((acc, z) => { const load = x.k === 'bwlift' ? bw + z.w : z.w; const v = E.e1rm(load, z.r); return v > acc.v ? { v, w: z.w, r: z.r } : acc; }, { v: 0 });
    return { date: e.date, day: e.day, sets: e.sets, outcome: e.outcome, e1rm: r1(best.v), top: best };
  });
};
E.prs = (state, exId) => {
  const h = E.liftHistory(state, exId);
  const byReps = {};
  let bestE = null;
  for (const e of h) for (const z of e.sets) {
    if (!(z.r > 0)) continue;
    const k = Math.min(z.r, 12);
    if (!byReps[k] || z.w > byReps[k].w) byReps[k] = { w: z.w, date: e.date };
    if (!bestE || e.e1rm > bestE.v) bestE = { v: e.e1rm, date: e.date };
  }
  return { byReps, bestE };
};
// New PRs set in a session (compared with everything logged before it)
E.sessionPRs = (state, sess) => {
  const out = [];
  for (const it of sess.items || []) {
    if (!it.ex) continue;
    const x = E.ex(state, it.ex);
    if (!x || !LIFT_KINDS.includes(x.k)) continue;
    const hist = E.liftHistory(state, it.ex).filter(e => e.date < sess.date || (e.date === sess.date && false));
    if (!hist.length) continue;
    const prev = {};
    for (const e of hist) for (const z of e.sets) { const k = z.r; if (prev[k] == null || z.w > prev[k]) prev[k] = z.w; }
    for (const z of (it.sets || []).filter(q => q && q.done)) {
      const heavierAtReps = Object.keys(prev).filter(k => +k >= z.r).every(k => z.w > prev[k]);
      const moreRepsAtWeight = Object.keys(prev).filter(k => prev[k] >= z.w).every(k => z.r > +k);
      if ((prev[z.r] == null || z.w > prev[z.r]) && heavierAtReps && moreRepsAtWeight) { out.push({ ex: it.ex, name: x.name, w: z.w, r: z.r, bw: x.k === 'bwlift' }); break; }
    }
  }
  return out;
};

E.version = '1.0.0';
})(typeof window !== 'undefined' ? window : globalThis);
