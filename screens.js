/* No Mercy — History, Progress, Body and Settings screens, and the sheets they open. */
(function (G) {
'use strict';
const E = G.NM_ENGINE, L = G.NM_LIB, U = G.NM_UI;
const esc = U.esc;
const S = {};
const ACT = {};
S.ACT = ACT;
G.NM_SCREENS = S;
const APP = () => G.NM_APP;
const openSecs = new Set();
let progLift = null;
let histMore = false;
const LIFTK = ['lift', 'bwlift', 'reps'];

// ===========================================================================
// Small helpers
// ===========================================================================
function topbar(kicker, title, right) {
  return `<div class="topbar"><div><div class="date">${esc(kicker)}</div><h1>${esc(title)}</h1></div>${right || ''}</div>`;
}
function ago(D) {
  const n = E.dn(E.today()) - E.dn(D);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
}
function wTxt(x, w) { return x && x.k === 'bwlift' ? (w ? `BW+${U.kg(w)}` : 'BW') : `${U.kg(w)} kg`; }
function setTxt(x, z) {
  if (!x || !z) return '';
  if (x.k === 'hold') return `${z.s} s`;
  if (x.k === 'carry') return `${U.kg(z.w)} kg × ${z.m} m`;
  if (x.k === 'reps') return `${z.r} reps`;
  return `${wTxt(x, z.w)} × ${z.r}`;
}
function sec(id, title, body, right) {
  return `<details class="sec" data-sec="${id}" ${openSecs.has(id) ? 'open' : ''}><summary><span>${title}${right ? ` <span class="tiny faint">${right}</span>` : ''}</span></summary><div class="body">${body}</div></details>`;
}
function durationMin(s) {
  if (!s.startedAt || !s.finishedAt) return null;
  const m = Math.round((new Date(s.finishedAt) - new Date(s.startedAt)) / 60000);
  return m > 0 && m < 400 ? m : null;
}
function pieceName(pid) {
  const lists = [L.SOVIET.intervals, L.FINISHERS.soviet, L.FINISHERS.jumps, L.TRACK.speed].concat(Object.values(L.TRACK.repeat));
  for (const l of lists) { const f = l.find(z => z.id === pid); if (f) return f.name; }
  if (pid === 'fascia_swing') return 'Kettlebell swing complex';
  return pid;
}
function pieceUnit(pid) {
  const lists = [L.SOVIET.intervals, L.FINISHERS.soviet, L.FINISHERS.jumps, L.TRACK.speed].concat(Object.values(L.TRACK.repeat));
  for (const l of lists) { const f = l.find(z => z.id === pid); if (f) return f.unit || ''; }
  return 'reps';
}
function stationName(sid) { const s = L.SOVIET.stations.find(z => z.id === sid); return s ? s.name : sid; }
function drill(did) { for (const sc of L.FASCIA.sections) { const d = sc.drills.find(z => z.id === did); if (d) return d; } return null; }
function color(v, st) { return v <= st.ready.main ? 'var(--good)' : v <= st.ready.help ? 'var(--warn)' : 'var(--bad)'; }
function anchorMap(st) {
  const m = {};
  for (const s of st.log.sessions) for (const it of s.items || []) if (it.anchor && it.ex) m[it.ex] = it.anchor;
  return m;
}
function areaIdeal(st, a) {
  const bd = E.blockDef(st.block.n, st);
  return a === 'neck' && bd.neckIdeal ? bd.neckIdeal : E.areas(st)[a].ideal;
}
function blockWeek(st) {
  const b = st.block;
  return b.start ? Math.floor((E.dn(E.today()) - E.dn(b.start)) / 7) + 1 : 1;
}

// ===========================================================================
// HISTORY
// ===========================================================================
S.history = A => {
  if (A.sub && A.sub.session) return detail(A, A.sub.session);
  const st = A.state;
  let h = topbar(`${U.plural(st.log.sessions.length, 'session')} · ${U.plural(st.log.games.length, 'game')}`, 'History');
  h += `<div class="card">${calendar(st)}</div>`;
  const rows = [];
  for (const s of st.log.sessions) rows.push({ date: s.date, k: 's' + (s.finishedAt || ''), s });
  for (const g of st.log.games) rows.push({ date: g.date, k: 'g' + String(g.hour || 0).padStart(5, '0'), g });
  rows.sort((a, b) => (a.date === b.date ? (a.k < b.k ? 1 : -1) : a.date < b.date ? 1 : -1));
  if (!rows.length) return h + `<div class="card mt12 empty">Nothing logged yet. Finished sessions and games show up here.</div>`;
  const shown = histMore ? rows : rows.slice(0, 40);
  h += `<div class="card mt12"><ul class="list">${shown.map(r => (r.s ? sessionRow(st, r.s) : gameRow(st, r.g))).join('')}</ul></div>`;
  if (rows.length > shown.length) h += `<button class="btn block mt12" data-act="h-more">Show all ${rows.length}</button>`;
  return h;
};
function sessionRow(st, s) {
  const res = E.resultsFor(st, s.id);
  const n = o => res.filter(r => r.outcome === o).length;
  const tags = [[n('beat'), 'beat', 'Beat'], [n('edge'), 'edge', 'Edge'], [n('miss') + n('miss-hard'), 'miss', 'Miss']].filter(t => t[0]).map(t => `<span class="badge ${t[1]}">${t[0]} ${t[2]}</span>`).join(' ');
  const mins = durationMin(s);
  return `<li class="tap" data-act="h-open" data-id="${s.id}"><div class="row between"><div class="grow"><div class="tiny faint">${esc(E.fmtDate(s.date))}${mins ? ` · ${mins} min` : ''}</div><div class="strong">${esc(s.title || s.type)}</div>${tags ? `<div class="mt8">${tags}</div>` : ''}</div><span class="faint">›</span></div></li>`;
}
function gameRow(st, g) {
  const sp = E.sports(st)[g.sport] || { name: g.sport };
  return `<li class="tap" data-act="game-edit" data-id="${g.id}"><div class="row between"><div class="grow"><div class="tiny faint">${esc(E.fmtDate(g.date))}${g.planned ? ' · planned' : ''}</div><div class="strong">${esc(sp.name)} <span class="badge neutral">Game</span></div><div class="small muted">${g.minutes} min · intensity ${g.intensity}${g.sore && g.sore.length ? ` · sore: ${esc(g.sore.map(E.muscleName).join(', '))}` : ''}</div></div><span class="faint">›</span></div></li>`;
}
function calendar(st) {
  const today = E.dn(E.today());
  const mon = (new Date(today * 864e5).getUTCDay() + 6) % 7;
  const end = today + (6 - mon), start = end - 41;
  const byDay = {};
  for (const s of st.log.sessions) {
    const d = E.dn(s.date);
    (byDay[d] = byDay[d] || []).push(s.type === 'Strength' ? (s.group || 'S') : ({ Soviet: 'So', Fascia: 'Fa', Track: 'Tr' }[s.type] || '•'));
  }
  const games = new Set(st.log.games.filter(g => !g.planned).map(g => E.dn(g.date)));
  const off = new Set();
  const wod = E.settings(st).weekOffDays;
  const addOff = a => { for (let k = 0; k < wod; k++) off.add(E.dn(a) + k); };
  for (const hh of st.block.history || []) if (hh.weekOffStart) addOff(hh.weekOffStart);
  if (st.block.weekOff) addOff(st.block.weekOff.start);
  let h = `<div class="row between"><h3>Last 6 weeks</h3></div><div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<div class="h">${x}</div>`).join('')}`;
  for (let d = start; d <= end; d++) {
    const tags = byDay[d] || [];
    const str = tags.some(t => t === 'A' || t === 'B' || t === 'C' || t === 'S');
    const cls = ['c', str ? 'str' : tags.length ? 'cond' : '', games.has(d) ? 'game' : '', d === today ? 'today' : '', off.has(d) ? 'off' : '', d > today ? 'future' : ''].filter(Boolean).join(' ');
    h += `<div class="${cls}"><span>${new Date(d * 864e5).getUTCDate()}</span><b>${esc(tags.join('+') || (games.has(d) ? 'G' : off.has(d) ? 'off' : ''))}</b></div>`;
  }
  h += `</div><div class="legend"><span><i style="background:var(--accent)"></i>Strength A/B/C</span><span><i style="background:var(--info)"></i>Soviet · Fascia · Track</span><span><i style="background:var(--warn)"></i>Game</span></div>`;
  return h;
}
function detail(A, sid) {
  const st = A.state;
  const s = st.log.sessions.find(z => z.id === sid);
  if (!s) { A.sub = null; return S.history(A); }
  const res = E.resultsFor(st, sid);
  const editing = !!A.sub.edit;
  const mins = durationMin(s);
  let h = `<div class="topbar"><button class="btn small" data-act="h-back">‹ History</button><button class="btn small ${editing ? 'primary' : ''}" data-act="h-edit">${editing ? 'Done' : 'Edit'}</button></div>`;
  h += `<div class="card"><div class="kicker">${esc(E.fmtDate(s.date))}${mins ? ` · ${mins} min` : ''}</div><h2>${esc(s.title || s.type)}</h2>`;
  if (s.why && s.why.length) h += `<ul class="why">${s.why.filter(Boolean).map(w => `<li>${esc(w)}</li>`).join('')}</ul>`;
  if (editing) h += `<p class="hint">Fix any number below. Outcomes, gaps and fatigue are recalculated from your corrected log.</p>`;
  h += `</div><div class="stack mt12">`;
  s.items.forEach((it, i) => { h += detailItem(st, s, it, i, res, editing); });
  h += `</div>`;
  if (editing) h += `<button class="btn danger block mt24" data-act="h-del" data-id="${s.id}">Delete this session</button>`;
  return h;
}
function detailItem(st, s, it, i, res, editing) {
  const x = it.ex ? E.ex(st, it.ex) : null;
  const info = x ? E.itemInfo(st, it) : { sub: it.section || '' };
  const name = x ? x.name : (it.title || it.ex || it.kind);
  const r = it.ex ? res.find(q => q.ex === it.ex) : null;
  const base = `s.hist.${s.id}.${i}`;
  const notLogged = `<div class="small muted mt8">Not logged</div>`;
  let h = `<div class="item ${it.skipped ? 'skipped' : ''}"><div class="head"><div class="grow"><div class="title">${esc(name)}</div><div class="meta">${esc(info.sub || (it.role === 'finisher' ? 'Finisher' : ''))}${it.swapped ? ' · swapped' : ''}</div></div>${r ? U.badge(r.outcome) : ''}</div>`;
  if (it.skipped) return h + `<div class="small muted mt8">Skipped</div></div>`;
  if (x && (LIFTK.includes(x.k) || x.k === 'hold' || x.k === 'carry')) {
    const sets = (it.sets || []).map((z, k) => ({ z, k })).filter(o => o.z && o.z.done);
    if (!sets.length) h += notLogged;
    else if (editing) {
      for (const { z, k } of sets) {
        if (x.k === 'hold') h += `<div class="setrow hold"><div class="lbl">Hold ${k + 1}</div>${U.stepper(`${base}.sets.${k}.s`, z.s, 5, { unit: 'seconds' })}</div>`;
        else if (x.k === 'carry') h += `<div class="setrow"><div class="lbl">#${k + 1}</div>${U.stepper(`${base}.sets.${k}.w`, z.w, 2.5, { unit: 'kg/hand' })}${U.stepper(`${base}.sets.${k}.m`, z.m, 5, { unit: 'metres' })}</div>`;
        else if (x.k === 'reps') h += `<div class="setrow hold"><div class="lbl">Set ${k + 1}</div>${U.stepper(`${base}.sets.${k}.r`, z.r, 1, { unit: 'reps' })}</div>`;
        else h += `<div class="setrow"><div class="lbl">Set ${k + 1}</div>${U.stepper(`${base}.sets.${k}.w`, z.w, x.k === 'bwlift' ? 2.5 : E.stepFor(st, x), { unit: x.k === 'bwlift' ? '+ kg' : 'kg' })}${U.stepper(`${base}.sets.${k}.r`, z.r, 1, { unit: 'reps' })}</div>`;
      }
    } else {
      h += `<div class="small mt8">${sets.map(o => esc(setTxt(x, o.z))).join(' · ')}</div>`;
      if (r && r.why) h += `<div class="tiny muted mt8">${esc(r.why)}</div>`;
      if (r) for (const e of r.extra) h += `<div class="tiny mt8">${esc(e)}</div>`;
    }
  } else if (it.kind === 'vacuum') {
    const sets = (it.sets || []).map((z, k) => ({ z, k })).filter(o => o.z && o.z.done);
    if (!sets.length) h += notLogged;
    else if (editing) for (const { z, k } of sets) h += `<div class="setrow hold"><div class="lbl">Hold ${k + 1}</div>${U.stepper(`${base}.sets.${k}.s`, z.s, 5, { unit: 'seconds' })}</div>`;
    else h += `<div class="small mt8">${sets.map(o => o.z.s + ' s').join(' · ')}</div>`;
  } else if (it.kind === 'walk') {
    if (!it.done) h += notLogged;
    else if (editing) h += `<div class="setrow hold"><div class="lbl">Done</div>${U.stepper(`${base}.doneMin`, it.doneMin, 1, { unit: 'minutes' })}</div>`;
    else h += `<div class="small mt8">${it.doneMin != null ? it.doneMin : it.min} min${it.alt || it.title !== 'Incline walk' ? ` on a stair climber, rower or bike${it.value != null ? ` · ${it.value} total` : ''}` : ` · ${it.speed} km/h · incline ${it.incline}${it.mode === 'intervals' ? ' · intervals' : ''}`}</div>`;
  } else if (['piece', 'interval', 'sprint', 'swing', 'drill'].includes(it.kind)) {
    const unit = it.kind === 'drill' ? (it.dk === 'hold' ? 's' : it.unit || 'reps') : (it.unit || '');
    if (!it.done) h += notLogged;
    else if (editing) h += `<div class="setrow hold"><div class="lbl">Total</div>${U.stepper(`${base}.value`, it.value, 1, { unit })}</div>`;
    else h += `<div class="small mt8">${esc(String(it.value))} ${esc(unit)}${it.time ? ` · best ${it.time} s` : ''}</div>`;
  } else if (it.kind === 'circuit') {
    const ids = Object.keys(it.stationReps || {});
    if (!ids.length) h += notLogged;
    else h += ids.map(sid => {
      const stn = L.SOVIET.stations.find(z => z.id === sid) || {};
      const u = stn.unit === 's' ? 's' : 'reps';
      return editing ? `<div class="station"><div class="strong small">${esc(stationName(sid))}</div>${U.stepper(`${base}.stationReps.${sid}`, it.stationReps[sid], u === 's' ? 5 : 1, { unit: u })}</div>`
        : `<div class="row between small mt8"><span>${esc(stationName(sid))}</span><b>${esc(String(it.stationReps[sid]))} ${u}</b></div>`;
    }).join('');
  } else if (it.kind === 'bridge') {
    if (!it.done) h += notLogged;
    else if (editing) for (let k = 0; k < 2; k++) h += `<div class="setrow"><div class="lbl">Set ${k + 1}</div>${U.stepper(`${base}.holds.${k}`, (it.holds || [])[k], 5, { unit: 'hold s' })}${U.stepper(`${base}.reps.${k}`, (it.reps || [])[k], 1, { unit: 'rocks' })}</div>`;
    else h += `<div class="small mt8">Holds ${(it.holds || []).filter(v => v != null).join(', ') || '–'} s · rocks ${(it.reps || []).filter(v => v != null).join(', ') || '–'}</div>`;
  } else if (it.list) {
    const n = (it.checks || []).filter(Boolean).length;
    h += `<div class="small muted mt8">${it.done ? 'Done' : `${n}/${it.list.length} ticked`}</div>`;
  }
  return h + `</div>`;
}
ACT['h-open'] = d => { const A = APP(); A.sub = { session: d.id }; A.render(); window.scrollTo(0, 0); };
ACT['h-back'] = () => { const A = APP(); A.sub = null; A.render(); };
ACT['h-edit'] = () => { const A = APP(); A.sub.edit = !A.sub.edit; A.render(); };
ACT['h-more'] = () => { histMore = true; APP().render(); };
ACT['h-del'] = d => {
  const A = APP();
  A.confirm('Delete this session?', 'It disappears from your log, and every outcome, gap and fatigue number after it is recalculated.', 'Delete', () => {
    A.mutate(st => { st.log.sessions = st.log.sessions.filter(z => z.id !== d.id); }, false);
    A.sub = null; A.render(); U.toast('Session deleted');
  }, true);
};

// ===========================================================================
// PROGRESS
// ===========================================================================
S.progress = A => {
  const st = A.state;
  const dv = E.derive(st);
  let h = topbar('Logbook, PRs and trends', 'Progress');
  const ids = Object.keys(dv.book).filter(id => dv.book[id].length && E.ex(st, id));
  if (!ids.length) return h + `<div class="card empty">Log your first session to see charts and PRs here.</div>` + otherNumbers(st, dv);
  const am = anchorMap(st);
  const anchorIds = [];
  for (const g of Object.keys(L.GROUPS)) for (const a of L.GROUPS[g]) for (const id of ids) if ((id === a || am[id] === a) && !anchorIds.includes(id)) anchorIds.push(id);
  const others = ids.filter(id => !anchorIds.includes(id)).sort((a, b) => dv.book[b].length - dv.book[a].length || E.ex(st, a).name.localeCompare(E.ex(st, b).name));
  const sel = ids.includes(progLift) ? progLift : (anchorIds[0] || others[0]);
  h += `<div class="chips">${anchorIds.map(id => `<button class="chip ${id === sel ? 'on' : ''}" data-act="p-lift" data-id="${id}">${esc(E.ex(st, id).name)}</button>`).join('')}</div>`;
  if (others.length) h += `<div class="field"><select class="input" data-sf="p-lift" aria-label="Other lifts"><option value="">Other lifts (${others.length})…</option>${others.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(E.ex(st, id).name)} (${dv.book[id].length})</option>`).join('')}</select></div>`;
  h += liftCard(st, dv, sel, am);
  h += otherNumbers(st, dv);
  return h;
};
function liftCard(st, dv, id, am) {
  const x = E.ex(st, id);
  const hist = E.liftHistory(st, id);
  const repsOnly = x.k === 'reps';
  const pts = hist.map(e => ({ x: e.day, y: repsOnly ? e.sets.reduce((a, z) => a + (z.r || 0), 0) : e.e1rm, c: e.outcome, t: `${e.date}: ${e.sets.map(z => setTxt(x, z)).join(', ')}` }));
  const key = am[id] || id;
  const ls = dv.lifts[key] || {};
  let h = `<div class="card mt12"><div class="row between"><h3>${esc(x.name)}</h3><span class="tiny faint">${U.plural(hist.length, 'session')}</span></div>
    <p class="sub">${repsOnly ? 'Total reps per session.' : `Estimated 1-rep max${x.k === 'bwlift' ? ' (bodyweight + added)' : ''} from your best set each session.`}</p>
    ${U.lineChart(pts, { xLabel: v => E.fmtDate(E.ds(v)).slice(4), label: `${x.name} trend` })}
    <div class="legend"><span><i style="background:var(--good)"></i>Beat</span><span><i style="background:var(--warn)"></i>Edge</span><span><i style="background:var(--bad)"></i>Miss</span><span><i style="background:var(--info)"></i>Baseline or other</span></div>`;
  if (ls.gap != null) h += `<div class="kv mt12"><div class="k">${am[id] ? `Gap (${esc(E.ex(st, key).name)})` : 'Gap'}</div><div>${ls.gap} days</div><div class="k">Streak</div><div>${ls.stalled ? '<span class="badge miss">Stalled</span>' : ls.misses ? `${U.plural(ls.misses, 'miss')} in a row`.replace('misss', 'misses') : ls.beats ? `${U.plural(ls.beats, 'Beat')} in a row` : '–'}</div></div>`;
  h += `</div>`;
  // PRs
  if (!repsOnly) {
    const pr = E.prs(st, id);
    const rows = Object.keys(pr.byReps).map(Number).sort((a, b) => a - b);
    if (rows.length) {
      h += `<div class="card mt12"><h3>Personal records</h3>${pr.bestE ? `<p class="sub">Best estimated max: <b>${U.kg(pr.bestE.v)} kg</b> (${esc(E.fmtDate(pr.bestE.date))})</p>` : ''}
        <table class="t mt12"><tr><th>Reps</th><th>Heaviest</th><th>When</th></tr>${rows.map(r => `<tr><td>${r === 12 ? '12+' : r}</td><td>${esc(wTxt(x, pr.byReps[r].w))}</td><td class="muted">${esc(E.fmtDate(pr.byReps[r].date))}</td></tr>`).join('')}</table></div>`;
    }
  }
  // Logbook
  h += `<div class="card mt12"><h3>Logbook</h3><ul class="list mt8">${hist.slice().reverse().slice(0, 30).map(e => `<li><div class="row between"><span class="tiny faint">${esc(E.fmtDate(e.date))}</span>${U.badge(e.outcome)}</div><div class="small mt8">${e.sets.map(z => esc(setTxt(x, z))).join(' · ')}</div></li>`).join('')}</ul></div>`;
  return h;
}
function otherNumbers(st, dv) {
  const rows = [];
  if (dv.walk) rows.push(['Incline walk', `${dv.walk.min} min · ${dv.walk.speed} km/h · incline ${dv.walk.incline}`, dv.walk.day]);
  const nw = E.nextWalk(st, dv);
  const p = dv.progress;
  if (p.vacuum) rows.push(['Stomach vacuum', p.vacuum.holds.join(', ') + ' s', p.vacuum.day]);
  if (p.bridge) rows.push([`Bridging: ${L.SOVIET.bridges[p.bridge.level].name}`, `${p.bridge.best} s hold · ${p.bridge.reps} rocks`, p.bridge.day]);
  for (const k of Object.keys(p)) {
    const v = p[k];
    if (k.startsWith('h:')) { const x = E.ex(st, k.slice(2)); if (x) rows.push([x.name, x.k === 'hold' ? `best ${v.best} s` : `${U.kg(v.w)} kg/hand · ${v.best} m`, v.day]); }
    else if (k === 'p:cardio_alt') rows.push(['Stair climber, rower or bike', `${v.value} total`, v.day]);
    else if (k.startsWith('p:')) rows.push([pieceName(k.slice(2)), `${v.value} ${pieceUnit(k.slice(2))}`, v.day]);
    else if (k.startsWith('t:')) rows.push([`${pieceName(k.slice(2))}: best time`, `${v.best} s`, v.day]);
    else if (k.startsWith('st:')) { const stn = L.SOVIET.stations.find(z => z.id === k.slice(3)) || {}; rows.push([stationName(k.slice(3)), `${v.value} ${stn.unit === 's' ? 's' : 'reps'}`, v.day]); }
    else if (k.startsWith('d:')) { const dr = drill(k.slice(2)) || {}; rows.push([dr.name || k.slice(2), `${v.value} ${dr.k === 'hold' ? 's' : dr.unit || 'reps'}`, v.day]); }
  }
  let h = `<div class="card mt12"><h3>Conditioning, holds and carries</h3><p class="sub">Your last number for each. Next incline walk: ${nw.mode === 'intervals' ? `${nw.min} min intervals` : `${nw.min} min at ${nw.speed} km/h, incline ${nw.incline}`}.</p>`;
  if (!rows.length) return h + `<div class="empty small">Nothing yet.</div></div>`;
  rows.sort((a, b) => b[2] - a[2]);
  h += `<table class="t mt12"><tr><th>What</th><th>Last</th><th>When</th></tr>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="muted">${esc(E.fmtDate(E.ds(r[2])).slice(4))}</td></tr>`).join('')}</table></div>`;
  return h;
}
ACT['p-lift'] = d => { progLift = d.id; APP().render(); };

// ===========================================================================
// BODY
// ===========================================================================
S.body = A => {
  const st = A.state, D = E.today();
  const sett = A.settings();
  const f = E.fatigueNow(st);
  const dv = E.derive(st);
  let h = topbar('Fatigue, gaps and flags', 'Body');
  // Whole-body meter
  const scale = Math.max(100, f.restLine * 1.4);
  const W = Math.round(f.W);
  const tl = E.timeline(st, null, dv.sportMult);
  const W2 = Math.round(E.meterMorning(st, tl, E.dn(D) + 1));
  h += `<div class="card"><div class="row between"><h3>Whole-body meter</h3><b style="font-size:22px">${W}</b></div>
    <p class="sub">This morning's number. ${W >= f.restLine ? `At or over the rest line (${f.restLine}): today is a rest day.` : `Rest day at ${f.restLine} or more.`}${f.restLine !== sett.restLine ? ' The line is lower for two weeks after two anchor misses.' : ''} With what's logged so far, tomorrow morning starts at <b>${W2}</b>.</p>
    <div class="meter"><div class="fl" style="width:${Math.min(100, W / scale * 100)}%;background:${W >= f.restLine ? 'var(--bad)' : W >= f.restLine * 0.75 ? 'var(--warn)' : 'var(--good)'}"></div><div class="line" style="left:${f.restLine / scale * 100}%"></div></div>
    <div class="legend"><span>Each session adds its cost; 35% drains away every day.</span></div></div>`;
  // Muscles
  const ms = L.MUSCLES.map(m => ({ id: m.id, name: m.name, v: f.M[m.id] || 0 })).sort((a, b) => b.v - a.v);
  h += `<div class="card mt12"><h3>Muscle fatigue now</h3><p class="sub">Halves every 24–48 h. Anchors and staples need their main muscles at ${sett.ready.main}% or under.</p>
    <div class="mt8">${ms.map(m => `<div class="mbar"><div class="nm">${esc(m.name)}</div><div class="tr"><div class="fl" style="width:${Math.min(100, m.v)}%;background:${color(m.v, sett)}"></div></div><div class="val">${Math.round(m.v)}</div></div>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--good)"></i>≤${sett.ready.main} ready</span><span><i style="background:var(--warn)"></i>≤${sett.ready.help} helpers only</span><span><i style="background:var(--bad)"></i>over ${sett.ready.help}: conditioning skips it</span></div></div>`;
  // Anchors
  const as = E.anchorStatus(st, D);
  h += `<div class="card mt12"><h3>Anchors</h3><p class="sub">Each group trains together when every lift in it is due and ready.</p>`;
  for (const g of as) {
    h += `<div class="secttl">Group ${g.group} · ${g.ready ? 'ready today' : esc(g.blocker)}</div><table class="t"><tr><th>Lift</th><th class="num">Gap</th><th>Last</th><th>Status</th></tr>`;
    for (const a of g.anchors) {
      const status = a.out ? `<span class="badge neutral">Sits out: ${esc(a.out)}</span>` : a.stalled ? '<span class="badge miss">Stalled</span>' : a.misses ? `<span class="badge miss">${a.misses} miss${a.misses > 1 ? 'es' : ''}</span>` : a.beats ? `<span class="badge beat">${a.beats} Beat${a.beats > 1 ? 's' : ''}</span>` : '<span class="faint">–</span>';
      h += `<tr><td>${esc(a.name)}</td><td class="num">${a.gap} d</td><td class="muted">${a.last ? esc(ago(a.last)) : 'never'}</td><td>${status}</td></tr>`;
    }
    h += `</table>`;
  }
  h += `</div>`;
  // Must-train areas and session types
  const today = E.dn(D);
  const since = key => dv.last[key] != null ? today - dv.last[key] : null;
  const bar = (n, ideal) => { const r = n == null ? 1 : n / ideal; return `<div class="ratio"><div style="width:${Math.min(100, r * 100 / 1.5)}%;background:${r >= 1 ? 'var(--accent)' : r >= 0.75 ? 'var(--warn)' : 'var(--good)'}"></div></div>`; };
  h += `<div class="card mt12"><h3>Days since</h3><p class="sub">Orange bars are due. Soviet, Fascia, Track and deadlifts count toward the areas they train.</p>`;
  const bd = E.blockDef(st.block.n, st);
  h += `<div class="secttl">Session types (block ${st.block.n})</div>`;
  for (const t of ['Soviet', 'Fascia', 'Track']) { const n = since('t:' + t); h += `<div class="mt12"><div class="row between small"><span class="strong">${t}</span><span class="muted">${n == null ? 'never' : `${n} d`} · ideal ${bd.ideal[t]}</span></div>${bar(n, bd.ideal[t])}</div>`; }
  h += `<div class="secttl">Must-train areas</div>`;
  for (const [a, ar] of Object.entries(E.areas(st))) { const n = since('r:' + a); const ideal = areaIdeal(st, a); h += `<div class="mt12"><div class="row between small"><span class="strong">${esc(ar.name)}</span><span class="muted">${n == null ? 'never' : `${n} d`} · ideal ${ideal}</span></div>${bar(n, ideal)}</div>`; }
  const xs = Object.keys(dv.last).filter(k => k.startsWith('x:')).map(k => ({ id: k.slice(2), n: today - dv.last[k] })).filter(z => E.ex(st, z.id)).sort((a, b) => b.n - a.n);
  h += `<details class="sec mt16" data-sec="body-all" ${openSecs.has('body-all') ? 'open' : ''} style="padding:0 12px"><summary><span class="small">Every exercise (${xs.length})</span></summary><div class="body"><table class="t">${xs.map(z => `<tr><td>${esc(E.ex(st, z.id).name)}</td><td class="num muted">${z.n} d</td></tr>`).join('')}</table></div></details></div>`;
  // Block
  const b = st.block;
  const wk = blockWeek(st);
  h += `<div class="card mt12"><h3>Block ${b.n}: ${esc(bd.name)}</h3><p class="sub">${esc(bd.emphasis)} · started ${b.start ? esc(E.fmtDate(b.start)) : '–'}</p>`;
  if (b.weekOff) {
    const left = E.dn(b.weekOff.start) + sett.weekOffDays - today;
    h += `<div class="banner mt12"><div class="grow"><b>Week off</b> (${esc(b.weekOff.why)}). ${U.plural(left, 'day')} left, then block ${E.nextBlock(st, b.n)}: ${esc(E.blockDef(E.nextBlock(st, b.n), st).name)}.</div></div>`;
    if (b.weekOff.why === 'started by you' && b.weekOff.start === D) h += `<button class="btn block mt12" data-act="weekoff-cancel">Cancel the week off</button>`;
  } else {
    h += `<div class="kv mt12"><div class="k">Week</div><div>${wk} of ${sett.blockMinWeeks}–${sett.blockMaxWeeks}</div><div class="k">Week off</div><div>${wk < sett.blockMinWeeks ? `from week ${sett.blockMinWeeks} if needed` : wk >= sett.blockMaxWeeks ? 'now' : `by end of week ${sett.blockMaxWeeks}`}</div></div>
      <button class="btn block mt12" data-act="weekoff-start">Start the week off now</button>`;
  }
  if ((b.history || []).length) h += `<div class="secttl">Past blocks</div><ul class="list">${b.history.map(x => `<li class="small">Block ${x.n}: ${esc(E.blockDef(x.n, st).name)} · ${esc(E.fmtDate(x.start))} → week off ${esc(E.fmtDate(x.weekOffStart))}</li>`).join('')}</ul>`;
  h += `</div>`;
  // Flags
  const tw = st.flags.tweaks;
  h += `<div class="card mt12"><h3>Flags</h3>
    <div class="toggle"><div><b>Tweaked joints</b><div class="small muted">${tw.length ? tw.map(z => esc(L.JOINTS.find(j => j.id === z.joint).name + (z.side ? ` (${z.side})` : ''))).join(', ') : 'None'}</div></div><button class="btn small" data-act="tweak">Manage</button></div>
    <div class="toggle"><div><b>Sick</b><div class="small muted">${st.flags.sick ? `Since ${esc(E.fmtDate(st.flags.sick.since))}: rest days until you clear it` : 'No'}</div></div><button class="btn small" data-act="sick">${st.flags.sick ? "I'm better" : "I'm sick"}</button></div>
    <div class="toggle"><div><b>Sore spots</b><div class="small muted">A check-in sets them to at least 60% this morning.</div></div><button class="btn small" data-act="checkin">Check in</button></div></div>`;
  return h;
};
ACT['weekoff-start'] = () => {
  const A = APP();
  const nb = E.nextBlock(A.state, A.state.block.n);
  A.confirm('Start the week off today?', `${A.settings().weekOffDays} days of easy walking only. Then block ${nb}, ${E.blockDef(nb, A.state).name}, starts and every anchor gap resets to ${A.settings().gap.anchorStart}.`, 'Start week off', () => {
    E.startWeekOff(A.state, E.today(), 'started by you');
    A.save(); A.render(); U.toast('Week off started');
  });
};
ACT['weekoff-cancel'] = () => { const A = APP(); A.mutate(st => { st.block.weekOff = null; }); U.toast('Week off cancelled'); };

// ===========================================================================
// SETTINGS
// ===========================================================================
const LABEL = {
  repLow: 'Rep range: bottom', repHigh: 'Rep range: top', beatReps: 'Extra reps for a Beat', beatsToShrink: 'Beats to shrink a gap', missAdd: 'Days added after a miss', missAdd2: 'Days added after a 2nd miss', tempo: 'Tempo (down-pause-up)', finishSet2: 'Set 2 past failure', finishBoth: 'Both sets past failure',
  'rest.big': 'Squat and deadlift', 'rest.anchor': 'Other anchors', 'rest.staple': 'Staples and extras', 'rest.iso': 'Isolation lifts', 'rest.small': 'Areas and holds',
  'gap.anchorStart': 'Anchor gap at start', 'gap.anchorFloor': 'Anchor gap: shortest', 'gap.anchorCeil': 'Anchor gap: longest', 'gap.bigFloor': 'Squat/deadlift: shortest', 'gap.bigCeil': 'Squat/deadlift: longest',
  'gap.stapleStart': 'Staple gap at start', 'gap.stapleFloor': 'Staple gap: shortest', 'gap.stapleCeil': 'Staple gap: longest', 'gap.areaStart': 'Add-on gap at start', 'gap.areaFloor': 'Add-on gap: shortest', 'gap.areaCeil': 'Add-on gap: longest',
  'spacing.squatDL': 'Squat ↔ deadlift', 'spacing.pullChin': 'Pull-ups ↔ chin-ups', 'spacing.press': 'Bench ↔ dips ↔ military',
  'ready.main': 'Main muscles', 'ready.help': 'Helper muscles', 'ready.addon': 'Add-on muscle', 'ready.cond': 'Conditioning skip line', 'ready.sprintHam': 'Sprints: hamstrings', 'ready.sprintOther': 'Sprints: calves, glutes, quads',
  'hl.big': 'Half-life: big muscles', 'hl.med': 'Half-life: medium', 'hl.small': 'Half-life: small', 'load.main': 'Per set: main muscles', 'load.help': 'Per set: helpers', 'load.minor': 'Per set: minor', 'load.finish': 'Past-failure finish', 'load.holdMain': 'Per hold: main', 'load.holdHelp': 'Per hold: helpers',
  'cost.strength2': 'Strength, 2 anchors', 'cost.strength3': 'Strength, 3 anchors', 'cost.Soviet': 'Soviet day', 'cost.Fascia': 'Fascia day', 'cost.Track': 'Track day', 'cost.game': 'Game (60 min at 10/10)',
  drain: 'Daily drain', restLine: 'Rest line', restLineClustered: 'Rest line after a miss cluster', maxStreak: 'Most days in a row', protectDays: 'Protect anchors (days ahead)', lookahead: 'Lookahead (days)',
  sessionMax: 'Session cap (min)', sessionMin: 'Session floor (min)', fillRatio: 'Top-up threshold', staplesUntil: 'Staples until (min)', addonsUntil: 'Add-ons until (min)', 'slots.A': 'Staples: group A', 'slots.B': 'Staples: group B', 'slots.C': 'Staples: group C', 'addons.A': 'Add-ons: group A', 'addons.B': 'Add-ons: group B', 'addons.C': 'Add-ons: group C',
  typeMinGap: 'Soviet/Fascia: min gap', trackMinGap: 'Track: min gap', overdueFactor: 'Overdue factor',
  'walk.start': 'Walk: start (min)', 'walk.max': 'Walk: cap (min)', 'walk.speed': 'Walk: start speed', 'walk.speedMax': 'Walk: top speed', 'walk.speedStep': 'Walk: speed step', 'walk.incline': 'Walk: start incline', 'walk.inclineMax': 'Walk: top incline',
  blockMinWeeks: 'Block: earliest end (weeks)', blockMaxWeeks: 'Block: latest end (weeks)', weekOffDays: 'Week off (days)'
};
const EXTRA_HELP = {
  tempo: 'Seconds down, pause in the stretch, seconds up.', 'gap.stapleFloor': 'Shortest gap a staple can reach.', 'gap.stapleCeil': 'Longest gap a staple can grow to.',
  'gap.areaStart': 'Minimum days between the same add-on exercise.', 'gap.areaFloor': 'Shortest add-on gap.', 'gap.areaCeil': 'Longest add-on gap.',
  'load.holdMain': 'Fatigue each hold or carry adds to its main muscles.', 'load.holdHelp': 'Fatigue each hold or carry adds to helpers.', 'walk.speedStep': 'Speed added each session once the walk is at its cap (km/h).'
};
const RULES = [
  ['Progression', ['repLow', 'repHigh', 'beatReps', 'beatsToShrink', 'missAdd', 'missAdd2', 'tempo', 'finishSet2', 'finishBoth']],
  ['Rest between sets (seconds)', ['rest.big', 'rest.anchor', 'rest.staple', 'rest.iso', 'rest.small']],
  ['Gaps and spacing (days)', ['gap.anchorStart', 'gap.anchorFloor', 'gap.anchorCeil', 'gap.bigFloor', 'gap.bigCeil', 'gap.stapleStart', 'gap.stapleFloor', 'gap.stapleCeil', 'gap.areaStart', 'gap.areaFloor', 'gap.areaCeil', 'spacing.squatDL', 'spacing.pullChin', 'spacing.press']],
  ['Readiness lines (%)', ['ready.main', 'ready.help', 'ready.addon', 'ready.cond', 'ready.sprintHam', 'ready.sprintOther']],
  ['Fatigue model', ['hl.big', 'hl.med', 'hl.small', 'load.main', 'load.help', 'load.minor', 'load.finish', 'load.holdMain', 'load.holdHelp', 'cost.strength2', 'cost.strength3', 'cost.Soviet', 'cost.Fascia', 'cost.Track', 'cost.game', 'drain', 'restLine', 'restLineClustered', 'maxStreak', 'protectDays', 'lookahead']],
  ['Session shape', ['sessionMax', 'sessionMin', 'fillRatio', 'staplesUntil', 'addonsUntil', 'slots.A', 'slots.B', 'slots.C', 'addons.A', 'addons.B', 'addons.C']],
  ['Conditioning and walk', ['typeMinGap', 'trackMinGap', 'overdueFactor', 'walk.start', 'walk.max', 'walk.speed', 'walk.speedMax', 'walk.speedStep', 'walk.incline', 'walk.inclineMax']],
  ['Blocks and week off', ['blockMinWeeks', 'blockMaxWeeks', 'weekOffDays']]
];
function setSetting(st, path, v) {
  st.settings = st.settings || {};
  const p = path.split('.');
  let o = st.settings;
  for (let k = 0; k < p.length - 1; k++) { if (o[p[k]] == null || typeof o[p[k]] !== 'object') o[p[k]] = {}; o = o[p[k]]; }
  o[p[p.length - 1]] = v;
  st.rev++;
}
function resetSetting(st, path) {
  const p = path.split('.');
  let o = st.settings || {};
  for (let k = 0; k < p.length - 1; k++) { o = o[p[k]]; if (!o) return; }
  delete o[p[p.length - 1]];
  if (p.length > 1 && st.settings[p[0]] && !Object.keys(st.settings[p[0]]).length) delete st.settings[p[0]];
  st.rev++;
}
function ruleRow(st, path) {
  const cur = E.getPath(E.settings(st), path), def = E.getPath(L.DEFAULTS, path);
  const changed = JSON.stringify(cur) !== JSON.stringify(def);
  const help = L.SETTINGS_HELP[path] || EXTRA_HELP[path] || '';
  let ctl;
  if (typeof def === 'boolean') ctl = `<div style="justify-self:end">${U.switch('set-bool', !!cur, `data-path="${path}"`)}</div>`;
  else if (typeof def === 'string') ctl = `<input class="input" data-sf="set.${path}" value="${esc(cur)}" aria-label="${esc(LABEL[path] || path)}">`;
  else ctl = `<input class="input" type="number" inputmode="decimal" step="any" data-bind="s.set.${path}" value="${esc(String(cur))}" aria-label="${esc(LABEL[path] || path)}">`;
  return `<div class="settingrow"><div><div class="strong small">${esc(LABEL[path] || path)}${changed ? ` <button class="badge info" style="border:0" data-act="set-reset" data-paths="${path}" aria-label="Reset to ${esc(String(def))}">reset to ${esc(String(def))}</button>` : ''}</div><div class="h">${esc(help)}</div></div>${ctl}</div>`;
}
S.settings = A => {
  const st = A.state;
  const sett = A.settings();
  let h = topbar('Everything is adjustable', 'Settings');
  // Display
  h += sec('display', 'Display and sound', `
    <div class="field"><div class="lab">Theme</div><div class="seg">${[['dark', 'Dark'], ['light', 'Light'], ['auto', 'Match phone']].map(([v, n]) => `<button data-act="set-theme" data-v="${v}" class="${sett.theme === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="toggle mt12"><div><b>Timer beeps</b><div class="small muted">Beeps when rest is over and between intervals. Needs the ringer on.</div></div>${U.switch('set-bool', sett.sound, 'data-path="sound"')}</div>
    <div class="toggle"><div><b>Morning check-in</b><div class="small muted">Asks for sore spots and sleep each morning.</div></div>${U.switch('set-bool', sett.checkin, 'data-path="checkin"')}</div>
    <button class="btn small mt12" data-act="beep">Test the beep</button>`);
  // Profile
  h += sec('profile', 'Profile', `
    <div class="settingrow"><div><div class="strong small">Bodyweight (kg)</div><div class="h">Used for bodyweight lifts' estimated max.</div></div><input class="input" type="number" inputmode="decimal" step="any" data-bind="s.prof.bodyweight" value="${esc(String(st.profile.bodyweight))}"></div>
    <div class="settingrow"><div><div class="strong small">Height (cm)</div></div><input class="input" type="number" inputmode="decimal" step="any" data-bind="s.prof.height" value="${esc(String(st.profile.height))}"></div>
    <div class="settingrow"><div><div class="strong small">Age</div></div><input class="input" type="number" inputmode="decimal" step="any" data-bind="s.prof.age" value="${esc(String(st.profile.age))}"></div>`);
  // Equipment
  const have = L.EQUIPMENT.filter(e => st.equipment[e.id]).length;
  h += sec('equip', 'Equipment', `<p class="sub">Exercises that need missing kit use their alternative until you tick it.</p>` + Object.entries(L.EQUIP_GROUPS).map(([g, gn]) => `<div class="secttl">${esc(gn)}</div>${L.EQUIPMENT.filter(e => e.group === g).map(e => `<div class="toggle"><span>${esc(e.name)}</span>${U.switch('equip', !!st.equipment[e.id], `data-id="${e.id}"`)}</div>`).join('')}`).join(''), `${have} ticked`);
  // Rules
  h += sec('rules', 'Training rules', `<p class="sub">Every number the planner uses. Changes apply from the next plan; your history is re-read with them.</p>` + RULES.map(([title, keys]) => `<div class="secttl">${esc(title)}</div>${keys.map(k => ruleRow(st, k)).join('')}<button class="btn tiny mt8" data-act="set-reset" data-paths="${keys.join('|')}">Reset ${esc(title.toLowerCase().replace(/ \(.*\)/, ''))} to defaults</button>`).join(''));
  // Library
  h += sec('lib', 'Exercise library', libBody(st), `${E.allExerciseIds(st).length}`);
  h += sec('slots', 'Staple slots and must-train areas', slotsBody(st));
  h += sec('blocks', 'Blocks', blocksBody(st));
  h += sec('sports', 'Sports', sportsBody(st));
  // Data
  const last = st.lastExport;
  h += sec('data', 'Backup and data', `
    <p class="sub">Everything lives only on this phone. ${last ? `Last backup: ${esc(E.fmtDate(last))} (${esc(ago(last))}).` : 'No backup yet.'}</p>
    <button class="btn primary block mt12" data-act="export">Export a backup</button>
    <label class="btn block mt12" for="import-file">Import a backup</label>
    <input type="file" id="import-file" accept=".json,application/json,text/plain" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true">
    <button class="btn block mt12" data-act="persist-check">Check storage protection</button>
    <button class="btn danger block mt24" data-act="reset-all">Delete all data</button>`);
  h += sec('about', 'About', `
    <div class="kv"><div class="k">Version</div><div>${esc(E.version)}</div><div class="k">Sessions logged</div><div>${st.log.sessions.length}</div><div class="k">Started</div><div>${st.startDate ? esc(E.fmtDate(st.startDate)) : '–'}</div></div>
    <ul class="why"><li>Strength first: a group trains when every anchor in it is past its gap and its muscles are recovered.</li><li>Otherwise the most due Soviet, Fascia or Track session, as long as it doesn't push the next strength day back.</li><li>Otherwise rest. Misses grow the gap; Beats shrink it.</li></ul>
    <button class="btn block mt12" data-act="sw-update">Check for updates</button>`);
  return h;
};
ACT['set-bool'] = d => { const A = APP(); const cur = !!E.getPath(A.settings(), d.path); A.mutate(st => { setSetting(st, d.path, !cur); st.rev--; }); };
ACT['set-theme'] = d => { const A = APP(); A.mutate(st => { setSetting(st, 'theme', d.v); st.rev--; }); };
ACT['set-reset'] = d => { const A = APP(); A.mutate(st => { for (const p of d.paths.split('|')) resetSetting(st, p); }); U.toast('Back to defaults'); };
ACT.beep = () => { U.unlockAudio(); setTimeout(() => U.beep(2, 880), 60); };

// ---------- Library ----------
const CATS = [['anchor', 'Anchors'], ['staple', 'Staples'], ['extra', 'Extra compounds'], ['area', 'Must-train areas'], ['variant', 'Alternatives'], ['custom', 'Your exercises']];
function exStatus(st, id) {
  const x = E.ex(st, id);
  if (E.disabled(st, id)) return 'Off';
  if (!E.equipOK(st, x)) { const r = E.resolve(st, id); return r ? `Missing kit: uses ${E.ex(st, r).name}` : 'Missing kit, no alternative'; }
  return [x.start != null && x.k === 'lift' ? `starts ${U.kg(x.start)} kg` : x.cal ? 'calibrates' : '', (x.e || []).map(e => (L.EQUIPMENT.find(q => q.id === e) || {}).name || e).join(', ')].filter(Boolean).join(' · ') || 'Bodyweight';
}
function libBody(st) {
  const ids = E.allExerciseIds(st);
  let h = `<div class="search"><input class="input" data-search="lib" placeholder="Search exercises" aria-label="Search exercises"></div><button class="btn block" data-act="ex-new">Add your own exercise</button>`;
  for (const [c, cn] of CATS) {
    const list = ids.filter(id => (c === 'custom' ? !!(st.library.custom || {})[id] : !(st.library.custom || {})[id] && E.ex(st, id).c === c)).sort((a, b) => E.ex(st, a).name.localeCompare(E.ex(st, b).name));
    if (!list.length) continue;
    h += `<div data-grp="1"><div class="secttl">${esc(cn)}</div><ul class="list">${list.map(id => { const x = E.ex(st, id); return `<li class="tap" data-act="ex-open" data-id="${id}" data-q="${esc((x.name + ' ' + id).toLowerCase())}"><div class="row between"><div class="grow"><div class="strong small">${esc(x.name)}</div><div class="tiny muted">${esc(exStatus(st, id))}</div></div><span class="faint">›</span></div></li>`; }).join('')}</ul></div>`;
  }
  return h;
}
function exSet(st, id, f, v) {
  const lib = st.library;
  if (lib.custom && lib.custom[id]) lib.custom[id][f] = v;
  else { lib.overrides = lib.overrides || {}; (lib.overrides[id] = lib.overrides[id] || {})[f] = v; }
  st.rev++;
}
function sheetEx(A, m) {
  const st = A.state, id = m.id;
  const x = E.ex(st, id);
  if (!x) return '<p>Not found.</p><button class="btn block mt12" data-act="modal-close">Close</button>';
  const custom = !!(st.library.custom || {})[id];
  const ov = (st.library.overrides || {})[id] || {};
  const anchor = E.isAnchor(id);
  const isLift = LIFTK.includes(x.k);
  const cat = (CATS.find(c => c[0] === x.c) || [0, ''])[1];
  let h = `<h2>${esc(x.name)}</h2><p class="sub">${esc(custom ? 'Your exercise' : cat)} · ${esc(exStatus(st, id))}</p>`;
  h += `<div class="field"><label>Name</label><input class="input" data-sf="lib.${id}.name" value="${esc(x.name)}"></div>`;
  if (custom) h += `<div class="field"><label>Type</label><select class="input" data-sf="lib.${id}.k">${[['lift', 'Weight × reps'], ['bwlift', 'Bodyweight + added weight'], ['reps', 'Bodyweight reps'], ['hold', 'Hold (seconds)'], ['carry', 'Carry (metres)']].map(([v, n]) => `<option value="${v}" ${x.k === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  if (isLift && x.k !== 'reps') {
    h += `<div class="field"><div class="lab">Starting weight (${x.k === 'bwlift' ? 'added kg' : 'kg'}), used until you log it once</div>${U.stepper(`s.lib.${id}.start`, x.start, 2.5, { unit: 'kg' })}</div>`;
    h += `<div class="field"><div class="lab">Weight step when you progress</div>${U.stepper(`s.lib.${id}.step`, x.step, 1.25, { unit: 'kg' })}</div>`;
  }
  if (x.k === 'lift' || x.k === 'bwlift') {
    const sett = E.settings(st);
    h += `<div class="field"><div class="lab">Rep range for this lift (blank = ${sett.repLow}–${sett.repHigh})</div><div class="row"><input class="input grow" type="number" inputmode="numeric" data-sf="lib.${id}.repLow" value="${x.repLow != null ? x.repLow : ''}" placeholder="${sett.repLow}" aria-label="Lowest reps"><span class="muted">to</span><input class="input grow" type="number" inputmode="numeric" data-sf="lib.${id}.repHigh" value="${x.repHigh != null ? x.repHigh : ''}" placeholder="${sett.repHigh}" aria-label="Highest reps"></div></div>`;
    h += `<div class="field"><label>Tempo for this lift (blank = ${esc(sett.tempo)})</label><input class="input" data-sf="lib.${id}.tempo" value="${esc(x.tempo || '')}" placeholder="${esc(sett.tempo)}"></div>`;
  }
  h += `<div class="field"><div class="lab">Kit it needs</div><div class="chips">${L.EQUIPMENT.map(e => `<button class="chip ${(x.e || []).includes(e.id) ? 'on' : ''}" data-act="lib-arr" data-id="${id}" data-f="e" data-v="${e.id}">${esc(e.name)}</button>`).join('')}</div></div>`;
  const altOpts = E.allExerciseIds(st).filter(o => o !== id).map(o => [o, E.ex(st, o).name]).sort((a, b) => a[1].localeCompare(b[1]));
  h += `<div class="field"><label>Alternative when kit is missing</label><select class="input" data-sf="lib.${id}.alt"><option value="">None</option>${altOpts.map(([o, n]) => `<option value="${o}" ${x.alt === o ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
  if (custom) {
    for (const [f, lab] of [['m', 'Main muscles'], ['h', 'Helper muscles']]) h += `<div class="field"><div class="lab">${lab}</div><div class="chips">${L.MUSCLES.filter(q => q.id !== 'impact').map(q => `<button class="chip ${(x[f] || []).includes(q.id) ? 'on' : ''}" data-act="lib-arr" data-id="${id}" data-f="${f}" data-v="${q.id}">${esc(q.name)}</button>`).join('')}</div></div>`;
    h += `<div class="field"><div class="lab">Joints it loads (removed when one is tweaked)</div><div class="chips">${L.JOINTS.map(j => `<button class="chip ${(x.j || []).includes(j.id) ? 'on' : ''}" data-act="lib-arr" data-id="${id}" data-f="j" data-v="${j.id}">${esc(j.name)}</button>`).join('')}</div></div>`;
    const slots = [];
    for (const g of Object.keys(L.GROUPS)) E.pools(st)[g].forEach((sl, k) => slots.push([`slot.${g}.${k}`, `Group ${g} · ${sl.slot}`]));
    for (const [a, ar] of Object.entries(E.areas(st))) slots.push([`area.${a}`, `Must-train · ${ar.name}`]);
    h += `<div class="field"><label>Put it in the plan</label><select class="input" data-sf="libadd.${id}"><option value="">Choose a staple slot or area…</option>${slots.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('')}</select><div class="tiny faint mt8">${esc(whereUsed(st, id) || 'Not in any slot or area yet. Until then it only appears as a swap.')}</div></div>`;
  } else if (whereUsed(st, id)) h += `<p class="tiny faint mt12">${esc(whereUsed(st, id))}</p>`;
  h += `<div class="field"><label>Form cues (one per line)</label><textarea class="input" data-sf="lib.${id}.cues">${esc((x.cues || []).join('\n'))}</textarea></div>`;
  h += `<div class="field"><label>How-to</label><textarea class="input" data-sf="lib.${id}.how">${esc(x.how || '')}</textarea></div>`;
  h += `<div class="field"><label>Note shown in the session</label><input class="input" data-sf="lib.${id}.note" value="${esc(x.note || '')}"></div>`;
  if (!anchor) h += `<div class="toggle mt12"><div><b>Use this exercise</b><div class="small muted">Off: the planner skips it (its alternative takes over).</div></div>${U.switch('lib-off', !E.disabled(st, id), `data-id="${id}"`)}</div>`;
  h += `<div class="row mt24">`;
  if (custom) h += `<button class="btn danger" data-act="lib-del" data-id="${id}">Delete</button>`;
  else if (Object.keys(ov).length) h += `<button class="btn" data-act="lib-reset" data-id="${id}">Reset</button>`;
  h += `<button class="btn primary grow" data-act="lib-done">Done</button></div>`;
  return h;
}
function whereUsed(st, id) {
  const out = [];
  for (const g of Object.keys(L.GROUPS)) E.pools(st)[g].forEach(sl => { if (sl.items[id] != null) out.push(`group ${g} ${sl.slot}`); });
  for (const [, ar] of Object.entries(E.areas(st))) if (ar.pool.includes(id)) out.push(ar.name);
  return out.length ? `In: ${out.join(', ')}.` : '';
}
ACT['ex-open'] = d => { const A = APP(); A.modal = { type: 'ex', id: d.id }; A.renderModal(); };
ACT['ex-new'] = () => {
  const A = APP();
  const id = 'c_' + E.now().toString(36);
  A.mutate(st => {
    st.library.custom = st.library.custom || {};
    st.library.custom[id] = { id, name: 'New exercise', k: 'lift', c: 'staple', m: ['chest'], h: [], n: [], j: [], e: [], alt: null, step: 2.5, start: null, cal: true, rest: 180, min: 8, iso: false, uni: false, cues: [], how: '', note: '', minGap: 0 };
  }, false);
  A.modal = { type: 'ex', id }; A.render();
};
ACT['lib-arr'] = d => {
  const A = APP();
  const cur = (E.ex(A.state, d.id)[d.f] || []).slice();
  const k = cur.indexOf(d.v);
  if (k >= 0) cur.splice(k, 1); else cur.push(d.v);
  if (d.f === 'm' && !cur.length) { U.toast('Pick at least one main muscle'); return; }
  exSet(A.state, d.id, d.f, cur); A.save(); A.renderModal();
};
ACT['lib-off'] = d => { const A = APP(); exSet(A.state, d.id, 'off', !E.disabled(A.state, d.id)); A.save(); A.renderModal(); };
ACT['lib-reset'] = d => { const A = APP(); delete A.state.library.overrides[d.id]; A.state.rev++; A.save(); A.renderModal(); U.toast('Back to the original'); };
ACT['lib-done'] = () => { const A = APP(); A.modal = null; A.render(); };
ACT['lib-del'] = d => {
  const A = APP();
  A.confirm('Delete this exercise?', 'It comes out of every slot and area. Sessions you already logged keep their numbers.', 'Delete', () => {
    A.mutate(st => {
      delete st.library.custom[d.id];
      if (st.library.pools) for (const g of Object.keys(st.library.pools)) for (const sl of st.library.pools[g]) delete sl.items[d.id];
      if (st.library.areas) for (const a of Object.keys(st.library.areas)) st.library.areas[a].pool = st.library.areas[a].pool.filter(z => z !== d.id);
    });
  }, true);
};

// ---------- Staple slots and areas ----------
function ensurePools(st) { if (!st.library.pools) st.library.pools = E.clone(L.POOLS); return st.library.pools; }
function ensureAreas(st) { if (!st.library.areas) st.library.areas = E.clone(L.AREAS); return st.library.areas; }
function slotsBody(st) {
  const pools = E.pools(st), areas = E.areas(st);
  let h = `<p class="sub">Each slot holds lifts with an ideal gap in days; the most overdue ready one wins the slot. Shorter gap = shows up more often.</p>`;
  for (const g of Object.keys(L.GROUPS)) {
    h += `<div class="secttl">Group ${g}: ${esc(L.GROUP_NAMES[g])}</div>`;
    pools[g].forEach((sl, k) => {
      h += `<div class="slot"><div class="row between"><b>${esc(sl.slot)}</b>${(sl.skipBlocks || []).length ? `<span class="tiny faint">skipped in block ${sl.skipBlocks.join(', ')}</span>` : ''}</div>`;
      for (const [id, v] of Object.entries(sl.items)) {
        const x = E.ex(st, id); if (!x) continue;
        const gap = typeof v === 'number' ? v : v.gap;
        const blocks = typeof v === 'object' && v.blocks ? ` · block ${v.blocks.join(', ')} only` : '';
        h += `<div class="it"><div><div class="small strong">${esc(x.name)}</div><div class="tiny faint">${esc(exStatus(st, id))}${blocks}</div></div><input class="input" type="number" inputmode="decimal" data-bind="s.pool.${g}.${k}.${id}" value="${gap}" aria-label="${esc(x.name)} ideal gap"><button class="btn tiny" data-act="pool-del" data-g="${g}" data-k="${k}" data-id="${id}" aria-label="Remove ${esc(x.name)}">✕</button></div>`;
      }
      h += `<button class="btn tiny mt8" data-act="pool-add" data-g="${g}" data-k="${k}">+ Add a lift</button></div>`;
    });
  }
  h += `<div class="secttl">Must-train areas</div><p class="sub">The app rotates through each pool, least recently used first.</p>`;
  for (const [a, ar] of Object.entries(areas)) {
    h += `<div class="slot"><div class="row between"><b>${esc(ar.name)}</b></div>
      <div class="settingrow" style="border:0"><div class="small">Ideal days between</div><input class="input" type="number" inputmode="decimal" data-bind="s.area.${a}" value="${ar.ideal}" aria-label="${esc(ar.name)} ideal days"></div>`;
    for (const id of ar.pool) {
      const x = E.ex(st, id); if (!x) continue;
      h += `<div class="it" style="grid-template-columns:1fr 44px"><div><div class="small strong">${esc(x.name)}</div><div class="tiny faint">${esc(exStatus(st, id))}</div></div><button class="btn tiny" data-act="area-del" data-a="${a}" data-id="${id}" aria-label="Remove ${esc(x.name)}">✕</button></div>`;
    }
    h += `<button class="btn tiny mt8" data-act="area-add" data-a="${a}">+ Add an exercise</button></div>`;
  }
  h += `<button class="btn block mt16" data-act="slots-reset">Reset slots and areas to defaults</button>`;
  return h;
}
function sheetPick(A, m) {
  const st = A.state;
  let ids = E.allExerciseIds(st).filter(id => !E.isAnchor(id));
  if (m.g) { const sl = E.pools(st)[m.g][m.k]; ids = ids.filter(id => LIFTK.includes(E.ex(st, id).k) && sl.items[id] == null); }
  else { const ar = E.areas(st)[m.a]; ids = ids.filter(id => !ar.pool.includes(id)); }
  ids.sort((a, b) => E.ex(st, a).name.localeCompare(E.ex(st, b).name));
  const title = m.g ? `Add to group ${m.g} · ${E.pools(st)[m.g][m.k].slot}` : `Add to ${E.areas(st)[m.a].name}`;
  return `<h2>${esc(title)}</h2><div class="search mt12"><input class="input" data-search="pick" placeholder="Search" aria-label="Search"></div>
    <div data-grp="1">${ids.map(id => `<div class="pickrow" data-q="${esc(E.ex(st, id).name.toLowerCase())}"><button class="btn block" style="justify-content:flex-start" data-act="pick" data-id="${id}">${esc(E.ex(st, id).name)}</button></div>`).join('')}</div>
    <button class="btn ghost block mt12" data-act="modal-close">Cancel</button>`;
}
ACT['pool-add'] = d => { const A = APP(); A.modal = { type: 'pick', g: d.g, k: +d.k }; A.renderModal(); };
ACT['area-add'] = d => { const A = APP(); A.modal = { type: 'pick', a: d.a }; A.renderModal(); };
ACT.pick = d => {
  const A = APP(); const m = A.modal;
  A.mutate(st => {
    if (m.g) ensurePools(st)[m.g][m.k].items[d.id] = 21;
    else ensureAreas(st)[m.a].pool.push(d.id);
  }, false);
  A.modal = null; A.render(); U.toast(m.g ? 'Added with a 21-day ideal gap' : 'Added');
};
ACT['pool-del'] = d => {
  const A = APP();
  const sl = E.pools(A.state)[d.g][+d.k];
  if (Object.keys(sl.items).length <= 1) { U.toast('A slot needs at least one lift'); return; }
  A.mutate(st => { delete ensurePools(st)[d.g][+d.k].items[d.id]; });
};
ACT['area-del'] = d => {
  const A = APP();
  if (E.areas(A.state)[d.a].pool.length <= 1) { U.toast('An area needs at least one exercise'); return; }
  A.mutate(st => { const ar = ensureAreas(st)[d.a]; ar.pool = ar.pool.filter(z => z !== d.id); });
};
ACT['slots-reset'] = () => { const A = APP(); A.confirm('Reset slots and areas?', 'Every staple slot and must-train pool goes back to the original lists.', 'Reset', () => A.mutate(st => { st.library.pools = null; st.library.areas = null; })); };

// ---------- Blocks ----------
const FIN_KINDS = ['walk', 'soviet', 'jumps'];
function blocksBody(st) {
  const sett = E.settings(st);
  let h = `<p class="sub">Each block sets how often Soviet, Fascia and Track days come (ideal days between them) and the finishers that end strength sessions, in turn: walk, soviet or jumps.</p>
    <div class="settingrow"><div><div class="strong small">Block order</div><div class="h">The order blocks run in, then it repeats.</div></div><input class="input" data-sf="blockorder" value="${esc(sett.blockOrder.join(', '))}" aria-label="Block order"></div>`;
  for (const n of [1, 2, 3, 4]) {
    const bd = E.blockDef(n, st);
    h += `<div class="secttl">Block ${n}: ${esc(bd.name)}</div><p class="small muted">${esc(bd.emphasis)}</p>`;
    for (const t of ['Soviet', 'Fascia', 'Track']) h += `<div class="settingrow"><div class="small">${t}: ideal days between</div><input class="input" type="number" inputmode="decimal" data-bind="s.block.${n}.${t}" value="${bd.ideal[t]}" aria-label="Block ${n} ${t} ideal days"></div>`;
    h += `<div class="field"><label>Finishers, in turn</label><input class="input" data-sf="blockfin.${n}" value="${esc(bd.finishers.join(', '))}" aria-label="Block ${n} finishers"></div>`;
    if (st.library.blocks && st.library.blocks[n]) h += `<button class="btn tiny mt8" data-act="block-reset" data-n="${n}">Reset block ${n}</button>`;
  }
  return h;
}
ACT['block-reset'] = d => { const A = APP(); A.mutate(st => { delete st.library.blocks[d.n]; }); };

// ---------- Sports ----------
function sportsBody(st) {
  const sp = E.sports(st);
  return `<p class="sub">Fatigue points per 60 min at intensity 10, scaled by your minutes and intensity.</p><ul class="list">${Object.entries(sp).map(([id, s]) => {
    const top = Object.entries(s.load || {}).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, v]) => `${E.muscleName(m).toLowerCase()} ${v}`).join(', ');
    return `<li class="tap" data-act="sport-open" data-id="${id}"><div class="row between"><div class="grow"><div class="strong small">${esc(s.name)}</div><div class="tiny muted">${esc(top || (id === 'other' ? 'You pick the body parts each time' : 'No load set'))}</div></div><span class="faint">›</span></div></li>`;
  }).join('')}</ul><button class="btn block mt12" data-act="sport-new">Add a sport</button>`;
}
function sheetSport(A, m) {
  const st = A.state, id = m.id;
  const s = E.sports(st)[id];
  if (!s) return '<p>Not found.</p><button class="btn block mt12" data-act="modal-close">Close</button>';
  const custom = !L.SPORTS[id];
  const changed = !custom && st.library.sports && st.library.sports[id];
  let h = `<h2>${esc(s.name)}</h2><p class="sub">Points each muscle gets from 60 min at intensity 10. 0 = not loaded.</p>`;
  if (custom) h += `<div class="field"><label>Name</label><input class="input" data-sf="sportname.${id}" value="${esc(s.name)}"></div>`;
  if (id === 'other') h += `<p class="small muted mt12">"Other" asks which body parts it worked each time you log it.</p>`;
  else h += L.MUSCLES.map(q => `<div class="settingrow"><div class="small">${esc(q.name)}</div><input class="input" type="number" inputmode="decimal" data-bind="s.sport.${id}.${q.id}" value="${(s.load || {})[q.id] || 0}" aria-label="${esc(q.name)}"></div>`).join('');
  h += `<div class="row mt24">${custom ? `<button class="btn danger" data-act="sport-del" data-id="${id}">Delete</button>` : changed ? `<button class="btn" data-act="sport-reset" data-id="${id}">Reset</button>` : ''}<button class="btn primary grow" data-act="lib-done">Done</button></div>`;
  return h;
}
ACT['sport-open'] = d => { const A = APP(); A.modal = { type: 'sport', id: d.id }; A.renderModal(); };
ACT['sport-new'] = () => {
  const A = APP(); const id = 'sp_' + E.now().toString(36);
  A.mutate(st => { st.library.sports = st.library.sports || {}; st.library.sports[id] = { name: 'New sport', load: { quads: 20, calves: 20, impact: 20 } }; }, false);
  A.modal = { type: 'sport', id }; A.render();
};
ACT['sport-reset'] = d => { const A = APP(); delete A.state.library.sports[d.id]; A.state.rev++; A.save(); A.renderModal(); };
ACT['sport-del'] = d => {
  const A = APP();
  if (A.state.log.games.some(g => g.sport === d.id)) { U.toast('Games use this sport, so it stays. Set its loads to 0 instead.'); return; }
  A.mutate(st => { delete st.library.sports[d.id]; }, false); A.modal = null; A.render();
};

// ---------- Backup and data ----------
ACT.export = async () => {
  const A = APP(); const st = A.state;
  const prev = st.lastExport;
  st.lastExport = E.today();   // the backup carries its own date
  const data = JSON.stringify(st, (k, v) => (k === '_derived' ? undefined : v));
  const r = await U.shareFile(`no-mercy-backup-${E.today()}.json`, data, 'application/json');
  if (r === 'cancelled') { st.lastExport = prev; return; }
  A.save(); A.render();
  U.toast(r === 'shared' ? 'Backup ready. Save it to Files or iCloud Drive.' : 'Backup downloaded');
};
function importFile(A, el) {
  const f = el.files && el.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    let obj = null;
    try { obj = JSON.parse(rd.result); } catch (e) { obj = null; }
    el.value = '';
    if (!obj || obj.app !== 'no-mercy' || !obj.log || !Array.isArray(obj.log.sessions)) { U.toast("That file isn't a No Mercy backup"); return; }
    A.confirm('Replace everything with this backup?', `${U.plural(obj.log.sessions.length, 'session')} and ${U.plural((obj.log.games || []).length, 'game')}${obj.lastExport ? `, saved ${E.fmtDate(obj.lastExport)}` : ''}. What's on this phone now is replaced.`, 'Replace', () => {
      delete obj._derived; obj.today = null;
      A.state = E.migrate(obj); A.state.rev = (A.state.rev || 0) + 1;
      A.saveNow(); A.tab = 'today'; A.sub = null; A.render(); window.scrollTo(0, 0);
      U.toast('Backup restored');
    }, true);
  };
  rd.readAsText(f);
}
ACT['persist-check'] = async () => {
  let ok = false;
  try { ok = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false; if (!ok) ok = await U.persist(); } catch (e) { ok = false; }
  U.toast(ok ? 'Protected: the phone won\'t clear it to save space.' : 'Not protected by the browser. Keep exporting backups.');
};
ACT['reset-all'] = () => {
  const A = APP();
  A.confirm('Delete all data?', 'Every session, game, setting and library edit on this phone is deleted. Export a backup first if you might want it.', 'Delete everything', () => {
    A.state = E.newState(); A.saveNow(); A.tab = 'today'; A.sub = null; A.render(); window.scrollTo(0, 0);
  }, true);
};
ACT['sw-update'] = async () => {
  const A = APP();
  if (!A.swReg) { U.toast('Updates work once the app is opened from its web address'); return; }
  try { await A.swReg.update(); U.toast(A.swReg.waiting || A.swReg.installing ? 'Update found: tap Reload at the top' : "You're on the latest version"); }
  catch (e) { U.toast('Offline: try again when connected'); }
};

// ===========================================================================
// Bindings, inputs and sheets (called by app.js)
// ===========================================================================
S.setBind = (A, bind, v) => {
  const st = A.state;
  const p = bind.split('.');
  if (v == null || (typeof v === 'number' && isNaN(v))) return;
  const kind = p[1];
  if (kind === 'set') return setSetting(st, p.slice(2).join('.'), v);
  if (kind === 'prof') { st.profile[p[2]] = v; st.rev++; return; }
  if (kind === 'lib') return exSet(st, p[2], p[3], v);
  if (kind === 'sport') { const sp = st.library.sports = st.library.sports || {}; sp[p[2]] = sp[p[2]] || {}; sp[p[2]].load = sp[p[2]].load || {}; sp[p[2]].load[p[3]] = v; st.rev++; return; }
  if (kind === 'pool') { const sl = ensurePools(st)[p[2]][+p[3]]; const cur = sl.items[p[4]]; if (cur && typeof cur === 'object') cur.gap = v; else sl.items[p[4]] = v; st.rev++; return; }
  if (kind === 'area') { ensureAreas(st)[p[2]].ideal = v; st.rev++; return; }
  if (kind === 'block') { if (!(v > 0)) return; const bl = st.library.blocks = st.library.blocks || {}; const b = bl[p[2]] = bl[p[2]] || {}; b.ideal = Object.assign({}, b.ideal || {}, { [p[3]]: v }); st.rev++; return; }
  if (kind === 'hist') {
    const s = st.log.sessions.find(z => z.id === p[2]);
    if (!s) return;
    let o = s.items[+p[3]];
    for (let k = 4; k < p.length - 1; k++) { if (o[p[k]] == null) o[p[k]] = {}; o = o[p[k]]; }
    o[p[p.length - 1]] = v; st.rev++;
  }
};
S.getBind = (A, bind) => {
  const st = A.state;
  const p = bind.split('.');
  const kind = p[1];
  if (kind === 'set') return E.getPath(E.settings(st), p.slice(2).join('.'));
  if (kind === 'prof') return st.profile[p[2]];
  if (kind === 'lib') { const x = E.ex(st, p[2]); return x ? x[p[3]] : null; }
  if (kind === 'sport') { const s = E.sports(st)[p[2]]; return s && s.load ? s.load[p[3]] || 0 : 0; }
  if (kind === 'pool') { const v = E.pools(st)[p[2]][+p[3]].items[p[4]]; return typeof v === 'object' ? v.gap : v; }
  if (kind === 'area') return E.areas(st)[p[2]].ideal;
  if (kind === 'block') return E.blockDef(+p[2], st).ideal[p[3]];
  if (kind === 'hist') {
    const s = st.log.sessions.find(z => z.id === p[2]);
    if (!s) return null;
    let o = s.items[+p[3]];
    for (let k = 4; k < p.length; k++) { if (o == null) return null; o = o[p[k]]; }
    return o;
  }
  return null;
};
S.liveInput = ev => !!(ev.target && ev.target.dataset && ev.target.dataset.search);
function filterSearch(el) {
  const q = el.value.trim().toLowerCase();
  const scope = el.closest('.sheet') || el.closest('details') || document;
  scope.querySelectorAll('[data-q]').forEach(r => r.classList.toggle('hidden', !!q && !r.dataset.q.includes(q)));
  scope.querySelectorAll('[data-grp]').forEach(g => g.classList.toggle('hidden', !g.querySelector('[data-q]:not(.hidden)')));
}
S.onInput = (A, ev) => {
  const el = ev.target;
  if (el.dataset.search) return filterSearch(el);
  if (el.id === 'import-file') { if (ev.type === 'change') importFile(A, el); return; }
  const f = el.dataset.sf;
  if (!f || ev.type !== 'change') return;
  const p = f.split('.');
  const st = A.state;
  if (p[0] === 'p-lift') { if (el.value) { progLift = el.value; A.render(); } return; }
  if (p[0] === 'set') {
    const path = p.slice(1).join('.');
    const v = el.value.trim();
    if (path === 'tempo' && !/^\d+-\d+-\d+$/.test(v)) { U.toast('Tempo looks like 4-1-2'); el.value = E.settings(st).tempo; return; }
    setSetting(st, path, v); A.save(); return;
  }
  if (p[0] === 'blockorder') {
    const v = el.value.split(/[^0-9]+/).filter(Boolean).map(Number);
    if (!v.length || v.some(n => !L.BLOCKS[n]) || new Set(v).size !== v.length) { U.toast('Use block numbers 1–4, each once, e.g. 1, 2, 3, 4'); el.value = E.settings(st).blockOrder.join(', '); return; }
    setSetting(st, 'blockOrder', v); A.save(); return;
  }
  if (p[0] === 'blockfin') {
    const v = el.value.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    if (!v.length || v.some(k => !FIN_KINDS.includes(k))) { U.toast('Use walk, soviet or jumps, separated by commas'); el.value = E.blockDef(+p[1], st).finishers.join(', '); return; }
    const bl = st.library.blocks = st.library.blocks || {}; (bl[p[1]] = bl[p[1]] || {}).finishers = v; st.rev++; A.save(); return;
  }
  if (p[0] === 'lib' && (p[2] === 'repLow' || p[2] === 'repHigh')) {
    const id = p[1], x = E.ex(st, id), sett = E.settings(st);
    const v = el.value.trim() === '' ? null : Math.round(+el.value);
    const lo = p[2] === 'repLow' ? v : (x.repLow != null ? x.repLow : null), hi = p[2] === 'repHigh' ? v : (x.repHigh != null ? x.repHigh : null);
    const L0 = lo == null ? sett.repLow : lo, H0 = hi == null ? sett.repHigh : hi;
    if (v != null && !(v >= 1)) { el.value = x[p[2]] != null ? x[p[2]] : ''; return; }
    if (L0 >= H0) {
      // A new bottom above the top lifts the top with it (keeps a 4-rep range); a top under the bottom is refused
      if (p[2] === 'repHigh') { U.toast('The top of the range must be above the bottom'); el.value = x.repHigh != null ? x.repHigh : ''; return; }
      exSet(st, id, 'repHigh', L0 + 4);
      U.toast(`Top of the range raised to ${L0 + 4}`);
    }
    exSet(st, id, p[2], v); A.save(); A.renderModal(); return;
  }
  if (p[0] === 'lib' && p[2] === 'tempo') {
    const v = el.value.trim();
    if (v && !/^\d+-\d+-\d+$/.test(v)) { U.toast('Tempo looks like 4-1-2'); el.value = E.ex(st, p[1]).tempo || ''; return; }
    exSet(st, p[1], 'tempo', v || null); A.save(); return;
  }
  if (p[0] === 'lib') {
    const id = p[1], field = p[2];
    let v = el.value;
    if (field === 'cues') v = v.split('\n').map(z => z.trim()).filter(Boolean);
    else if (field === 'alt') v = v || null;
    else v = v.trim();
    if (field === 'name' && !v) { U.toast('A name is needed'); el.value = E.ex(st, id).name; return; }
    if (field === 'alt' && v && altLoops(st, id, v)) { U.toast("That would loop back to this exercise"); el.value = E.ex(st, id).alt || ''; return; }
    exSet(st, id, field, v); A.save();
    if (field === 'k' || field === 'alt' || field === 'name') A.renderModal();
    return;
  }
  if (p[0] === 'libadd') {
    const id = p[1], where = el.value.split('.');
    if (!el.value) return;
    if (where[0] === 'slot') { ensurePools(st)[where[1]][+where[2]].items[id] = 21; }
    else ensureAreas(st)[where[1]].pool.push(id);
    st.rev++; A.save(); A.renderModal(); U.toast('Added to the plan');
    return;
  }
  if (p[0] === 'sportname') { const v = el.value.trim(); if (!v) return; const sp = st.library.sports; sp[p[1]] = sp[p[1]] || {}; sp[p[1]].name = v; st.rev++; A.save(); A.renderModal(); }
};
function altLoops(st, id, alt) {
  let cur = alt, n = 0;
  while (cur && n < 10) { if (cur === id) return true; const x = E.ex(st, cur); cur = x ? x.alt : null; n++; }
  return false;
}
S.modal = (A, m) => {
  if (m.type === 'ex') return sheetEx(A, m);
  if (m.type === 'pick') return sheetPick(A, m);
  if (m.type === 'sport') return sheetSport(A, m);
  return '';
};
// Remember which collapsible sections are open across re-renders
document.addEventListener('toggle', ev => {
  const d = ev.target;
  if (d && d.matches && d.matches('details[data-sec]')) { if (d.open) openSecs.add(d.dataset.sec); else openSecs.delete(d.dataset.sec); }
}, true);
})(window);
