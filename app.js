/* No Mercy — app shell, Today screen, live session logging, timers and quick-action sheets. */
(function (G) {
'use strict';
const E = G.NM_ENGINE, L = G.NM_LIB, U = G.NM_UI;
const esc = U.esc;
const A = { state: null, tab: 'today', modal: null, sub: null, timer: null, sw: null, saveT: null, open: {}, focus: null, swReg: null };
G.NM_APP = A;

// ===========================================================================
// State
// ===========================================================================
A.save = () => { clearTimeout(A.saveT); A.saveT = setTimeout(() => { A.saveT = null; U.save(A.state); }, 150); };
A.saveNow = () => { clearTimeout(A.saveT); A.saveT = null; return U.save(A.state); };
A.mutate = (fn, render) => { fn(A.state); A.state.rev++; A.save(); if (render !== false) A.render(); };
A.touch = render => { A.save(); if (render !== false) A.render(); };
A.plan = force => {
  const st = A.state, D = E.today();
  const c = st.today;
  if (!force && c && c.date === D && c.rev === st.rev && c.v === E.version) return c;
  E.housekeeping(st, D);
  const plan = E.plan(st, D);
  let forecast = [];
  try { forecast = E.forecast(st, D, plan); } catch (e) { console.error(e); }
  st.today = { date: D, rev: st.rev, v: E.version, plan, forecast };
  A.save();
  return st.today;
};
A.settings = () => E.settings(A.state);

// ===========================================================================
// Rendering
// ===========================================================================
// Replace a container's HTML safely: blur a focused field inside it first, so its change event
// runs while the page is intact (removing a focused field mid-update can fire events during the update)
function setHTML(el, html) {
  const ae = document.activeElement;
  if (ae && ae !== document.body && el.contains(ae)) { try { ae.blur(); } catch (e) { /* ignore */ } }
  el.innerHTML = html;
}
let rendering = false, renderAgain = false;
A.render = () => {
  if (rendering) { renderAgain = true; return; }
  rendering = true;
  try { renderNow(); } finally { rendering = false; }
  if (renderAgain) { renderAgain = false; setTimeout(A.render, 0); }
};
function renderNow() {
  const root = document.getElementById('app');
  if (!A.state) return;
  const theme = A.settings().theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  let html;
  try {
    if (!A.state.startDate && !A.state.log.sessions.length) html = A.viewWelcome();
    else if (A.tab === 'today') html = A.state.active ? A.viewSession() : A.viewToday();
    else html = G.NM_SCREENS[A.tab](A);
  } catch (e) {
    console.error(e);
    html = `<div class="card"><h2>Something went wrong</h2><p class="muted small">${esc(e.message)}</p><button class="btn block mt12" data-act="replan">Try again</button></div>`;
  }
  setHTML(root, html);
  A.renderTabs();
  A.renderTimer();
  A.renderModal();
  if (A.focus != null) {
    const el = document.getElementById('item-' + A.focus);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    A.focus = null;
  }
}
A.renderTabs = () => {
  const bar = document.getElementById('tabbar');
  const welcome = !A.state.startDate && !A.state.log.sessions.length;
  bar.classList.toggle('hidden', welcome);
  const tabs = [['today', 'Today'], ['history', 'History'], ['progress', 'Progress'], ['body', 'Body'], ['settings', 'Settings']];
  bar.innerHTML = `<div class="in">${tabs.map(([id, nm]) => `<button data-act="tab" data-tab="${id}" class="${A.tab === id ? 'on' : ''}" aria-label="${nm}">${U.icon[id]}<span>${nm}</span></button>`).join('')}</div>`;
};

// ===========================================================================
// Welcome (first run)
// ===========================================================================
A.viewWelcome = () => {
  const unsure = L.EQUIPMENT.filter(e => e.group === 'unsure');
  return `<div class="welcome stack">
    <div class="mt24"><div class="kicker">Offline training planner</div><h1>No Mercy</h1>
    <p class="lead">Every morning: one brutal session built from your full history, or a rest day your body has earned.</p></div>
    <div class="card"><ol>
      <li>Seven anchor lifts in three groups, two all-out sets each, back when recovered.</li>
      <li>Soviet, Fascia and Track days fill the free days, but never at strength's expense.</li>
      <li>Log games and sore spots; the app re-plans around them.</li>
    </ol></div>
    <div class="card"><h3>Your bodyweight</h3><p class="sub">Used for bodyweight lifts and charts.</p>
      <div class="mt12">${U.stepper('w.bw', A.state.profile.bodyweight, 0.5, { unit: 'kg', label: 'Bodyweight' })}</div></div>
    <div class="card"><h3>Kit you weren't sure about</h3><p class="sub">Tick what your gym has. Until then, the app uses the alternatives. You can change this any time in Settings.</p>
      <div class="mt8">${unsure.map(e => `<div class="toggle"><span>${esc(e.name)}</span>${U.switch('equip', !!A.state.equipment[e.id], `data-id="${e.id}"`)}</div>`).join('')}</div></div>
    <button class="btn primary big" data-act="begin">Start today</button>
    <label class="btn ghost block" for="import-file">Restore from a backup</label>
    <input type="file" id="import-file" accept=".json,application/json,text/plain" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true">
    <p class="tiny faint center">All data stays on this phone. Export a backup from Settings now and then.</p>
  </div>`;
};

// ===========================================================================
// Today
// ===========================================================================
A.blockWeek = () => { const b = A.state.block; return b.start ? Math.floor((E.dn(E.today()) - E.dn(b.start)) / 7) + 1 : 1; };
A.away = () => { const a = A.state.flags.away; return a && E.today() >= a.from && E.today() <= a.until ? a : null; };
const LOC_NAME = { gym: 'a gym', field: 'a field or track', bodyweight: 'bodyweight only' };
function topbar(plan) {
  const D = E.today();
  const b = A.state.block;
  const wk = A.blockWeek();
  return `<div class="topbar"><div><div class="date">${esc(E.fmtDate(D))}</div><h1>Today</h1></div>
    <div class="badge info" title="${esc(E.blockDef(b.n, A.state).name)}">${b.weekOff ? 'Week off' : `Block ${b.n} · wk ${wk}`}</div></div>`;
}
function targetLine(it, D) {
  if (it.ex) {
    const tg = E.target(A.state, E.derive(A.state), it.ex, D);
    return tg.text || '';
  }
  if (it.kind === 'walk') return walkText(it);
  if (it.kind === 'piece') return `${it.min} min · ${it.desc || ''}`;
  if (it.kind === 'vacuum') return '4 holds, +5 s on last time';
  if (it.kind === 'circuit') return `${it.rounds} rounds × ${it.stations.length} stations, ${it.work} s on / ${it.move} s move`;
  if (it.kind === 'interval' || it.kind === 'sprint') return it.desc || '';
  if (it.kind === 'drill') return it.cue || '';
  if (it.kind === 'bridge') return '2 holds to failure, then rocks';
  if (it.kind === 'swing') return '12 min EMOM';
  if (it.list) return it.list.slice(0, 2).join(' · ') + (it.list.length > 2 ? ' …' : '');
  return '';
}
function walkText(it) {
  if (it.title !== 'Incline walk') return `${it.min} min, hard steady pace`;
  if (it.mode === 'intervals') return `${it.min} min: 2 min at 6.5 km/h, 1 min at 5.0, incline ${it.incline}`;
  return `${it.min} min · incline ${it.incline} · ${it.speed} km/h · hands off the rails`;
}
function itemName(it) {
  if (it.ex) { const x = E.ex(A.state, it.ex); return x ? x.name : it.ex; }
  if (it.kind === 'walk' && it.alt) return 'Stair climber, rower or bike';
  return it.title || it.kind;
}
function itemTag(it) {
  if (it.role === 'anchor') return 'Anchor';
  if (it.role === 'staple') return it.extra ? 'Extra compound' : 'Staple';
  if (it.role === 'addon') return `Must-train · ${E.areas(A.state)[it.area].name}`;
  if (it.role === 'finisher') return 'Finisher';
  if (it.role === 'burnout') return 'Burnout';
  if (it.section) return it.section;
  return '';
}
A.viewToday = () => {
  const st = A.state, D = E.today();
  const c = A.plan();
  const plan = c.plan;
  const done = st.log.sessions.filter(s => s.date === D);
  let html = topbar(plan);
  const away = A.away();
  if (away) html += `<div class="banner mb8"><div class="grow"><b>Away until ${esc(E.fmtDate(away.until))}</b><br><span class="muted">Training on ${esc(LOC_NAME[away.location] || away.location)}. Anchors wait until you're back.</span></div><button class="btn small" data-act="travel-end">Back early</button></div>`;
  const stalled = E.derive(st).stalled;
  if (stalled.length) html += `<div class="banner mb8"><div class="grow"><b>Stalled:</b> ${esc(stalled.map(a => E.ex(st, E.resolve(st, a) || a).name).join(', '))}, 3 misses in a row. Each miss adds rest${stalled.length >= 2 ? '; two stalled anchors bring the week off early.' : '. A second stalled anchor brings the week off early.'}</div></div>`;
  // Unfinished session from another day is handled in session view; check-in card
  if (A.settings().checkin && !st.log.checkins.some(x => x.date === D) && !done.length) {
    html += `<div class="banner mb8"><div class="grow"><b>Morning check-in</b><br><span class="muted">Sore spots and sleep, 10 seconds.</span></div><button class="btn small primary" data-act="checkin">Check in</button></div>`;
  }
  if (done.length) {
    const s = done[done.length - 1];
    const res = E.resultsFor(st, s.id);
    html += `<div class="card"><div class="kicker">Done</div><h2>${esc(s.title || s.type)}</h2>
      <p class="sub">${esc(new Date(s.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))} · ${res.length} lift${res.length === 1 ? '' : 's'} logged</p>
      <div class="chips mt12">${res.map(r => `<span class="chip">${esc(E.ex(st, r.ex).name)} ${U.badge(r.outcome)}</span>`).join('') || '<span class="muted small">No lifts in this session.</span>'}</div>
      <button class="btn block mt16" data-act="open-session" data-id="${s.id}">See details</button></div>`;
    html += A.gameCards(D);
    html += quickActions(plan, true);
    html += forecastCard(c.forecast);
    return html;
  }
  const kindLabel = { Strength: 'Strength', Soviet: 'Soviet', Fascia: 'Fascia', Track: 'Track', Rest: 'Rest day', WeekOff: 'Week off' }[plan.kind];
  html += `<div class="card accent"><div class="kicker">${esc(kindLabel)}${plan.minutes ? ` · about ${plan.minutes} min` : ''}</div>
    <h2>${esc(plan.title)}</h2>${plan.subtitle ? `<div class="sub">${esc(plan.subtitle)}</div>` : ''}
    <ul class="why">${plan.why.filter(Boolean).map(w => `<li>${esc(w)}</li>`).join('')}</ul>`;
  if (plan.kind !== 'Rest' && plan.kind !== 'WeekOff') {
    html += `<ol class="plan-list">${plan.items.filter(it => it.kind !== 'warmup' && it.kind !== 'vacuum').map((it, i) => `<li><span class="num">${i + 1}</span><div class="grow"><div class="name">${esc(itemName(it))}</div><div class="tgt">${esc(targetLine(it, D))}</div></div></li>`).join('')}</ol>
      <button class="btn primary big mt16" data-act="start">Start session</button>`;
  } else {
    html += `<div class="howto mt12">Easy walk, 30–60 min. Nothing else: recovery is how you beat your numbers.</div>`;
  }
  html += `</div>`;
  html += A.gameCards(D);
  html += quickActions(plan, false);
  html += forecastCard(c.forecast);
  const lastExport = st.lastExport ? E.dn(st.lastExport) : null;
  if (st.log.sessions.length >= 5 && (!lastExport || E.dn(D) - lastExport > 14)) html += `<p class="tiny faint center mt16">No backup in ${lastExport ? E.dn(D) - lastExport + ' days' : 'a while'}. <a href="#" data-act="tab" data-tab="settings">Export one in Settings</a>.</p>`;
  return html;
};
A.gameCards = D => {
  const games = A.state.log.games.filter(g => g.date === D);
  if (!games.length) return '';
  return games.map(g => `<div class="card flat mt12"><div class="row between"><div><b>${esc((E.sports(A.state)[g.sport] || {}).name || g.sport)}</b> ${g.planned ? '<span class="badge info">Later today</span>' : ''}<div class="sub">${g.minutes} min · intensity ${g.intensity}${g.sore && g.sore.length ? ` · sore: ${g.sore.map(E.muscleName).join(', ')}` : ''}</div></div>
    <button class="btn small" data-act="game-edit" data-id="${g.id}">${g.planned ? 'Confirm' : 'Edit'}</button></div></div>`).join('');
};
function quickActions(plan, done) {
  const loc = A.state.flags.location || 'gym';
  const tw = A.state.flags.tweaks.length;
  const away = A.away();
  return `<div class="card mt12"><h3>Quick actions</h3>
    ${away ? '' : `<div class="seg mt12" role="group" aria-label="Where are you training">${[['gym', 'Gym'], ['field', 'Field'], ['bodyweight', 'Bodyweight only']].map(([v, n]) => `<button data-act="loc" data-v="${v}" class="${loc === v ? 'on' : ''}">${n}</button>`).join('')}</div>`}
    <div class="actions mt12">
      ${done ? '' : `<button class="btn" data-act="game-new" data-planned="1">Playing later today</button>`}
      <button class="btn" data-act="game-new" data-planned="0">Log a game</button>
      <button class="btn" data-act="tweak">Tweaked joint${tw ? ` (${tw})` : ''}</button>
      <button class="btn" data-act="sick">${A.state.flags.sick ? "I'm better" : "I'm sick"}</button>
      <button class="btn" data-act="travel">${away ? 'Change trip' : 'Travelling'}</button>
      <button class="btn" data-act="checkin">Check-in</button>
      <button class="btn" data-act="replan">Re-plan</button>
    </div></div>`;
}
function forecastCard(fc) {
  if (!fc || !fc.length) return '';
  return `<div class="card mt12"><h3>Up next</h3><p class="sub">Recalculated every morning.</p><div class="forecast mt12">${fc.map(f => `<div class="day"><div class="d">${esc(E.dow(f.date))}</div><div class="l">${esc(f.label)}</div></div>`).join('')}</div></div>`;
}

// ===========================================================================
// Live session
// ===========================================================================
A.viewSession = () => {
  const a = A.state.active;
  const D = E.today();
  const mins = Math.round((E.now() - new Date(a.startedAt).getTime()) / 60000);
  const logged = a.items.filter(isItemDone).length;
  let html = `<div class="session-head"><div class="row between"><div class="grow"><div class="date">${esc(a.date === D ? 'In progress' : 'Unfinished from ' + E.fmtDate(a.date))} · ${mins} min</div><h2>${esc(a.title)}</h2></div>
    <button class="btn small primary" data-act="finish">Finish</button></div>
    <div class="tiny faint mt8">${logged}/${a.items.length} done · tap a name for cues</div></div><div class="stack">`;
  a.items.forEach((it, i) => { html += renderItem(a, it, i); });
  html += `</div><button class="btn primary big mt24" data-act="finish">Finish session</button>
    <button class="btn ghost block mt12" data-act="discard">Discard session</button>`;
  return html;
};
function isItemDone(it) {
  if (it.skipped) return true;
  if (it.done) return true;
  if (it.sets && it.sets.length) {
    const need = it.kind === 'vacuum' ? 4 : 2;
    return it.sets.filter(z => z && z.done).length >= Math.min(need, it.sets.length);
  }
  return false;
}
function itemSummary(it, x) {
  const sets = (it.sets || []).filter(z => z && z.done);
  if (x && (x.k === 'lift' || x.k === 'bwlift')) return sets.map(z => `${x.k === 'bwlift' ? (z.w ? 'BW+' + U.kg(z.w) : 'BW') : U.kg(z.w) + ' kg'} × ${z.r}`).join(' · ');
  if (x && x.k === 'reps') return sets.map(z => `${z.r} reps`).join(' · ');
  if ((x && x.k === 'hold') || it.kind === 'vacuum') return sets.map(z => `${z.s} s`).join(' · ');
  if (x && x.k === 'carry') return sets.map(z => `${U.kg(z.w)} kg × ${z.m} m`).join(' · ');
  if (it.kind === 'walk') return `${it.doneMin != null ? it.doneMin : it.min} min`;
  if (it.kind === 'circuit') return `${U.plural(Object.keys(it.stationReps || {}).length, 'station')} logged`;
  if (it.kind === 'bridge') return `Holds ${(it.holds || []).filter(v => v != null).join(', ') || '–'} s`;
  if (it.value != null && it.value !== '') return `${it.value} ${it.kind === 'drill' && it.dk === 'hold' ? 's' : (it.unit || '')}`;
  return 'Done';
}
function renderItem(a, it, i) {
  const x = it.ex ? E.ex(A.state, it.ex) : null;
  const done = isItemDone(it);
  // Finished items fold to one line; "Change" opens them again
  if (done && !it.skipped && !A.open['x' + i]) {
    return `<div class="item done" id="item-${i}"><div class="head"><div class="grow"><div class="title"><span class="tick">✓</span> ${esc(itemName(it))}</div><div class="meta">${esc(itemSummary(it, x))}</div></div><button class="btn tiny" data-act="reopen" data-i="${i}">Change</button></div></div>`;
  }
  const cur = !done && !it.skipped && a.items.findIndex(z => !isItemDone(z)) === i;
  const cls = ['item', done ? 'done' : '', it.skipped ? 'skipped' : '', cur ? 'current' : ''].join(' ');
  const open = A.open[i];
  let h = `<div class="${cls}" id="item-${i}"><div class="head"><div class="grow" data-act="info" data-i="${i}"><div class="title">${esc(itemName(it))}${it.swapped ? ' <span class="badge neutral">swapped</span>' : ''}</div><div class="meta">${esc(itemTag(it))}${x && x.note ? ` · ${esc(x.note)}` : ''}${x && x.uni ? ' · each side' : ''}</div></div>
    ${it.ex && !it.cond ? `<button class="btn tiny" data-act="swap" data-i="${i}">Swap</button>` : ''}
    <button class="btn tiny" data-act="skip" data-i="${i}">${it.skipped ? 'Undo' : 'Skip'}</button></div>`;
  if (it.skipped) return h + '</div>';
  if (open && x) h += `<ul class="cues">${(x.cues || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul>${x.how ? `<div class="howto">${esc(x.how)}</div>` : ''}`;
  if (open && !x && it.how) h += `<div class="howto">${esc(it.how)}</div>`;
  if (x && (x.k === 'lift' || x.k === 'bwlift' || x.k === 'reps')) h += renderLift(a, it, i, x);
  else if (x && x.k === 'hold') h += renderHolds(it, i, 2, x);
  else if (x && x.k === 'carry') h += renderCarry(it, i, x);
  else if (it.kind === 'vacuum') h += renderHolds(it, i, 4, null);
  else if (it.kind === 'warmup' || it.kind === 'checklist') h += renderChecklist(it, i);
  else if (it.kind === 'walk') h += renderWalk(it, i);
  else if (it.kind === 'piece' || it.kind === 'interval' || it.kind === 'swing') h += renderValueBlock(it, i);
  else if (it.kind === 'sprint') h += renderValueBlock(it, i);
  else if (it.kind === 'circuit') h += renderCircuit(it, i);
  else if (it.kind === 'bridge') h += renderBridge(it, i);
  else if (it.kind === 'drill') h += renderDrill(it, i);
  return h + '</div>';
}
function bindOf(i, k, f) { return `a.${i}.sets.${k}.${f}`; }
function renderLift(a, it, i, x) {
  const st = A.settings();
  const tg = it.target || {};
  const step = E.stepFor(A.state, x);
  let h = `<div class="target"><div class="t">${esc(tg.text || '')}</div>${tg.note ? `<div class="n">${esc(tg.note)}</div>` : ''}</div>`;
  if (x.k !== 'reps') h += `<div class="cue">${esc(E.tempoCue(A.state, x))}</div>`;
  if (it.ramp && it.ramp.length) h += `<div class="tiny faint mt8">Ramp sets (never near failure)</div><div class="ramp">${it.ramp.map((z, k) => `<button class="chip ${z.done ? 'on' : ''}" data-act="ramp" data-i="${i}" data-k="${k}">${z.done ? '✓ ' : ''}${x.k === 'bwlift' ? (z.w ? `BW+${U.kg(z.w)}` : 'BW') : U.kg(z.w) + ' kg'} × ${z.r}</button>`).join('')}</div>`;
  it.sets.forEach((z, k) => {
    const label = it.cal && k === 0 ? 'All-out' : `Set ${k + 1}`;
    if (z.done) {
      h += `<div class="logged"><span>${label}: ${x.k === 'reps' ? '' : (x.k === 'bwlift' ? (z.w ? `BW+${U.kg(z.w)} kg` : 'BW') : `${U.kg(z.w)} kg`) + ' × '}${z.r} reps</span><button class="btn tiny" data-act="edit-set" data-i="${i}" data-k="${k}">Edit</button></div>`;
      return;
    }
    const prevDone = k === 0 || it.sets[k - 1].done;
    h += `<div class="setrow ${x.k === 'reps' ? 'hold' : ''}"><div class="lbl">${label}${it.cal && k === 0 ? '<small>aim 4–8</small>' : ''}</div>`;
    if (x.k !== 'reps') h += U.stepper(bindOf(i, k, 'w'), z.w, x.k === 'bwlift' ? 2.5 : step, { unit: x.k === 'bwlift' ? '+ kg' : 'kg', label: `${label} weight` });
    h += U.stepper(bindOf(i, k, 'r'), z.r, 1, { unit: 'reps', label: `${label} reps` });
    h += `<button class="btn ${prevDone ? 'primary' : ''} logbtn" data-act="log-set" data-i="${i}" data-k="${k}">Log ${label.toLowerCase()}</button></div>`;
    if (k === 1 && (st.finishSet2 || st.finishBoth)) h += `<div class="hint">Set 2: to failure → 1–2 spotter-assisted reps → one 6–8 s negative. Log only your solo reps.</div>`;
    if (k === 0 && st.finishBoth) h += `<div class="hint">Both sets go past failure today.</div>`;
    if (k === 1 && it.calNote) h += `<div class="hint">${esc(it.calNote)}</div>`;
  });
  return h;
}
function renderHolds(it, i, n, x) {
  const tg = it.target || {};
  let h = `<div class="target"><div class="t">${esc(tg.text || '')}</div>${tg.note ? `<div class="n">${esc(tg.note)}</div>` : ''}</div>`;
  if (!x) h += `<div class="cue">Breathe out every bit of air, pull your navel in and up under the ribs, hold without breathing in.</div>`;
  it.sets.forEach((z, k) => {
    const running = A.sw && A.sw.i === i && A.sw.k === k;
    if (z.done) { h += `<div class="logged"><span>Hold ${k + 1}: ${z.s} s</span><button class="btn tiny" data-act="edit-set" data-i="${i}" data-k="${k}">Edit</button></div>`; return; }
    h += `<div class="setrow hold"><div class="lbl">Hold ${k + 1}</div>${U.stepper(bindOf(i, k, 's'), z.s, 5, { unit: 'seconds', label: `Hold ${k + 1} seconds` })}
      <div class="logbtn row"><button class="btn grow ${running ? 'good' : ''}" data-act="${running ? 'sw-stop' : 'sw-start'}" data-i="${i}" data-k="${k}">${running ? `Stop <span id="sw-clock">0 s</span>` : 'Start stopwatch'}</button><button class="btn" data-act="log-set" data-i="${i}" data-k="${k}">Log</button></div></div>`;
  });
  return h;
}
function renderCarry(it, i, x) {
  const tg = it.target || {};
  let h = `<div class="target"><div class="t">${esc(tg.text || '')}</div>${tg.note ? `<div class="n">${esc(tg.note)}</div>` : ''}</div><div class="cue">${esc(E.tempoCue(A.state, x))}</div>`;
  it.sets.forEach((z, k) => {
    if (z.done) { h += `<div class="logged"><span>Carry ${k + 1}: ${U.kg(z.w)} kg × ${z.m} m</span><button class="btn tiny" data-act="edit-set" data-i="${i}" data-k="${k}">Edit</button></div>`; return; }
    h += `<div class="setrow"><div class="lbl">Carry ${k + 1}</div>${U.stepper(bindOf(i, k, 'w'), z.w, 2.5, { unit: 'kg/hand' })}${U.stepper(bindOf(i, k, 'm'), z.m, 5, { unit: 'metres' })}<button class="btn primary logbtn" data-act="log-set" data-i="${i}" data-k="${k}">Log carry ${k + 1}</button></div>`;
  });
  return h;
}
function renderChecklist(it, i) {
  return `<div class="mt8">${(it.list || []).map((t, k) => `<div class="check ${it.checks && it.checks[k] ? 'on' : ''}" data-act="check" data-i="${i}" data-k="${k}"><span class="box">${it.checks && it.checks[k] ? '✓' : ''}</span><span class="txt">${esc(t)}</span></div>`).join('')}</div>
    ${it.done ? '' : `<button class="btn small block mt8" data-act="item-done" data-i="${i}">Mark done</button>`}`;
}
function isAltCardio(it) { return it.alt || it.title !== 'Incline walk'; }
function renderWalk(it, i) {
  const alt = isAltCardio(it);
  if (it.done) return `<div class="logged"><span>${it.doneMin} min${alt && it.value != null ? ` · ${it.value} total` : ''} done</span><button class="btn tiny" data-act="item-undo" data-i="${i}">Edit</button></div>`;
  let h = alt
    ? `<div class="target"><div class="t">${it.min} min hard on a stair climber, rower or air bike</div><div class="n">${it.altTarget != null ? `Beat ${it.altTarget} (floors, metres or calories) in the same minutes.` : 'Log your total (floors, metres or calories); next time, beat it.'}</div></div>`
    : `<div class="target"><div class="t">${esc(walkText(it))}</div><div class="n">Beat last time: one more minute, then speed, then incline.</div></div>`;
  if (it.title === 'Incline walk' && A.state.equipment.cardio_alt) h += `<button class="btn small block mt8" data-act="walk-alt" data-i="${i}">${it.alt ? 'Back to the treadmill' : 'Treadmill taken? Use a stair climber, rower or bike'}</button>`;
  h += `<div class="setrow hold"><div class="lbl">Done</div>${U.stepper(`a.${i}.doneMin`, it.doneMin != null ? it.doneMin : it.min, 1, { unit: 'minutes' })}</div>`;
  if (alt) h += `<div class="setrow hold"><div class="lbl">Total</div>${U.stepper(`a.${i}.value`, it.value, 1, { unit: 'floors · m · cal' })}</div>`;
  h += `<div class="row mt8"><button class="btn grow" data-act="timer-walk" data-i="${i}">Start ${it.min}:00 timer</button><button class="btn primary" data-act="item-done" data-i="${i}">Done</button></div>`;
  return h;
}
const SPEED_IDS = ['accel', 'flying', 'maxv'];
function renderValueBlock(it, i) {
  const tgt = it.targetValue != null ? (it.kind === 'sprint' ? `Target: ${it.targetValue} ${it.unit}` : it.lowerBetter ? `Beat ${it.targetValue} s` : `Beat ${it.targetValue} ${it.unit || ''}`) : (it.kind === 'sprint' ? `Target: ${it.base} ${it.unit}` : 'First time: sets your number');
  let h = `<div class="target"><div class="t">${esc(tgt)}</div><div class="n">${esc(it.desc || '')}</div></div>`;
  if (it.kind === 'sprint' && SPEED_IDS.includes(it.pid)) h += `<div class="hint">Max effort only. When you clearly slow down, stop: the speed block is over.</div>`;
  const timed = it.kind === 'sprint' && A.state.equipment.partner;
  if (it.timer) h += `<button class="btn small block mt8" data-act="interval-start" data-i="${i}">Start interval timer</button>`;
  if (it.done) return h + `<div class="logged"><span>${it.value} ${esc(it.unit || '')}${timed && it.time ? ` · best ${it.time} s` : ''}</span><button class="btn tiny" data-act="item-undo" data-i="${i}">Edit</button></div>`;
  if (timed) h += `<div class="setrow hold"><div class="lbl">Best<small>${it.bestTime ? `PB ${it.bestTime} s` : 'partner times'}</small></div>${U.stepper(`a.${i}.time`, it.time, 0.1, { unit: 'seconds' })}</div>`;
  h += `<div class="setrow hold"><div class="lbl">Total</div>${U.stepper(`a.${i}.value`, it.value, 1, { unit: it.unit || 'reps' })}<button class="btn primary logbtn" data-act="item-done" data-i="${i}">Log</button></div>`;
  return h;
}
function renderCircuit(it, i) {
  const S = L.SOVIET.stations;
  let h = `<div class="target"><div class="t">${it.rounds} rounds · ${it.work} s on, ${it.move} s to move</div><div class="n">${it.roundRest} s between rounds. Log total reps per station; beat last time.</div></div>
    <button class="btn small block mt8" data-act="interval-start" data-i="${i}">Start circuit timer</button><div class="mt8">`;
  for (const sid of it.stations) {
    const s = S.find(z => z.id === sid) || { name: sid };
    const last = it.targets && it.targets[sid];
    h += `<div class="station"><div><div class="strong">${esc(s.name)}</div><div class="tiny muted">${last != null ? `Last: ${last} ${s.unit === 's' ? 's' : 'reps'}` : 'First time'}${s.how ? ` · ${esc(s.how)}` : ''}</div></div>${U.stepper(`a.${i}.stationReps.${sid}`, it.stationReps[sid], s.unit === 's' ? 5 : 1, { unit: s.unit === 's' ? 's' : 'reps' })}</div>`;
  }
  h += `</div>${it.done ? '<div class="logged"><span>Circuit logged</span><button class="btn tiny" data-act="item-undo" data-i="' + i + '">Edit</button></div>' : `<button class="btn primary block mt8" data-act="item-done" data-i="${i}">Circuit done</button>`}`;
  return h;
}
function renderBridge(it, i) {
  let h = `<div class="howto">${esc(it.how || '')}</div><div class="target"><div class="t">${esc((it.target || {}).text || '')}</div><div class="n">Next level unlocks at a 60 s hold or 20 clean reps.</div></div>`;
  for (let k = 0; k < 2; k++) h += `<div class="setrow"><div class="lbl">Set ${k + 1}</div>${U.stepper(`a.${i}.holds.${k}`, it.holds[k], 5, { unit: 'hold s' })}${U.stepper(`a.${i}.reps.${k}`, it.reps[k], 1, { unit: 'rocks' })}</div>`;
  h += it.done ? `<div class="logged"><span>Bridging logged</span><button class="btn tiny" data-act="item-undo" data-i="${i}">Edit</button></div>` : `<button class="btn primary block mt8" data-act="item-done" data-i="${i}">Bridging done</button>`;
  return h;
}
function renderDrill(it, i) {
  const unit = it.dk === 'hold' ? 's' : (it.unit || 'reps');
  let h = `<div class="cue">${esc(it.cue || '')}</div>${it.how ? `<div class="howto">${esc(it.how)}</div>` : ''}
    <div class="target"><div class="t">${it.targetValue != null ? `Beat ${it.targetValue} ${esc(unit)}` : 'First time: sets your number'}</div><div class="n">${it.dk === 'lift' ? '2 × 4–8 at 4-1-2' : it.dk === 'hold' ? '2 holds to failure' : '20–40 s bursts, max quality'}${it.uni ? ', each side' : ''}. Log your best.</div></div>`;
  if (it.done) return h + `<div class="logged"><span>${it.value} ${esc(unit)}</span><button class="btn tiny" data-act="item-undo" data-i="${i}">Edit</button></div>`;
  h += `<div class="setrow hold"><div class="lbl">Best</div>${U.stepper(`a.${i}.value`, it.value, it.dk === 'hold' ? 5 : 1, { unit })}<button class="btn primary logbtn" data-act="item-done" data-i="${i}">Log</button></div>`;
  return h;
}

// ===========================================================================
// Binding helpers (a.<item>.<path>)
// ===========================================================================
function setPath(bind, value) {
  const parts = bind.split('.');
  if (parts[0] === 'w') { if (parts[1] === 'bw') A.state.profile.bodyweight = value; return; }
  if (parts[0] === 's') { return G.NM_SCREENS.setBind(A, bind, value); }
  let o = A.state.active.items[+parts[1]];
  for (let k = 2; k < parts.length - 1; k++) { if (o[parts[k]] == null) o[parts[k]] = {}; o = o[parts[k]]; }
  o[parts[parts.length - 1]] = value;
}
function getPath(bind) {
  const parts = bind.split('.');
  if (parts[0] === 'w') return A.state.profile.bodyweight;
  if (parts[0] === 's') return G.NM_SCREENS.getBind(A, bind);
  let o = A.state.active.items[+parts[1]];
  for (let k = 2; k < parts.length; k++) { if (o == null) return null; o = o[parts[k]]; }
  return o;
}
A.setPath = setPath; A.getPath = getPath;

// ===========================================================================
// Timers: rest countdown, interval timer, stopwatch
// ===========================================================================
A.startRest = (secs, label, doneLabel) => { A.timer = { kind: 'rest', end: E.now() + secs * 1000, total: secs, label: label || 'Rest', doneLabel: doneLabel || 'Go. Next set.' }; A.renderTimer(); };
A.startPhases = (phases, label) => {
  if (!phases.length) return;
  A.timer = { kind: 'phases', phases, idx: 0, end: E.now() + phases[0].secs * 1000, label };
  U.beep(1, 660); A.renderTimer();
};
function phasesFrom(it) {
  const p = [];
  if (it.kind === 'circuit') {
    const S = L.SOVIET.stations;
    for (let r = 1; r <= it.rounds; r++) {
      it.stations.forEach((sid, k) => {
        p.push({ label: `R${r} · ${(S.find(z => z.id === sid) || {}).name || sid}`, secs: it.work, work: true });
        if (k < it.stations.length - 1) p.push({ label: 'Move', secs: it.move });
      });
      if (r < it.rounds) p.push({ label: `Round ${r} done: rest`, secs: it.roundRest });
    }
    return p;
  }
  const t = it.timer;
  if (!t) return p;
  let rounds = t.rounds;
  if (!rounds) {
    // Fit whole rounds (and whole sets, when the timer has sets) into the planned minutes
    const budget = (it.min || 12) * 60;
    let total = 0; rounds = 0;
    while (rounds < 200) {
      const r = rounds + 1;
      const restAfter = t.setEvery && r % t.setEvery === 0 ? (t.setRest || 0) : (t.rest || 0);
      if (total + t.work > budget) break;
      total += t.work + restAfter; rounds = r;
    }
    if (t.setEvery && rounds > t.setEvery) rounds -= rounds % t.setEvery;
    rounds = Math.max(1, rounds);
  }
  for (let r = 1; r <= rounds; r++) {
    p.push({ label: `Work ${r}/${rounds}`, secs: t.work, work: true });
    if (t.setEvery && r % t.setEvery === 0 && r < rounds) p.push({ label: 'Set rest', secs: t.setRest });
    else if (t.rest && r < rounds) p.push({ label: 'Rest', secs: t.rest });
  }
  return p;
}
A.renderTimer = () => {
  let el = document.getElementById('timerbar');
  document.body.classList.toggle('has-timer', !!A.timer);
  if (!A.timer) { if (el) el.classList.add('hidden'); return; }
  if (!el) return;
  el.classList.remove('hidden');
  const t = A.timer;
  const left = Math.max(0, (t.end - E.now()) / 1000);
  const doneNow = left <= 0 && t.kind === 'rest';
  el.classList.toggle('done', doneNow);
  const lab = t.kind === 'rest' ? esc(doneNow ? t.doneLabel : t.label) : `${t.phases[t.idx].label}<br><span class="faint">${t.idx + 1}/${t.phases.length}</span>`;
  el.innerHTML = `<div class="inner"><div class="clock" id="tclock">${U.mmss(left)}</div><div class="lab grow">${lab}</div>
    ${t.kind === 'rest' && !doneNow ? '<button class="btn small" data-act="timer-add">+30 s</button>' : ''}
    <button class="btn small" data-act="timer-stop">${doneNow ? 'OK' : 'Stop'}</button></div>`;
};
let lastWhole = null;
function tick() {
  if (A.sw) { const c = document.getElementById('sw-clock'); if (c) c.textContent = Math.floor((E.now() - A.sw.start) / 1000) + ' s'; }
  if (!A.timer) return;
  const t = A.timer;
  const left = (t.end - E.now()) / 1000;
  if (t.kind === 'phases' && left <= 0) {
    if (t.idx < t.phases.length - 1) {
      t.idx++; t.end = E.now() + t.phases[t.idx].secs * 1000;
      if (A.settings().sound) U.beep(t.phases[t.idx].work ? 2 : 1, t.phases[t.idx].work ? 880 : 520);
      A.renderTimer(); return;
    }
    if (A.settings().sound) U.beep(3, 990);
    A.timer = null; A.renderTimer(); U.toast('Timer finished'); return;
  }
  if (t.kind === 'rest' && left <= 0 && !t.rang) { t.rang = true; if (A.settings().sound) U.beep(2, 880); A.renderTimer(); return; }
  const whole = Math.ceil(left);
  if (t.kind === 'phases' && whole <= 3 && whole > 0 && whole !== lastWhole && A.settings().sound) U.beep(1, 440);
  lastWhole = whole;
  const c = document.getElementById('tclock');
  if (c) c.textContent = U.mmss(Math.max(0, left));
}

// ===========================================================================
// Modals
// ===========================================================================
let modalBusy = false, modalAgain = false;
A.renderModal = () => {
  if (modalBusy) { modalAgain = true; return; }
  modalBusy = true;
  try { renderModalNow(); } finally { modalBusy = false; }
  if (modalAgain) { modalAgain = false; setTimeout(A.renderModal, 0); }
};
function renderModalNow() {
  const host = document.getElementById('modal');
  if (!A.modal) { setHTML(host, ''); host.classList.add('hidden'); document.body.style.overflow = ''; A._modalKey = null; return; }
  host.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const m = A.modal;
  let body = '';
  if (m.type === 'game') body = modalGame(m);
  else if (m.type === 'checkin') body = modalCheckin(m);
  else if (m.type === 'tweak') body = modalTweak(m);
  else if (m.type === 'swap') body = modalSwap(m);
  else if (m.type === 'results') body = modalResults(m);
  else if (m.type === 'travel') body = modalTravel(m);
  else if (m.type === 'confirm') body = `<h2>${esc(m.title)}</h2><p class="muted">${esc(m.text)}</p><div class="row mt16"><button class="btn grow" data-act="modal-close">Cancel</button><button class="btn grow ${m.danger ? 'danger' : 'primary'}" data-act="confirm-yes">${esc(m.yes || 'OK')}</button></div>`;
  else if (G.NM_SCREENS.modal) body = G.NM_SCREENS.modal(A, m);
  const key = m.type + ':' + (m.id || m.i || m.sid || '');
  const prev = host.querySelector('.sheet');
  const top = prev && A._modalKey === key ? prev.scrollTop : 0;
  setHTML(host, `<div class="overlay" data-act="overlay"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${body}</div></div>`);
  A._modalKey = key;
  if (top) host.querySelector('.sheet').scrollTop = top;
}
A.confirm = (title, text, yes, onYes, danger) => { A.modal = { type: 'confirm', title, text, yes, onYes, danger }; A.renderModal(); };

const SORE_GROUPS = [['Upper', ['neck', 'upback', 'fdelt', 'sdelt', 'rdelt', 'cuff', 'chest', 'lats', 'triceps', 'biceps', 'forearms']], ['Trunk', ['abs', 'obliques', 'lowback', 'hipflex']], ['Lower', ['glutes', 'gmed', 'adductors', 'quads', 'hamstrings', 'calves', 'soleus', 'tib']]];
function soreChips(sel, act) {
  return SORE_GROUPS.map(([g, ms]) => `<div class="tiny faint mt12 mb8">${g}</div><div class="chips">${ms.map(m => `<button class="chip ${sel.includes(m) ? 'on' : ''}" data-act="${act}" data-m="${m}">${esc(E.muscleName(m))}</button>`).join('')}</div>`).join('');
}
function modalGame(m) {
  const g = m.data;
  const sports = E.sports(A.state);
  let h = `<h2>${g.planned ? 'Playing later today' : (m.edit ? 'Edit game' : 'Log a game')}</h2><p class="sub">${g.planned ? 'Today becomes a rest day. Confirm the real numbers afterwards.' : 'Games only add fatigue; they never count as cardio or sprints.'}</p>
    <div class="field"><label>Sport</label><select class="input" data-gf="sport">${Object.entries(sports).map(([id, s]) => `<option value="${id}" ${g.sport === id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><div class="lab">Minutes</div>${U.stepper('g.minutes', g.minutes, 15, { unit: 'minutes' })}</div>
    <div class="field"><div class="lab">Intensity (1–10)</div><div class="chips">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="chip ${g.intensity === n ? 'on' : ''}" data-act="g-int" data-v="${n}" style="min-width:44px;justify-content:center">${n}</button>`).join('')}</div></div>`;
  if (g.sport === 'other') h += `<div class="field"><div class="lab">Body parts it worked (tap to cycle light → medium → heavy)</div>${SORE_GROUPS.map(([gr, ms]) => `<div class="chips mt8">${ms.map(mm => { const v = (g.customLoad || {})[mm] || 0; return `<button class="chip ${v ? 'on' : ''}" data-act="g-custom" data-m="${mm}">${esc(E.muscleName(mm))}${v ? ` · ${v === 15 ? 'light' : v === 30 ? 'medium' : 'heavy'}` : ''}</button>`; }).join('')}</div>`).join('')}</div>`;
  if (!g.planned) h += `<div class="field"><div class="lab">Sore spots</div>${soreChips(g.sore || [], 'g-sore')}</div>
    <div class="field"><label>Date</label><select class="input" data-gf="date">${[0, 1, 2].map(k => { const d = E.addDays(E.today(), -k); return `<option value="${d}" ${g.date === d ? 'selected' : ''}>${k === 0 ? 'Today' : k === 1 ? 'Yesterday' : E.fmtDate(d)}</option>`; }).join('')}</select></div>`;
  h += `<div class="row mt24">${m.edit ? `<button class="btn danger" data-act="g-del">Delete</button>` : ''}<button class="btn grow" data-act="modal-close">Cancel</button><button class="btn primary grow" data-act="g-save">${g.planned ? 'Set rest day' : 'Save game'}</button></div>`;
  if (g.planned && m.edit) h += `<button class="btn block mt12" data-act="g-confirm">I played: confirm numbers</button>`;
  return h;
}
function modalTravel(m) {
  const t = m.data, st = A.state;
  const wk = A.blockWeek();
  const canWeekOff = !st.block.weekOff && t.days >= 5 && wk >= 3;
  const nb = E.nextBlock(st, st.block.n);
  return `<h2>Travelling</h2><p class="sub">Sessions are built for where you'll be. Anchors wait until you're back, and that never counts as a miss.</p>
    <div class="field"><div class="lab">Days away, today included</div>${U.stepper('t.days', t.days, 1, { unit: 'days' })}</div>
    <div class="field"><div class="lab">Where you'll train</div><div class="seg">${[['bodyweight', 'Bodyweight only'], ['field', 'Field or track'], ['gym', 'A gym']].map(([v, n]) => `<button data-act="trip-loc" data-v="${v}" class="${t.location === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    ${canWeekOff ? `<div class="banner mt16"><div class="grow">You're in week ${wk} of block ${st.block.n}. A trip this long can be your week off: ${E.settings(st).weekOffDays} days of easy walking, then block ${nb}, ${esc(E.blockDef(nb, st).name)}, starts fresh.</div></div>
      <button class="btn primary block mt12" data-act="trip-weekoff">Make the trip my week off</button>
      <button class="btn block mt12" data-act="trip-save">Keep training on the trip</button>`
    : `<button class="btn primary block mt16" data-act="trip-save">Set the trip</button>`}
    ${A.away() ? '<button class="btn block mt12" data-act="travel-end">I\'m back</button>' : ''}
    <button class="btn ghost block mt12" data-act="modal-close">Cancel</button>`;
}
function modalCheckin(m) {
  const c = m.data;
  return `<h2>Morning check-in</h2><p class="sub">Sore spots go to at least 60% fatigue. Under 6 h of sleep adds 10 to the whole-body meter.</p>
    <div class="field"><div class="lab">Sore spots</div>${soreChips(c.sore, 'c-sore')}</div>
    <div class="field"><div class="lab">Sleep last night</div>${U.stepper('c.sleep', c.sleep, 0.5, { unit: 'hours' })}</div>
    <div class="row mt24"><button class="btn grow" data-act="modal-close">Cancel</button><button class="btn primary grow" data-act="c-save">Save</button></div>`;
}
function modalTweak(m) {
  const t = m.data;
  const cur = A.state.flags.tweaks;
  return `<h2>Tweaked joint</h2><p class="sub">Every exercise that loads it is removed until you clear the flag. Anchors that need it sit out; that never counts as a miss.</p>
    ${cur.length ? `<div class="field"><div class="lab">Flagged now</div>${cur.map((z, k) => `<div class="toggle"><span>${esc(L.JOINTS.find(j => j.id === z.joint).name)}${z.side ? ` (${z.side})` : ''} · since ${esc(E.fmtDate(z.since))}</span><button class="btn small" data-act="tw-clear" data-k="${k}">Clear</button></div>`).join('')}</div>` : ''}
    <div class="field"><div class="lab">Add a joint</div><div class="chips">${L.JOINTS.map(j => `<button class="chip ${t.joint === j.id ? 'on' : ''}" data-act="tw-joint" data-v="${j.id}">${esc(j.name)}</button>`).join('')}</div></div>
    ${t.joint && L.JOINTS.find(j => j.id === t.joint).sided ? `<div class="field"><div class="lab">Side</div><div class="seg">${['left', 'right', 'both'].map(s => `<button class="${t.side === s ? 'on' : ''}" data-act="tw-side" data-v="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div></div>` : ''}
    <div class="row mt24"><button class="btn grow" data-act="modal-close">Close</button><button class="btn primary grow" data-act="tw-save" ${t.joint ? '' : 'disabled'}>Flag it</button></div>`;
}
function modalSwap(m) {
  const it = A.state.active.items[m.i];
  const alts = E.alternatives(A.state, it, A.state.active.items);
  return `<h2>Swap ${esc(itemName(it))}</h2><p class="sub">Alternatives that hit the same muscles with your kit. The substitute keeps its own logbook, and a miss on a swap never grows the gap.</p>
    <ul class="list mt12">${alts.map(a => `<li><button class="btn block" data-act="swap-to" data-id="${a.id}">${esc(a.name)}</button></li>`).join('') || '<li class="muted">No alternative with your ticked kit.</li>'}</ul>
    <button class="btn ghost block mt12" data-act="modal-close">Cancel</button>`;
}
function modalResults(m) {
  const st = A.state;
  const s = st.log.sessions.find(z => z.id === m.sid);
  const res = E.resultsFor(st, m.sid);
  const prs = s ? E.sessionPRs(st, s) : [];
  let h = `<div class="kicker">Session logged</div><h2>${esc(s ? s.title : '')}</h2>`;
  if (prs.length) h += `<div class="chips mt12">${prs.map(p => `<span class="chip on">PR · ${esc(p.name)} ${p.bw ? (p.w ? `BW+${U.kg(p.w)}` : 'BW') : U.kg(p.w) + ' kg'} × ${p.r}</span>`).join('')}</div>`;
  h += `<ul class="list mt12">${res.map(r => `<li><div class="row between"><b>${esc(E.ex(st, r.ex).name)}</b>${U.badge(r.outcome)}</div>
    <div class="small muted">${r.sets.map(z => `${E.ex(st, r.ex).k === 'bwlift' ? (z.w ? 'BW+' + U.kg(z.w) : 'BW') : E.ex(st, r.ex).k === 'reps' ? '' : U.kg(z.w) + ' kg'}${E.ex(st, r.ex).k === 'reps' ? `${z.r} reps` : ` × ${z.r}`}`).join(' · ')}${r.why ? ` · ${esc(r.why)}` : ''}</div>
    ${r.extra.map(e => `<div class="small mt8">${esc(e)}</div>`).join('')}</li>`).join('') || '<li class="muted">No lifts logged.</li>'}</ul>`;
  const fc = A.plan().forecast;
  h += forecastCard(fc).replace('card mt12', 'card flat mt12');
  h += `<button class="btn primary big mt16" data-act="modal-close">Done</button>`;
  return h;
}

// ===========================================================================
// Actions
// ===========================================================================
const ACT = {};
ACT.tab = d => { A.tab = d.tab; A.sub = null; A.render(); window.scrollTo(0, 0); };
ACT.begin = () => A.mutate(s => { s.startDate = E.today(); s.block.start = s.startDate; });
ACT.equip = d => A.mutate(s => { s.equipment[d.id] = !s.equipment[d.id]; });
ACT.replan = () => { A.plan(true); A.render(); U.toast('Re-planned'); };
ACT.loc = d => A.mutate(s => { s.flags.location = d.v; });
ACT.start = () => {
  U.unlockAudio();
  const c = A.plan();
  A.mutate(s => { s.active = E.startSession(s, c.plan); });
  A.open = {}; U.keepAwake(true); window.scrollTo(0, 0);
};
ACT.discard = () => A.confirm('Discard session?', 'Nothing from this session will be saved.', 'Discard', () => { A.mutate(s => { s.active = null; }); A.timer = null; U.keepAwake(false); }, true);
ACT.finish = () => {
  const a = A.state.active;
  const open = a.items.filter(it => !isItemDone(it));
  const go = () => {
    A.timer = null; A.sw = null;
    let sid;
    A.mutate(s => { sid = E.finishSession(s, s.active).session.id; }, false);
    A.saveNow();
    U.keepAwake(false);
    A.modal = { type: 'results', sid };
    A.render();
  };
  if (open.length) A.confirm('Finish now?', `${U.plural(open.length, 'item')} not logged. They won't count.`, 'Finish', go);
  else go();
};
ACT.info = d => { A.open[d.i] = !A.open[d.i]; A.render(); };
ACT.skip = d => { const it = A.state.active.items[d.i]; it.skipped = !it.skipped; A.touch(); };
ACT.step = (d, el) => {
  // Step from what the box shows (a prefilled target counts), never from a hidden empty value
  const inp = el.parentElement.querySelector('input');
  const shown = inp && inp.value !== '' ? Number(inp.value) : null;
  const delta = Number(d.d);
  let v = shown == null || isNaN(shown) ? (delta > 0 ? delta : 0) : shown + delta;
  v = Math.max(0, Math.round(v * 100) / 100);
  if (inp) inp.value = U.kg(v);
  if (/^[gct]\./.test(d.bind)) { A.modal.data[d.bind.slice(2)] = v; if (A.modal.type === 'travel') A.renderModal(); return; }
  setPath(d.bind, v);
  A.save();
};
ACT.ramp = d => { const z = A.state.active.items[d.i].ramp[d.k]; z.done = !z.done; A.touch(); };
ACT.check = d => { const it = A.state.active.items[d.i]; it.checks[d.k] = !it.checks[d.k]; if (it.checks.every(Boolean)) { it.done = true; delete A.open['x' + d.i]; A.focus = nextOpen(d.i); } A.touch(); };
ACT['item-done'] = d => {
  const it = A.state.active.items[d.i];
  if ((it.kind === 'piece' || it.kind === 'interval' || it.kind === 'sprint' || it.kind === 'swing' || it.kind === 'drill') && (it.value == null || it.value === '')) { U.toast('Enter your number first'); return; }
  if (it.kind === 'walk' && (it.doneMin == null)) it.doneMin = it.min;
  it.done = true;
  delete A.open['x' + d.i];
  if (it.kind === 'circuit') for (const sid of it.stations) if (it.stationReps[sid] == null) delete it.stationReps[sid];
  A.focus = nextOpen(d.i);
  A.touch();
};
ACT['item-undo'] = d => { A.state.active.items[d.i].done = false; A.touch(); };
ACT.reopen = d => { A.open['x' + d.i] = true; A.render(); };
ACT['walk-alt'] = d => { const it = A.state.active.items[d.i]; it.alt = !it.alt; A.touch(); };
function nextOpen(i) { const items = A.state.active.items; for (let k = +i + 1; k < items.length; k++) if (!isItemDone(items[k])) return k; return null; }
ACT['log-set'] = d => {
  U.unlockAudio();
  const it = A.state.active.items[d.i];
  const z = it.sets[d.k];
  const x = it.ex ? E.ex(A.state, it.ex) : null;
  if (x && (x.k === 'lift' || x.k === 'bwlift' || x.k === 'reps')) {
    if (z.r == null || z.r === '' || isNaN(+z.r)) { U.toast('Enter your reps'); return; }
    if (x.k !== 'reps' && (z.w == null || z.w === '' || isNaN(+z.w))) { U.toast('Enter the weight'); return; }
    z.r = Math.round(+z.r); z.w = x.k === 'reps' ? 0 : +z.w;
  } else if (x && x.k === 'carry') {
    if (!(+z.m > 0) || z.w == null) { U.toast('Enter weight and metres'); return; }
  } else {
    if (!(+z.s > 0)) { U.toast('Enter seconds, or use the stopwatch'); return; }
    z.s = Math.round(+z.s);
  }
  z.done = true;
  if (A.sw && A.sw.i === +d.i) A.sw = null;
  // Calibration: set 2 weight comes from set 1
  if (it.cal && +d.k === 0 && it.sets[1] && !it.sets[1].done && x && x.k !== 'reps') {
    const r = E.calSet2(A.state, it.ex, +z.w, +z.r);
    it.sets[1].w = r.w; it.sets[1].r = null; it.calNote = r.note;
  }
  const doneCount = it.sets.filter(q => q.done).length;
  if (doneCount < it.sets.length) A.startRest(it.rest || 120, `Rest before ${x ? (it.kind === 'vacuum' ? 'next hold' : 'set ' + (doneCount + 1)) : 'next hold'}`);
  else { delete A.open['x' + d.i]; const nx = nextOpen(d.i); if (nx != null) { A.startRest(120, 'Move to the next exercise'); A.focus = nx; } }
  A.touch();
};
ACT['edit-set'] = d => { const it = A.state.active.items[d.i]; it.sets[d.k].done = false; A.touch(); };
ACT['sw-start'] = d => { U.unlockAudio(); A.sw = { i: +d.i, k: +d.k, start: E.now() }; A.render(); };
ACT['sw-stop'] = d => {
  if (!A.sw) return;
  const secs = Math.round((E.now() - A.sw.start) / 1000);
  A.sw = null;
  const it = A.state.active.items[d.i];
  it.sets[d.k].s = secs;
  ACT['log-set'](d);
};
ACT['timer-add'] = () => { if (A.timer) { A.timer.end += 30000; A.timer.rang = false; A.renderTimer(); } };
ACT['timer-stop'] = () => { A.timer = null; A.renderTimer(); };
ACT['timer-walk'] = d => { U.unlockAudio(); const it = A.state.active.items[d.i]; A.startRest(it.min * 60, `${it.title}: ${walkText(it)}`, 'Time. Log the walk.'); };
ACT['interval-start'] = d => { U.unlockAudio(); const it = A.state.active.items[d.i]; A.startPhases(phasesFrom(it), it.title); };
ACT.swap = d => { A.modal = { type: 'swap', i: +d.i }; A.renderModal(); };
ACT['swap-to'] = d => {
  const i = A.modal.i;
  A.mutate(s => {
    const it = s.active.items[i];
    it.ex = d.id; it.swapped = true;
    const x = E.ex(s, d.id);
    const tg = E.target(s, E.derive(s), d.id, s.active.date);
    it.target = tg; it.cal = tg.mode === 'cal'; it.rest = E.restFor(s, x, it.role);
    if (x.k === 'hold') it.sets = [{ s: null, done: false }, { s: null, done: false }];
    else if (x.k === 'carry') it.sets = [{ w: tg.w || null, m: null, done: false }, { w: tg.w || null, m: null, done: false }];
    else { const reps = tg.reps || [null, null]; it.sets = [{ w: tg.w != null ? tg.w : null, r: reps[0], done: false }, { w: tg.w != null ? tg.w : null, r: reps[1], done: false }]; it.ramp = (tg.ramp || []).map(z => ({ w: z.w, r: z.r, done: false })); }
  }, false);
  A.modal = null; A.render();
};
ACT['open-session'] = d => { A.tab = 'history'; A.sub = { session: d.id }; A.render(); window.scrollTo(0, 0); };
ACT['modal-close'] = () => { A.modal = null; A.renderModal(); A.render(); };
ACT.overlay = (d, el, ev) => { if (ev.target === el) ACT['modal-close'](); };
ACT['confirm-yes'] = () => { const m = A.modal; A.modal = null; A.renderModal(); m.onYes && m.onYes(); };

// Games
ACT['game-new'] = d => {
  const planned = d.planned === '1';
  A.modal = { type: 'game', data: { sport: 'soccer', minutes: 60, intensity: 7, sore: [], planned, date: E.today(), customLoad: {} } };
  A.renderModal();
};
ACT['game-edit'] = d => {
  const g = A.state.log.games.find(z => z.id === d.id);
  A.modal = { type: 'game', edit: d.id, data: Object.assign({ customLoad: {}, sore: [] }, E.clone(g)) };
  A.renderModal();
};
ACT['g-int'] = d => { A.modal.data.intensity = +d.v; A.renderModal(); };
ACT['g-sore'] = d => { const s = A.modal.data.sore; const k = s.indexOf(d.m); if (k >= 0) s.splice(k, 1); else s.push(d.m); A.renderModal(); };
ACT['g-custom'] = d => { const c = A.modal.data.customLoad = A.modal.data.customLoad || {}; const v = c[d.m] || 0; c[d.m] = v === 0 ? 15 : v === 15 ? 30 : v === 30 ? 45 : 0; if (!c[d.m]) delete c[d.m]; A.renderModal(); };
ACT['g-confirm'] = () => { A.modal.data.planned = false; A.modal.data.date = E.today(); A.renderModal(); };
ACT['g-save'] = () => {
  const g = A.modal.data;
  if (!(g.minutes > 0)) { U.toast('Enter the minutes'); return; }
  const edit = A.modal.edit;
  A.mutate(s => {
    const rec = { id: edit || ('G' + E.now().toString(36)), date: g.planned ? E.today() : g.date, sport: g.sport, minutes: +g.minutes, intensity: +g.intensity, sore: g.planned ? [] : (g.sore || []), planned: !!g.planned,
      hour: g.planned ? 19 : (g.date === E.today() ? Math.min(23, E.hourNow()) : 19), customLoad: g.sport === 'other' ? (g.customLoad || {}) : undefined };
    const k = s.log.games.findIndex(z => z.id === edit);
    if (k >= 0) s.log.games[k] = rec; else s.log.games.push(rec);
  }, false);
  A.modal = null;
  A.render();
  U.toast(g.planned ? 'Today is now a rest day' : 'Game logged');
};
ACT['g-del'] = () => { const id = A.modal.edit; A.modal = null; A.mutate(s => { s.log.games = s.log.games.filter(z => z.id !== id); }); };
// Trips
ACT.travel = () => {
  const a = A.away();
  A.modal = { type: 'travel', data: a ? { days: E.dn(a.until) - E.dn(E.today()) + 1, location: a.location } : { days: 5, location: 'bodyweight' } };
  A.renderModal();
};
ACT['trip-loc'] = d => { A.modal.data.location = d.v; A.renderModal(); };
function tripFrom(t) { const D = E.today(); return { from: D, until: E.addDays(D, Math.max(1, Math.round(t.days)) - 1), location: t.location }; }
ACT['trip-save'] = () => {
  const t = A.modal.data;
  if (!(t.days >= 1)) { U.toast('Enter the days away'); return; }
  A.modal = null;
  A.mutate(s => { s.flags.away = tripFrom(t); });
  U.toast('Trip set. Today is re-planned.');
};
ACT['trip-weekoff'] = () => {
  const t = A.modal.data;
  A.modal = null;
  A.mutate(s => { s.flags.away = tripFrom(t); E.startWeekOff(s, E.today(), `your ${Math.round(t.days)}-day trip`); });
  U.toast('Week off started');
};
ACT['travel-end'] = () => { A.modal = null; A.mutate(s => { s.flags.away = null; }); U.toast('Welcome back. Re-planned.'); };
// Check-in
ACT.checkin = () => {
  const cur = A.state.log.checkins.find(c => c.date === E.today());
  A.modal = { type: 'checkin', data: cur ? E.clone(cur) : { date: E.today(), sore: [], sleep: 7.5 } };
  A.renderModal();
};
ACT['c-sore'] = d => { const s = A.modal.data.sore; const k = s.indexOf(d.m); if (k >= 0) s.splice(k, 1); else s.push(d.m); A.renderModal(); };
ACT['c-save'] = () => { const c = A.modal.data; A.modal = null; A.mutate(s => { s.log.checkins = s.log.checkins.filter(z => z.date !== c.date); s.log.checkins.push(c); }); U.toast('Checked in'); };
// Tweaks and sickness
ACT.tweak = () => { A.modal = { type: 'tweak', data: { joint: null, side: 'both' } }; A.renderModal(); };
ACT['tw-joint'] = d => { A.modal.data.joint = d.v; A.renderModal(); };
ACT['tw-side'] = d => { A.modal.data.side = d.v; A.renderModal(); };
ACT['tw-save'] = () => { const t = A.modal.data; A.modal = null; A.mutate(s => { s.flags.tweaks.push({ joint: t.joint, side: L.JOINTS.find(j => j.id === t.joint).sided ? t.side : null, since: E.today() }); }); U.toast('Flagged. Today is re-planned.'); };
ACT['tw-clear'] = d => { A.mutate(s => { s.flags.tweaks.splice(+d.k, 1); }, false); A.renderModal(); A.render(); };
ACT.sick = () => {
  if (A.state.flags.sick) A.mutate(s => { s.flags.sickHistory.push({ start: s.flags.sick.since, end: E.today() }); s.flags.sick = null; });
  else A.confirm('Flag yourself as sick?', 'Every day is a rest day until you clear it.', 'Rest until better', () => A.mutate(s => { s.flags.sick = { since: E.today() }; }));
};

// ===========================================================================
// Event wiring
// ===========================================================================
function onClick(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'overlay' && ev.target !== el) return;
  if (el.tagName === 'A') ev.preventDefault();
  const fn = ACT[act] || (G.NM_SCREENS.ACT && G.NM_SCREENS.ACT[act]);
  if (fn) fn(el.dataset, el, ev);
}
function onInput(ev) {
  const el = ev.target;
  if (el.dataset.bind) {
    const v = el.value === '' ? null : Number(el.value);
    if (el.value !== '' && isNaN(v)) return;
    const b = el.dataset.bind;
    if (/^[gct]\./.test(b)) { A.modal.data[b.slice(2)] = v; if (A.modal.type === 'travel' && ev.type === 'change') A.renderModal(); return; }
    setPath(b, v);
    A.save();
  } else if (el.dataset.gf) {
    A.modal.data[el.dataset.gf] = el.value;
    if (el.dataset.gf === 'sport') A.renderModal();
  } else if (G.NM_SCREENS.onInput) G.NM_SCREENS.onInput(A, ev);
}
A.ACT = ACT;

// ===========================================================================
// Boot
// ===========================================================================
A.boot = async () => {
  const params = new URLSearchParams(location.search);
  if (params.get('now')) E.setNow(new Date(params.get('now')).getTime());
  let st = await U.load();
  if (!st) st = E.newState();
  A.state = E.migrate(st);
  document.addEventListener('click', onClick);
  document.addEventListener('change', onInput);
  document.addEventListener('input', ev => { if (ev.target.dataset.bind || (G.NM_SCREENS.liveInput && G.NM_SCREENS.liveInput(ev))) onInput(ev); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { A.render(); if (A.state.active) U.keepAwake(true); } else if (A.saveT) A.saveNow(); });
  window.addEventListener('pagehide', () => { if (A.saveT) A.saveNow(); });
  setInterval(tick, 250);
  A.render();
  U.persist();
  if (A.state.active) U.keepAwake(true);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      A.swReg = reg;
      const show = () => {
        const b = document.getElementById('update');
        b.classList.remove('hidden');
        b.innerHTML = `<div class="banner"><div class="grow"><b>Update ready.</b> Your data stays.</div><button class="btn small primary" id="update-btn">Reload</button></div>`;
        document.getElementById('update-btn').onclick = () => { A.updating = true; if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' }); else location.reload(); };
      };
      if (reg.waiting && navigator.serviceWorker.controller) show();
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(); });
      });
      // Reload only when you tapped "Reload" (the very first install also changes the controller)
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (A.updating && !reloaded) { reloaded = true; A.saveNow().then(() => location.reload()); } });
    } catch (e) { console.warn('SW registration failed', e); }
  }
};
document.addEventListener('DOMContentLoaded', () => A.boot());
})(window);
