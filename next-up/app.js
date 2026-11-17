/* Next Up: ADHD-friendly task capture, focus timer and clinic checklists.
   Plain JavaScript, no build step, no server. All data stays on this device (localStorage). */
'use strict';

const KEY = 'nextup.v1';
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

/* ---------- Default clinic checklists (edit freely in the app) ---------- */
const DEFAULT_TEMPLATES = [
  { key: 'exam', name: 'Exam room', steps: [
    'Room clean, wiped and stocked',
    'Open record: reason for visit, alerts, behavior notes',
    'Bring patient and client in',
    'Weight',
    'TPR (temp, pulse, resp)',
    'History, concerns, current meds and diet',
    'Check vaccines and preventives due',
    'Doctor notes ready, flag doctor',
    'Samples collected and labeled',
    'Treatments and vaccines given and charted',
    'Go-home meds and instructions explained',
    'Invoice to front desk',
    'Recheck or reminders booked',
    'Room cleaned and reset'
  ] },
  { key: 'surgery', name: 'Surgery', steps: [
    'Confirm patient ID, procedure and signed consent',
    'Fasting confirmed',
    'Weight',
    'Pre-op exam and bloodwork reviewed',
    'IV catheter placed',
    'Drug doses calculated and double-checked',
    'Anesthesia machine and monitors checked',
    'Pre-med given (time noted)',
    'Induction and intubation',
    'Clip and prep surgical site',
    'Monitor and chart every 5 min',
    'Recovery: temp, extubate, keep warm',
    'Post-op meds given and charted',
    'Call owner with update',
    'Go-home meds and discharge sheet ready',
    'Controlled drug log updated'
  ] },
  { key: 'dropoff', name: 'Drop-off', steps: [
    'Greet, confirm patient and reason',
    'Confirm best phone number for today',
    'History and concerns',
    'Weight',
    'Estimate and consent signed',
    'Belongings labeled',
    'Patient in kennel, cage card filled out',
    'Doctor told it is in the queue',
    'Tell owner when to expect a call'
  ] },
  { key: 'boarder', name: 'Boarder exam', steps: [
    'Vaccine records current',
    'Weight',
    'Quick exam: eyes, ears, skin, coat, body condition',
    'Check for fleas and ticks',
    'Meds, feeding schedule and food supply noted',
    'Belongings logged and labeled',
    'Cage card and special instructions posted',
    'Flag concerns to doctor',
    'Check-out: weight, quick exam, belongings returned'
  ] },
  { key: 'pharmacy', name: 'Pharmacy', steps: [
    'Read script: drug, strength, dose, frequency, quantity',
    'Check weight and that the dose makes sense',
    'Check allergies and current meds',
    'Pull drug and check expiration',
    'Count or measure',
    'Label: patient, client, drug, directions',
    'Second check against the script',
    'Log controlled drug if needed',
    'Bag with handout, note in record',
    'Refills: check last fill and doctor approval'
  ] },
  { key: 'inventory', name: 'Inventory', steps: [
    'Check low-stock list and shelf tags',
    'Count controlled drugs and reconcile log',
    'Pull expired and short-dated items',
    'Check fridge temp and log it',
    'Build order list',
    'Place order',
    'Receive order against packing slip',
    'Put away, soonest expiry in front',
    'Update counts in the system'
  ] }
];

/* ---------- Small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clampText = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function fmtTime(ms) { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function fmtDay(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + fmtTime(ms);
}
function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
function fmtDur(ms) {
  const m = Math.floor(ms / MIN);
  if (m < 1) return 'under a minute';
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  return h + ' h ' + (m % 60) + ' min';
}
function fmtShort(ms) {
  const m = Math.round(ms / MIN);
  if (m < 60) return Math.max(1, m) + 'm';
  const h = Math.floor(m / 60);
  return h + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '');
}
function dueText(at, now) {
  if (at <= now) return 'Due now (' + fmtTime(at) + ')';
  return fmtTime(at) + ' · in ' + fmtShort(at - now);
}

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/* ---------- State ---------- */
function freshTemplates() {
  return DEFAULT_TEMPLATES.map((t) => ({ id: uid(), key: t.key, name: t.name, steps: t.steps.slice() }));
}
function defaultState() {
  return {
    v: 1, tasks: [], doingId: null, doingSince: 0,
    templates: freshTemplates(), runs: [], focus: null,
    lastMins: 10, badge: false, hideInstall: false
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const d = defaultState();
      for (const k in d) if (!(k in s)) s[k] = d[k];
      return s;
    }
  } catch (e) { /* fall through to a fresh start */ }
  return defaultState();
}
let S = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save. Phone storage may be full.'); }
  updateBadge();
}
function snapshot() { return JSON.stringify(S); }
function restoreSnap(snap) { return () => { S = JSON.parse(snap); save(); render(); }; }

// Housekeeping: keep the app light without any settings.
(function tidy() {
  const now = Date.now();
  S.tasks = S.tasks.filter((t) => !t.doneAt || now - t.doneAt < 3 * DAY);
  S.runs = S.runs.filter((r) => !r.doneAt || now - r.doneAt < DAY);
  if (S.doingId && !S.tasks.some((t) => t.id === S.doingId && !t.doneAt)) S.doingId = null;
  if (S.focus && S.focus.endAt < now - 12 * 60 * MIN) S.focus = null;
  save();
})();

/* UI-only state (not saved) */
const ui = { tab: 'now', view: null, capUrgent: false, open: {}, newId: null, undo: null, focusTaskId: undefined };

/* ---------- Task logic ---------- */
const task = (id) => S.tasks.find((t) => t.id === id);
const openTasks = () => S.tasks.filter((t) => !t.doneAt);
const isDue = (t, now) => !!t.dueAt && t.dueAt <= now;
function topOrder() { return Math.min(0, ...S.tasks.map((t) => t.order || 0)) - 1; }
function bottomOrder() { return Math.max(0, ...S.tasks.map((t) => t.order || 0)) + 1; }

function upNext(now = Date.now()) {
  const rank = (t) => (isDue(t, now) ? 0 : t.pri === 'urgent' ? 1 : 2);
  return openTasks()
    .filter((t) => t.id !== S.doingId && (t.pri === 'urgent' || t.pri === 'today' || isDue(t, now)))
    .sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.dueAt - b.dueAt : 0) || a.order - b.order);
}

function addTask(text, urgent) {
  let t = clampText(text, 300);
  if (!t) return null;
  if (t.startsWith('!')) { urgent = true; t = t.replace(/^!+\s*/, ''); }
  if (!t) return null;
  const item = {
    id: uid(), text: t, pri: urgent ? 'urgent' : 'today',
    order: urgent ? topOrder() : bottomOrder(),
    created: Date.now(), doneAt: null, note: '', waitingOn: '', dueAt: null, dueAlerted: false, steps: []
  };
  S.tasks.push(item);
  return item;
}

function parkCurrent(note) {
  const cur = task(S.doingId);
  if (cur) {
    if (note != null && note.trim()) cur.note = clampText(note, 200);
    cur.order = topOrder();
    if (cur.pri === 'later' || cur.pri === 'waiting') cur.pri = 'today';
  }
  S.doingId = null;
}

function startTask(id) {
  const t = task(id);
  if (!t) return;
  if (S.doingId && S.doingId !== id) parkCurrent();
  if (t.pri === 'later' || t.pri === 'waiting') t.pri = 'today';
  S.doingId = id;
  S.doingSince = Date.now();
}

function completeTask(id) {
  const snap = snapshot();
  const t = task(id);
  if (!t) return;
  t.doneAt = Date.now();
  if (S.doingId === id) S.doingId = null;
  save();
  ui.tab = ui.tab === 'focus' && !S.focus ? 'now' : ui.tab;
  render();
  const nxt = upNext()[0];
  toast(nxt ? 'Done. Next: ' + clampText(nxt.text, 40) : 'Done.', restoreSnap(snap));
}

/* ---------- Rendering ---------- */
function render() {
  const main = $('#main');
  if (ui.tab === 'now') main.innerHTML = renderNow();
  else if (ui.tab === 'lists') main.innerHTML = renderLists();
  else main.innerHTML = renderFocus();
  document.body.className = document.body.className.replace(/\btab-\w+/g, '').trim() + ' tab-' + ui.tab;
  $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  $('#capture').hidden = ui.tab !== 'now';
  $('#cap-urgent').setAttribute('aria-pressed', String(ui.capUrgent));
  $$('details.group').forEach((d) => d.addEventListener('toggle', () => { ui.open[d.dataset.g] = d.open; }));
  ui.newId = null;
  updateLive();
}

function rowHTML(t, now, opts = {}) {
  const subs = [];
  if (t.note) subs.push('Left off: ' + esc(t.note));
  if (t.pri === 'waiting') subs.push('Waiting on ' + (t.waitingOn ? esc(t.waitingOn) : 'someone'));
  if (t.dueAt && !t.doneAt) subs.push('<span class="' + (isDue(t, now) ? 'hot' : '') + '" data-live="due" data-at="' + t.dueAt + '">' + esc(dueText(t.dueAt, now)) + '</span>');
  if (t.steps && t.steps.length) subs.push(t.steps.filter((s) => s.d).length + ' of ' + t.steps.length + ' steps');
  const cls = ['row'];
  if (t.doneAt) cls.push('is-done');
  else if (isDue(t, now)) cls.push('due');
  else if (t.pri === 'urgent') cls.push('urgent');
  if (ui.newId === t.id) cls.push('new');
  return '<div class="' + cls.join(' ') + '">' +
    '<button class="check" data-a="' + (t.doneAt ? 'undone' : 'done') + '" data-id="' + t.id + '" aria-label="' + (t.doneAt ? 'Mark not done' : 'Mark done') + '"></button>' +
    '<button class="row-main" data-a="task-menu" data-id="' + t.id + '">' +
      '<span class="row-title">' + (t.pri === 'urgent' && !t.doneAt ? '<span class="tag-urgent" aria-label="Urgent">!</span>' : '') + esc(t.text) + '</span>' +
      (subs.length ? '<span class="row-sub">' + subs.join(' · ') + '</span>' : '') +
    '</button>' +
    (opts.noStart || t.doneAt ? '' : '<button class="start" data-a="start" data-id="' + t.id + '" aria-label="Start this task">' + ICON_PLAY + '</button>') +
  '</div>';
}

function focusBarHTML() {
  const f = S.focus;
  if (!f) return '';
  const label = f.kind === 'break' ? 'Break' : (f.text ? esc(f.text) : 'Focus session');
  if (f.ended) return '<button class="focus-bar ended" data-a="tab" data-tab="focus"><span>Time\'s up · ' + label + '</span><span class="t">Wrap up ›</span></button>';
  return '<button class="focus-bar" data-a="tab" data-tab="focus"><span>' + label + '</span><span class="t" data-live="left">' + fmtClock(f.endAt - Date.now()) + '</span></button>';
}

function runCardHTML(r) {
  const done = r.steps.filter((s) => s.d).length;
  const next = r.steps.find((s) => !s.d);
  const title = esc(r.name) + (r.label ? ' · ' + esc(r.label) : '');
  return '<div class="card run-card">' +
    '<button class="run-open" data-a="open-run" data-id="' + r.id + '">' +
      '<span class="eyebrow">' + title + '</span>' +
      '<span class="run-next">' + (next ? 'Next: ' + esc(next.t) : 'All steps done. Tap to finish.') + '</span>' +
      '<span class="muted small">' + done + ' of ' + r.steps.length + ' done</span>' +
    '</button>' +
    (next ? '<button class="bigcheck" data-a="run-next" data-id="' + r.id + '" aria-label="Mark next step done">' + ICON_CHECK + '<span>Done</span></button>' : '') +
  '</div>';
}

function installHintHTML() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (!ios || standalone || S.hideInstall) return '';
  return '<div class="card soft install"><p>Tip: in Safari tap <b>Share</b> then <b>Add to Home Screen</b> so this opens like an app, even offline.</p>' +
    '<button class="link" data-a="hide-install">Got it</button></div>';
}

function renderNow() {
  const now = Date.now();
  const doing = task(S.doingId);
  const list = upNext(now);
  let h = '<header class="top"><span class="clock" data-live="clock">' + fmtDay(now) + '</span>' +
    '<button class="icon-btn" data-a="more" aria-label="More options">⋯</button></header>';
  h += installHintHTML();
  h += focusBarHTML();

  // The one thing to do now
  if (doing) {
    h += '<section class="card" aria-label="Doing now"><div class="eyebrow">Doing now</div>' +
      '<div class="doing-title">' + esc(doing.text) + '</div>' +
      '<div class="muted small" data-live="since">On it for ' + fmtDur(now - S.doingSince) + '</div>' +
      (doing.note ? '<div class="note"><b>Left off:</b> ' + esc(doing.note) + '</div>' : '');
    const steps = doing.steps || [];
    const ni = steps.findIndex((s) => !s.d);
    if (steps.length) {
      h += ni >= 0
        ? '<div class="step-cue"><span class="txt"><small>Step ' + (ni + 1) + ' of ' + steps.length + '</small>' + esc(steps[ni].t) + '</span>' +
          '<button class="btn primary" data-a="doing-step" style="min-height:48px">Step done</button></div>'
        : '<div class="note">All steps done.</div>';
    }
    h += '<div class="btn-row three">' +
      '<button class="btn primary" data-a="done" data-id="' + doing.id + '">' + ICON_CHECK.replace('<svg', '<svg width="20" height="20"') + 'Done</button>' +
      '<button class="btn" data-a="interrupt">Pause</button>' +
      '<button class="btn" data-a="doing-focus">Timer</button>' +
    '</div></section>';
  } else if (list.length) {
    const t = list[0];
    h += '<section class="card" aria-label="Next up"><div class="eyebrow">Next up</div>' +
      '<div class="doing-title">' + (t.pri === 'urgent' ? '<span class="tag-urgent">!</span>' : '') + esc(t.text) + '</div>' +
      (t.note ? '<div class="note"><b>Left off:</b> ' + esc(t.note) + '</div>' : '') +
      (t.dueAt ? '<div class="small ' + (isDue(t, now) ? 'row-sub' : 'muted') + '"><span class="' + (isDue(t, now) ? 'hot' : '') + '" data-live="due" data-at="' + t.dueAt + '">' + esc(dueText(t.dueAt, now)) + '</span></div>' : '') +
      '<div class="btn-row"><button class="btn primary" data-a="start" data-id="' + t.id + '">' + ICON_PLAY.replace('<svg', '<svg width="20" height="20"') + 'Start</button>' +
      '<button class="btn" data-a="task-menu" data-id="' + t.id + '">Options</button></div></section>';
  } else {
    h += '<section class="card soft"><div class="eyebrow">Next up</div><div class="doing-title" style="font-size:20px">Nothing waiting on you.</div>' +
      '<div class="muted small">Type what\'s next in the box below. Tap ! first if it\'s urgent.</div></section>';
  }

  // Checklists in progress
  const runs = S.runs.filter((r) => !r.doneAt);
  if (runs.length) {
    h += '<h2 class="section">Checklists going</h2>' + runs.map(runCardHTML).join('');
  }

  // The rest of the list
  const rest = doing ? list : list.slice(1);
  if (rest.length) h += '<h2 class="section">' + (doing ? 'Up next' : 'After that') + '</h2><div class="list">' + rest.map((t) => rowHTML(t, now)).join('') + '</div>';

  const waiting = openTasks().filter((t) => t.pri === 'waiting' && t.id !== S.doingId && !isDue(t, now)).sort((a, b) => a.order - b.order);
  const later = openTasks().filter((t) => t.pri === 'later' && t.id !== S.doingId && !isDue(t, now)).sort((a, b) => a.order - b.order);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const doneToday = S.tasks.filter((t) => t.doneAt && t.doneAt >= start.getTime()).sort((a, b) => b.doneAt - a.doneAt);
  const group = (g, label, items) => items.length
    ? '<details class="group" data-g="' + g + '"' + (ui.open[g] ? ' open' : '') + '><summary>' + label + ' (' + items.length + ')</summary><div class="list">' + items.map((t) => rowHTML(t, now)).join('') + '</div></details>'
    : '';
  h += group('waiting', 'Waiting on someone', waiting);
  h += group('later', 'Later', later);
  h += group('done', 'Done today', doneToday);
  return h;
}

function renderLists() {
  const v = ui.view;
  if (v && v.name === 'run') { const r = S.runs.find((x) => x.id === v.id); if (r) return renderRun(r); }
  if (v && v.name === 'edit') { const t = S.templates.find((x) => x.id === v.id); if (t) return renderEditor(t); }
  if (v && v.name === 'manage') return renderManage();
  ui.view = null;
  let h = '<header class="top"><h1>Checklists</h1></header>';
  const runs = S.runs.filter((r) => !r.doneAt);
  if (runs.length) h += '<h2 class="section">In progress</h2>' + runs.map(runCardHTML).join('');
  h += '<h2 class="section">Start one</h2><div class="tpl-grid">' +
    S.templates.map((t) => '<button class="tpl-btn" data-a="start-tpl" data-id="' + t.id + '"><b>' + esc(t.name) + '</b><span>' + t.steps.length + ' steps</span></button>').join('') +
    '</div>';
  h += '<div class="center" style="margin-top:16px"><button class="link" data-a="manage">Edit or add checklists</button></div>';
  return h;
}

function renderRun(r) {
  const done = r.steps.filter((s) => s.d).length;
  const ni = r.steps.findIndex((s) => !s.d);
  const pct = r.steps.length ? Math.round((done / r.steps.length) * 100) : 0;
  let h = '<header class="top"><button class="back" data-a="back">‹ Checklists</button></header>';
  h += '<h1 style="margin:0 0 10px;font-size:26px">' + esc(r.name) + '</h1>';
  h += '<input class="label-input" data-run="' + r.id + '" value="' + esc(r.label) + '" placeholder="Patient or room (optional)" aria-label="Patient or room" enterkeyhint="done">';
  h += '<div class="progress" aria-hidden="true"><span style="width:' + pct + '%"></span></div><div class="muted small">' + done + ' of ' + r.steps.length + ' done</div>';
  h += '<ol class="steps">' + r.steps.map((s, i) =>
    '<li><button class="step' + (s.d ? ' done' : '') + (i === ni ? ' next' : '') + '" data-a="run-toggle" data-id="' + r.id + '" data-i="' + i + '" aria-pressed="' + !!s.d + '">' +
    '<span class="box" aria-hidden="true"></span><span class="st">' + esc(s.t) + '</span></button></li>').join('') + '</ol>';
  h += '<div class="btn-row"><button class="btn" data-a="run-share" data-id="' + r.id + '">Share for handoff</button>' +
    '<button class="btn ' + (ni < 0 ? 'primary' : '') + '" data-a="run-finish" data-id="' + r.id + '">Finish</button></div>';
  h += '<div class="center" style="margin-top:10px"><button class="link danger" data-a="run-discard" data-id="' + r.id + '">Discard this checklist</button></div>';
  return h;
}

function renderManage() {
  let h = '<header class="top"><button class="back" data-a="back">‹ Checklists</button></header>';
  h += '<h1 style="margin:0 0 6px;font-size:26px">Edit checklists</h1><p class="muted small" style="margin:0 4px 12px">Tap one to change its steps. Changes save as you type.</p>';
  h += '<div class="menu">' + S.templates.map((t) => '<button class="btn" data-a="edit-tpl" data-id="' + t.id + '">' + esc(t.name) + '<span class="muted small" style="margin-left:auto">' + t.steps.length + ' steps ›</span></button>').join('') + '</div>';
  h += '<div class="btn-col"><button class="btn primary" data-a="new-tpl">+ New checklist</button>' +
    '<button class="btn ghost" data-a="paste-tpl">Add one a coworker sent me</button></div>';
  return h;
}

function renderEditor(t) {
  let h = '<header class="top"><button class="back" data-a="back">‹ Done</button></header>';
  h += '<input class="title-input" data-tpl-name="' + t.id + '" value="' + esc(t.name) + '" aria-label="Checklist name" placeholder="Checklist name">';
  h += '<h2 class="section">Steps</h2><ol class="steps">' + t.steps.map((s, i) =>
    '<li class="edit-step"><input data-tpl-step="' + i + '" data-id="' + t.id + '" value="' + esc(s) + '" aria-label="Step ' + (i + 1) + '" placeholder="Step">' +
    '<button class="mini" data-a="tpl-up" data-id="' + t.id + '" data-i="' + i + '" aria-label="Move up">↑</button>' +
    '<button class="mini" data-a="tpl-down" data-id="' + t.id + '" data-i="' + i + '" aria-label="Move down">↓</button>' +
    '<button class="mini" data-a="tpl-del" data-id="' + t.id + '" data-i="' + i + '" aria-label="Delete step">✕</button></li>').join('') + '</ol>';
  h += '<button class="btn ghost block" data-a="tpl-add-step" data-id="' + t.id + '">+ Add step</button>';
  h += '<div class="btn-col"><button class="btn" data-a="tpl-share" data-id="' + t.id + '">Share with a coworker</button></div>';
  h += '<div class="center" style="margin-top:12px">' +
    (t.key ? '<button class="link" data-a="tpl-reset" data-id="' + t.id + '">Reset to default steps</button><br>' : '') +
    '<button class="link danger" data-a="tpl-delete" data-id="' + t.id + '">Delete this checklist</button></div>';
  return h;
}

function piePath(frac) {
  const cx = 110, cy = 110, r = 100;
  if (frac >= 0.9999) return 'M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 1 1 ' + cx + ' ' + (cy + r) + ' A' + r + ' ' + r + ' 0 1 1 ' + cx + ' ' + (cy - r) + ' Z';
  if (frac <= 0) return '';
  const a = frac * 2 * Math.PI;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  return 'M' + cx + ' ' + cy + ' L' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 ' + (frac > 0.5 ? 1 : 0) + ' 1 ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Z';
}
function focusFrac(now) {
  const f = S.focus;
  if (!f) return 0;
  return Math.max(0, Math.min(1, (f.endAt - now) / Math.max(1, f.endAt - f.startAt)));
}

function renderFocus() {
  const now = Date.now();
  const f = S.focus;
  let h = '<header class="top"><h1>Focus</h1></header>';

  if (f && !f.ended) {
    h += '<div class="focus-wrap">' +
      '<div class="eyebrow">' + (f.kind === 'break' ? 'Break' : 'Focusing on') + '</div>' +
      '<div class="focus-task">' + (f.kind === 'break' ? 'Step away. Water, stretch, breathe.' : esc(f.text || 'This session')) + '</div>' +
      '<svg class="pie" viewBox="0 0 220 220" role="img" aria-label="Time left"><circle class="bgc" cx="110" cy="110" r="100"/><path class="fg" data-live="pie" d="' + piePath(focusFrac(now)) + '"/></svg>' +
      '<div class="big-time" data-live="left">' + fmtClock(f.endAt - now) + '</div>' +
      '<div class="muted">until ' + fmtTime(f.endAt) + '</div>' +
      (f.joined ? '<div class="pill">Working alongside a coworker</div>' : f.shared ? '<div class="pill">Shared with a coworker</div>' : '') +
      '<div class="btn-row"><button class="btn" data-a="focus-plus">+5 min</button>' +
      '<button class="btn" data-a="focus-share">' + (f.kind === 'break' ? 'Share' : 'Invite someone') + '</button></div>' +
      '<div class="center" style="margin-top:6px"><button class="link danger" data-a="focus-stop">Stop session</button></div>' +
      (f.kind === 'break' ? '' :
        '<form class="jot" data-form="jot"><input id="jot-input" placeholder="Distracted? Park the thought here" aria-label="Park a distracting thought" enterkeyhint="done"><button class="btn" type="submit" style="min-height:50px">Save</button></form>') +
      '</div>';
    return h;
  }

  if (f && f.ended) {
    const t = f.taskId ? task(f.taskId) : null;
    h += '<div class="focus-wrap"><div class="eyebrow">' + (f.kind === 'break' ? 'Break\'s over' : 'Time\'s up') + '</div>' +
      '<div class="focus-task">' + (f.kind === 'break' ? 'Back to it?' : esc(f.text || 'Session done')) + '</div>' +
      '<div class="muted" data-live="ago"></div></div><div class="btn-col">';
    if (f.kind !== 'break' && t && !t.doneAt) h += '<button class="btn primary" data-a="focus-task-done">' + ICON_CHECK.replace('<svg', '<svg width="20" height="20"') + 'Task done</button>';
    if (f.kind === 'break') h += '<button class="btn primary" data-a="focus-again">Focus again (' + S.lastMins + ' min)</button>';
    else h += '<button class="btn" data-a="focus-plus">5 more minutes</button><button class="btn" data-a="focus-break">5 minute break</button>';
    if (f.shared || f.joined) h += '<button class="btn" data-a="focus-checkin">Send a check-in</button>';
    h += '<button class="btn ghost" data-a="focus-close">Back to my list</button></div>';
    return h;
  }

  // Idle: pick what and how long. Tapping a time starts right away.
  const doing = task(S.doingId);
  const pre = ui.focusTaskId !== undefined ? task(ui.focusTaskId) : doing || upNext()[0];
  const chips = [doing].concat(upNext()).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i && (!pre || t.id !== pre.id)).slice(0, 3);
  h += '<label class="field-label" for="focus-task">What are you working on?</label>' +
    '<input id="focus-task" value="' + esc(pre ? pre.text : '') + '" data-task-id="' + (pre ? pre.id : '') + '" placeholder="Optional" enterkeyhint="done">';
  if (chips.length) h += '<div class="chips">' + chips.map((t) => '<button class="chip" data-a="focus-pick" data-id="' + t.id + '">' + esc(clampText(t.text, 36)) + '</button>').join('') + '</div>';
  h += '<h2 class="section">Tap a time to start</h2><div class="dur-grid">' +
    [5, 10, 15, 25].map((m) => '<button class="dur' + (m === S.lastMins ? ' last' : '') + '" data-a="focus-start" data-min="' + m + '">' + m + '<small>min</small></button>').join('') +
    '</div>';
  h += '<p class="muted small center" style="margin-top:12px">The screen stays on and shows what\'s left.</p>';
  h += '<section class="card soft"><b>Work alongside someone</b><p class="small" style="margin:6px 0 0">Start a session, then tap <b>Invite someone</b>. They get a link that counts down to the same end time, so you both work until the same moment. It\'s a shared timer. There\'s no video or chat.</p></section>';
  return h;
}

/* ---------- Live updates (no full re-render) ---------- */
function updateLive() {
  const now = Date.now();
  $$('[data-live]').forEach((el) => {
    switch (el.dataset.live) {
      case 'clock': el.textContent = fmtDay(now); break;
      case 'since': el.textContent = 'On it for ' + fmtDur(now - S.doingSince); break;
      case 'left': if (S.focus) el.textContent = fmtClock(S.focus.endAt - now); break;
      case 'pie': el.setAttribute('d', piePath(focusFrac(now))); break;
      case 'due': el.textContent = dueText(+el.dataset.at, now); break;
      case 'ago': if (S.focus) { const ago = now - S.focus.endAt; el.textContent = ago < MIN ? 'Ended just now' : 'Ended ' + fmtDur(ago) + ' ago'; } break;
      case 'tabfocus': el.textContent = S.focus ? (S.focus.ended ? 'Time\'s up' : fmtClock(S.focus.endAt - now)) : 'Focus'; break;
    }
  });
}

function typingInMain() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && $('#main').contains(a);
}

function tick() {
  const now = Date.now();
  let needRender = false;
  if (S.focus && !S.focus.ended && now >= S.focus.endAt) {
    S.focus.ended = true;
    keepAwake(false);
    if (document.visibilityState === 'visible') alertUser();
    needRender = true;
  }
  const newlyDue = openTasks().filter((t) => t.dueAt && !t.dueAlerted && t.dueAt <= now);
  if (newlyDue.length) {
    newlyDue.forEach((t) => { t.dueAlerted = true; });
    if (document.visibilityState === 'visible') { alertUser(); toast('Due now: ' + clampText(newlyDue[0].text, 40)); }
    needRender = true;
  }
  if (needRender) { save(); if (!typingInMain()) render(); else updateLive(); }
  else updateLive();
}

/* ---------- Sound, screen-on, badge ---------- */
let actx = null;
function unlockAudio() {
  try {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch (e) { /* no sound available */ }
}
function chime() {
  if (!actx) return;
  try {
    const t0 = actx.currentTime + 0.02;
    [[660, 0], [880, 0.2], [660, 0.9], [880, 1.1]].forEach(([freq, dt]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.8);
      o.connect(g); g.connect(actx.destination);
      o.start(t0 + dt); o.stop(t0 + dt + 0.85);
    });
  } catch (e) { /* ignore */ }
}
function alertUser() {
  chime();
  document.body.classList.remove('flash');
  void document.body.offsetWidth;
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 1700);
}

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on) {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

function badgeCount() {
  const now = Date.now();
  return openTasks().filter((t) => t.pri === 'urgent' || isDue(t, now)).length;
}
function updateBadge() {
  if (!S.badge || !('setAppBadge' in navigator)) return;
  const n = badgeCount();
  try { (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) { /* ignore */ }
}

/* ---------- Sheets and toasts ---------- */
function openSheet(html, focusSel) {
  $('#sheet').innerHTML = html;
  $('#sheet-wrap').hidden = false;
  if (focusSel) { const el = $(focusSel, $('#sheet')); if (el) el.focus(); }
}
function closeSheet() { $('#sheet-wrap').hidden = true; $('#sheet').innerHTML = ''; }

let toastTimer = null;
function toast(msg, undoFn) {
  const el = $('#toast');
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (undoFn ? '<button data-a="undo">Undo</button>' : '');
  ui.undo = undoFn || null;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 250);
    ui.undo = null;
  }, undoFn ? 5000 : 2400);
}

async function shareText(text, url, okMsg) {
  const full = url ? text + '\n' + url : text;
  if (navigator.share) {
    try { await navigator.share(url ? { text: text, url: url } : { text: text }); return true; }
    catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  try { await navigator.clipboard.writeText(full); toast(okMsg || 'Copied. Paste it in a message.'); return true; }
  catch (e) {
    openSheet('<h3>Copy this</h3><textarea readonly>' + esc(full) + '</textarea><div class="btn-col"><button class="btn" data-a="sheet-close">Close</button></div>');
    return false;
  }
}

/* ---------- Sharing links (checklists + shared focus timer) ---------- */
function b64e(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
const baseURL = () => location.origin + location.pathname;

function parseChecklist(code) {
  try {
    const o = JSON.parse(b64d(code));
    const name = clampText(o.n, 80);
    const steps = Array.isArray(o.s) ? o.s.map((x) => clampText(x, 200)).filter(Boolean).slice(0, 80) : [];
    if (!name || !steps.length) return null;
    return { name, steps };
  } catch (e) { return null; }
}

function handleHash(hash) {
  const m = /^#(cl|join)=([^&]+)/.exec(hash || '');
  if (!m) return false;
  history.replaceState(null, '', baseURL());
  if (m[1] === 'cl') {
    const c = parseChecklist(m[2]);
    if (!c) { toast('That checklist link looks broken.'); return true; }
    ui.pendingChecklist = c;
    openSheet('<h3>Add the "' + esc(c.name) + '" checklist?</h3><p class="muted">' + c.steps.length + ' steps. A coworker shared it with you.</p>' +
      '<ol class="small" style="margin:0 0 12px;padding-left:24px;max-height:30vh;overflow:auto">' + c.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
      '<div class="btn-col"><button class="btn primary" data-a="import-tpl">Add checklist</button><button class="btn ghost" data-a="sheet-close">No thanks</button></div>');
    return true;
  }
  const parts = m[2].split('.');
  const endAt = parseInt(parts[0], 36);
  const now = Date.now();
  if (!endAt || endAt <= now + 15 * 1000) { toast('That shared session has already ended.'); return true; }
  if (endAt > now + 3 * 60 * MIN) { toast('That session link doesn\'t look right.'); return true; }
  ui.pendingJoin = endAt;
  const doing = task(S.doingId) || upNext()[0];
  openSheet('<h3>Work alongside a coworker</h3>' +
    '<p>They\'re focusing until <b>' + fmtTime(endAt) + '</b> (' + fmtShort(endAt - now) + ' left). Join and count down to the same time.</p>' +
    '<label class="field-label" for="join-task">What will you work on?</label>' +
    '<input id="join-task" value="' + esc(doing ? doing.text : '') + '" data-task-id="' + (doing ? doing.id : '') + '" placeholder="Optional" enterkeyhint="done">' +
    '<div class="btn-col"><button class="btn primary" data-a="join-go">Join session</button><button class="btn ghost" data-a="sheet-close">Not now</button></div>');
  return true;
}

/* ---------- Focus sessions ---------- */
function startFocus(mins, text, taskId, kind, endAt, joined) {
  const now = Date.now();
  S.focus = {
    startAt: now, endAt: endAt || now + mins * MIN, mins: mins,
    text: clampText(text, 200), taskId: taskId || null,
    kind: kind || 'focus', shared: false, joined: !!joined, ended: false
  };
  if (kind !== 'break' && !joined) S.lastMins = mins;
  if (taskId && kind !== 'break' && S.doingId !== taskId && task(taskId) && !task(taskId).doneAt) startTask(taskId);
  save();
  keepAwake(true);
  ui.tab = 'focus';
  render();
}

/* ---------- Actions (all taps route through here) ---------- */
const A = {
  tab(el) {
    ui.tab = el.dataset.tab;
    if (ui.tab !== 'lists') ui.view = null;
    if (ui.tab === 'focus') ui.focusTaskId = undefined;
    render();
    window.scrollTo(0, 0);
  },
  'cap-urgent'() {
    ui.capUrgent = !ui.capUrgent;
    $('#cap-urgent').setAttribute('aria-pressed', String(ui.capUrgent));
    $('#cap-input').focus();
  },
  start(el) { startTask(el.dataset.id); save(); closeSheet(); ui.tab = 'now'; render(); window.scrollTo(0, 0); },
  done(el) { completeTask(el.dataset.id); },
  undone(el) {
    const t = task(el.dataset.id);
    if (t) { t.doneAt = null; t.order = topOrder(); save(); render(); }
  },
  'task-menu'(el) {
    const t = task(el.dataset.id);
    if (!t) return;
    const id = t.id;
    const b = (a, label, cls) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '" data-id="' + id + '">' + label + '</button>';
    openSheet('<h3>' + esc(t.text) + '</h3><div class="menu">' +
      (S.doingId === id ? '' : b('start', 'Start now', 'primary')) +
      b('toggle-urgent', t.pri === 'urgent' ? 'Not urgent' : 'Mark urgent') +
      b('time-sheet', t.dueAt ? 'Change time' : 'Set a time') +
      b('wait-sheet', t.pri === 'waiting' ? 'Not waiting anymore' : 'Waiting on someone') +
      b('toggle-later', t.pri === 'later' ? 'Move to today' : 'Later, not today') +
      b('edit-sheet', 'Edit or break into steps') +
      (t.note ? b('clear-note', 'Clear "left off" note') : '') +
      b('delete', 'Delete', 'danger') +
      '</div>');
  },
  'toggle-urgent'(el) {
    const t = task(el.dataset.id);
    if (t.pri === 'urgent') t.pri = 'today';
    else { t.pri = 'urgent'; t.order = topOrder(); }
    save(); closeSheet(); render();
  },
  'toggle-later'(el) {
    const t = task(el.dataset.id);
    t.pri = t.pri === 'later' ? 'today' : 'later';
    if (S.doingId === t.id && t.pri === 'later') S.doingId = null;
    save(); closeSheet(); render();
  },
  'wait-sheet'(el) {
    const t = task(el.dataset.id);
    if (t.pri === 'waiting') { t.pri = 'today'; t.waitingOn = ''; t.order = topOrder(); save(); closeSheet(); render(); return; }
    openSheet('<h3>Waiting on who?</h3><form data-form="wait" data-id="' + t.id + '">' +
      '<input id="wait-input" placeholder="Dr. K, lab results, owner callback…" enterkeyhint="done">' +
      '<div class="btn-col"><button class="btn primary" type="submit">Save</button></div></form>', '#wait-input');
  },
  'time-sheet'(el) {
    const t = task(el.dataset.id);
    const q = (m, label) => '<button class="btn" data-a="set-due" data-id="' + t.id + '" data-min="' + m + '">' + label + '</button>';
    const d = new Date(t.dueAt || Date.now() + 60 * MIN);
    const val = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    openSheet('<h3>When does this need doing?</h3><div class="quick">' + q(15, 'In 15 min') + q(30, 'In 30 min') + q(60, 'In 1 hour') + q(120, 'In 2 hours') + '</div>' +
      '<form data-form="due" data-id="' + t.id + '" style="display:flex;gap:8px;margin-top:10px"><input id="due-input" type="time" value="' + val + '" aria-label="Pick a time"><button class="btn primary" type="submit">Set</button></form>' +
      (t.dueAt ? '<div class="btn-col"><button class="btn ghost" data-a="clear-due" data-id="' + t.id + '">Remove time</button></div>' : '') +
      '<p class="muted small">Next Up chimes when it\'s due if the app is open. It can\'t ring while closed, so for meds or anything critical also set an iPhone alarm.</p>');
  },
  'set-due'(el) {
    const t = task(el.dataset.id);
    t.dueAt = Date.now() + Number(el.dataset.min) * MIN; t.dueAlerted = false;
    save(); closeSheet(); render(); toast('Set for ' + fmtTime(t.dueAt));
  },
  'clear-due'(el) { const t = task(el.dataset.id); t.dueAt = null; t.dueAlerted = false; save(); closeSheet(); render(); },
  'clear-note'(el) { const t = task(el.dataset.id); t.note = ''; save(); closeSheet(); render(); },
  'edit-sheet'(el) {
    const t = task(el.dataset.id);
    openSheet('<h3>Edit task</h3><form data-form="edit" data-id="' + t.id + '">' +
      '<input id="edit-text" value="' + esc(t.text) + '" aria-label="Task">' +
      '<label class="field-label" for="edit-steps">Small steps, one per line (optional)</label>' +
      '<textarea id="edit-steps" placeholder="Pull the chart&#10;Call the owner&#10;Note it in the record">' + esc((t.steps || []).map((s) => s.t).join('\n')) + '</textarea>' +
      '<div class="btn-col"><button class="btn primary" type="submit">Save</button></div></form>');
  },
  delete(el) {
    const snap = snapshot();
    S.tasks = S.tasks.filter((t) => t.id !== el.dataset.id);
    if (S.doingId === el.dataset.id) S.doingId = null;
    save(); closeSheet(); render(); toast('Deleted.', restoreSnap(snap));
  },
  interrupt() {
    const t = task(S.doingId);
    if (!t) return;
    openSheet('<h3>Pause "' + esc(clampText(t.text, 60)) + '"</h3>' +
      '<form data-form="park"><label class="field-label" for="park-input">Where did you leave off? (optional)</label>' +
      '<input id="park-input" placeholder="e.g. meds drawn up, need label" enterkeyhint="done">' +
      '<div class="btn-col"><button class="btn primary" type="submit">Pause it</button></div>' +
      '<p class="muted small">It goes to the top of your list so you can pick it back up.</p></form>', '#park-input');
  },
  'doing-step'() {
    const t = task(S.doingId);
    const s = t && t.steps.find((x) => !x.d);
    if (s) { s.d = true; save(); render(); }
  },
  'doing-focus'() { ui.tab = 'focus'; ui.focusTaskId = S.doingId; render(); window.scrollTo(0, 0); },

  /* Checklists */
  'start-tpl'(el) {
    const t = S.templates.find((x) => x.id === el.dataset.id);
    if (!t) return;
    const r = { id: uid(), tplId: t.id, name: t.name, label: '', steps: t.steps.filter(Boolean).map((s) => ({ t: s, d: false })), started: Date.now(), doneAt: null };
    S.runs.push(r);
    save();
    ui.tab = 'lists'; ui.view = { name: 'run', id: r.id };
    render(); window.scrollTo(0, 0);
  },
  'open-run'(el) {
    const r = S.runs.find((x) => x.id === el.dataset.id);
    if (!r) return;
    ui.tab = 'lists'; ui.view = { name: 'run', id: r.id };
    render(); window.scrollTo(0, 0);
  },
  'run-next'(el) {
    const r = S.runs.find((x) => x.id === el.dataset.id);
    const s = r && r.steps.find((x) => !x.d);
    if (!s) return;
    s.d = true;
    save(); render();
    const n = r.steps.find((x) => !x.d);
    toast(n ? 'Next: ' + clampText(n.t, 40) : 'All steps done.');
  },
  'run-toggle'(el) {
    const r = S.runs.find((x) => x.id === el.dataset.id);
    const s = r && r.steps[Number(el.dataset.i)];
    if (!s) return;
    s.d = !s.d; save(); render();
  },
  'run-finish'(el) {
    const snap = snapshot();
    const r = S.runs.find((x) => x.id === el.dataset.id);
    if (!r) return;
    r.doneAt = Date.now();
    ui.view = null; save(); render(); toast('Checklist finished.', restoreSnap(snap));
  },
  'run-discard'(el) {
    const snap = snapshot();
    S.runs = S.runs.filter((x) => x.id !== el.dataset.id);
    ui.view = null; save(); render(); toast('Discarded.', restoreSnap(snap));
  },
  'run-share'(el) {
    const r = S.runs.find((x) => x.id === el.dataset.id);
    if (!r) return;
    const done = r.steps.filter((s) => s.d);
    const left = r.steps.filter((s) => !s.d);
    let text = r.name + (r.label ? ' · ' + r.label : '') + ' (' + done.length + ' of ' + r.steps.length + ' done)\n';
    text += left.length ? 'Next: ' + left[0].t + '\nStill to do:\n' + left.map((s) => '- ' + s.t).join('\n') : 'All steps done.';
    shareText(text, null, 'Copied. Paste it for the handoff.');
  },
  back() {
    if (ui.view && ui.view.name === 'edit') {
      const t = S.templates.find((x) => x.id === ui.view.id);
      if (t) { t.steps = t.steps.map((s) => s.trim()).filter(Boolean); if (!t.name.trim()) t.name = 'Untitled checklist'; save(); }
      ui.view = { name: 'manage' };
    } else ui.view = null;
    render(); window.scrollTo(0, 0);
  },
  manage() { ui.view = { name: 'manage' }; render(); window.scrollTo(0, 0); },
  'edit-tpl'(el) { ui.view = { name: 'edit', id: el.dataset.id }; render(); window.scrollTo(0, 0); },
  'new-tpl'() {
    const t = { id: uid(), key: null, name: 'New checklist', steps: [''] };
    S.templates.push(t); save();
    ui.view = { name: 'edit', id: t.id }; render();
    const n = $('.title-input'); if (n) { n.focus(); n.select(); }
  },
  'paste-tpl'() {
    openSheet('<h3>Add a shared checklist</h3><form data-form="paste-tpl"><p class="muted small">Paste the link a coworker sent you.</p>' +
      '<textarea id="paste-input" placeholder="Paste link here" style="min-height:90px"></textarea>' +
      '<div class="btn-col"><button class="btn primary" type="submit">Add</button></div></form>', '#paste-input');
  },
  'import-tpl'() {
    const c = ui.pendingChecklist;
    if (!c) return closeSheet();
    let name = c.name;
    if (S.templates.some((t) => t.name === name)) name += ' (shared)';
    S.templates.push({ id: uid(), key: null, name: name, steps: c.steps });
    ui.pendingChecklist = null;
    save(); closeSheet(); ui.tab = 'lists'; ui.view = null; render(); toast('Added "' + name + '".');
  },
  'tpl-add-step'(el) {
    const t = S.templates.find((x) => x.id === el.dataset.id);
    t.steps.push(''); save(); render();
    const inputs = $$('[data-tpl-step]'); const last = inputs[inputs.length - 1]; if (last) last.focus();
  },
  'tpl-del'(el) { const t = S.templates.find((x) => x.id === el.dataset.id); t.steps.splice(Number(el.dataset.i), 1); save(); render(); },
  'tpl-up'(el) { moveStep(el, -1); },
  'tpl-down'(el) { moveStep(el, 1); },
  'tpl-share'(el) {
    const t = S.templates.find((x) => x.id === el.dataset.id);
    const steps = t.steps.map((s) => s.trim()).filter(Boolean);
    if (!steps.length) return toast('Add a step first.');
    const url = baseURL() + '#cl=' + b64e(JSON.stringify({ n: t.name, s: steps }));
    shareText('Here\'s my "' + t.name + '" checklist for Next Up. Open the link to add it:', url, 'Link copied.');
  },
  'tpl-reset'(el) {
    const t = S.templates.find((x) => x.id === el.dataset.id);
    const d = DEFAULT_TEMPLATES.find((x) => x.key === t.key);
    if (!d) return;
    const snap = snapshot();
    t.steps = d.steps.slice(); t.name = d.name; save(); render(); toast('Reset to default.', restoreSnap(snap));
  },
  'tpl-delete'(el) {
    const snap = snapshot();
    S.templates = S.templates.filter((x) => x.id !== el.dataset.id);
    ui.view = { name: 'manage' }; save(); render(); toast('Checklist deleted.', restoreSnap(snap));
  },

  /* Focus */
  'focus-pick'(el) {
    const t = task(el.dataset.id);
    const inp = $('#focus-task');
    if (t && inp) { inp.value = t.text; inp.dataset.taskId = t.id; }
  },
  'focus-start'(el) {
    unlockAudio();
    const inp = $('#focus-task');
    const text = inp ? inp.value.trim() : '';
    let taskId = inp && inp.dataset.taskId;
    const t = taskId && task(taskId);
    if (!t || t.text !== text) taskId = null;
    startFocus(Number(el.dataset.min), text, taskId);
  },
  'focus-plus'() {
    unlockAudio();
    const f = S.focus; if (!f) return;
    const now = Date.now();
    if (f.ended) { f.startAt = now; f.endAt = now + 5 * MIN; f.ended = false; }
    else f.endAt += 5 * MIN;
    save(); keepAwake(true); render();
  },
  'focus-stop'() {
    const snap = snapshot();
    S.focus = null; save(); keepAwake(false); render(); toast('Session stopped.', restoreSnap(snap));
  },
  'focus-break'() { unlockAudio(); startFocus(5, '', null, 'break'); },
  'focus-again'() {
    unlockAudio();
    const prev = S.focus;
    const t = task(S.doingId);
    startFocus(S.lastMins, t ? t.text : (prev && prev.text) || '', t ? t.id : null);
  },
  'focus-close'() { S.focus = null; save(); ui.tab = 'now'; render(); },
  'focus-task-done'() {
    const id = S.focus && S.focus.taskId;
    S.focus = null; save(); ui.tab = 'now';
    if (id) completeTask(id); else render();
  },
  'focus-share'() {
    const f = S.focus; if (!f) return;
    const url = baseURL() + '#join=' + f.endAt.toString(36);
    const text = 'I\'m doing a focus session until ' + fmtTime(f.endAt) + (f.text && f.kind !== 'break' ? ' (' + f.text + ')' : '') + '. Work alongside me, same end time:';
    shareText(text, url, 'Link copied. Send it to a coworker.').then((ok) => { if (ok && S.focus) { S.focus.shared = true; save(); render(); } });
  },
  'focus-checkin'() {
    const f = S.focus; if (!f) return;
    const t = f.taskId && task(f.taskId);
    shareText('Session over. ' + (f.text ? (t && t.doneAt ? 'Finished: ' : 'Worked on: ') + f.text : 'Done for now.'), null);
  },
  'join-go'() {
    unlockAudio();
    const endAt = ui.pendingJoin;
    const inp = $('#join-task');
    if (!endAt || endAt <= Date.now()) { closeSheet(); toast('That session already ended.'); return; }
    const text = inp ? inp.value.trim() : '';
    let taskId = inp && inp.dataset.taskId;
    const t = taskId && task(taskId);
    if (!t || t.text !== text) taskId = null;
    closeSheet();
    startFocus(Math.max(1, Math.round((endAt - Date.now()) / MIN)), text, taskId, 'focus', endAt, true);
  },

  /* More */
  more() {
    const canBadge = 'setAppBadge' in navigator && 'Notification' in window;
    openSheet('<h3>More</h3><div class="menu">' +
      '<button class="btn" data-a="guide">Quick guide</button>' +
      (canBadge ? '<button class="btn" data-a="badge">' + (S.badge ? 'Turn off urgent count on app icon' : 'Show urgent count on app icon') + '</button>' : '') +
      '<button class="btn" data-a="backup">Back up my data</button>' +
      '<button class="btn" data-a="restore">Restore from a backup</button>' +
      '<button class="btn danger" data-a="erase">Erase everything</button>' +
      '</div><p class="muted small center">Next Up keeps everything on this device. Nothing is sent anywhere.</p>');
  },
  guide() {
    openSheet('<h3>Quick guide</h3><ol class="guide">' +
      '<li><b>Capture:</b> type in the bottom box and tap Add. Tap <b>!</b> first, or start with "!", to make it urgent. Use the keyboard mic to talk instead of type.</li>' +
      '<li><b>Start:</b> tap ▶ on a task. Only one task is "Doing now".</li>' +
      '<li><b>Interrupted?</b> Tap <b>Pause</b>, jot where you left off, and it goes to the top of the list.</li>' +
      '<li><b>Switching:</b> tap ▶ on another task. The current one goes back to the top on its own.</li>' +
      '<li><b>Tap a task</b> for options: urgent, set a time, waiting on someone, later, steps.</li>' +
      '<li><b>Checklists:</b> tap one to start it. The big ✓ on a running checklist ticks the next step.</li>' +
      '<li><b>Focus:</b> tap a time and go. Tap Invite someone to share an end time with a coworker.</li>' +
      '</ol><div class="btn-col"><button class="btn" data-a="sheet-close">Close</button></div>');
  },
  async badge() {
    if (S.badge) { S.badge = false; save(); try { navigator.clearAppBadge(); } catch (e) { /* ignore */ } closeSheet(); toast('App icon count off.'); return; }
    try {
      const p = await Notification.requestPermission();
      if (p === 'granted') { S.badge = true; save(); closeSheet(); toast('App icon now shows urgent + due count.'); }
      else { closeSheet(); toast('iPhone said no. You can allow it in Settings > Notifications.'); }
    } catch (e) { closeSheet(); toast('This phone can\'t show an icon count.'); }
  },
  async backup() {
    const name = 'next-up-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Next Up backup' }); closeSheet(); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    closeSheet();
  },
  restore() { $('#restore-file').click(); },
  erase() {
    openSheet('<h3>Erase everything?</h3><p>This deletes all tasks and resets checklists to the defaults. You can undo for a few seconds after.</p>' +
      '<div class="btn-col"><button class="btn danger" data-a="erase-go">Erase</button><button class="btn ghost" data-a="sheet-close">Cancel</button></div>');
  },
  'erase-go'() {
    const snap = snapshot();
    S = defaultState(); save(); closeSheet(); ui.tab = 'now'; ui.view = null; render(); toast('Erased.', restoreSnap(snap));
  },
  'hide-install'() { S.hideInstall = true; save(); render(); },
  'sheet-close'() { closeSheet(); },
  undo() {
    const fn = ui.undo; ui.undo = null;
    $('#toast').classList.remove('show'); $('#toast').hidden = true;
    if (fn) fn();
  }
};

function moveStep(el, dir) {
  const t = S.templates.find((x) => x.id === el.dataset.id);
  const i = Number(el.dataset.i), j = i + dir;
  if (j < 0 || j >= t.steps.length) return;
  [t.steps[i], t.steps[j]] = [t.steps[j], t.steps[i]];
  save(); render();
}

/* ---------- Forms ---------- */
const F = {
  wait(form) {
    const t = task(form.dataset.id);
    t.pri = 'waiting'; t.waitingOn = clampText($('#wait-input').value, 80);
    if (S.doingId === t.id) S.doingId = null;
    save(); closeSheet(); render(); toast('Moved to "Waiting on someone".');
  },
  due(form) {
    const t = task(form.dataset.id);
    const v = $('#due-input').value;
    if (!v) return;
    const [hh, mm] = v.split(':').map(Number);
    const d = new Date(); d.setHours(hh, mm, 0, 0);
    if (d.getTime() < Date.now() - 5 * MIN) d.setDate(d.getDate() + 1); // a time already gone means tomorrow
    t.dueAt = d.getTime(); t.dueAlerted = d.getTime() <= Date.now();
    save(); closeSheet(); render(); toast('Set for ' + fmtTime(t.dueAt));
  },
  edit(form) {
    const t = task(form.dataset.id);
    const text = clampText($('#edit-text').value, 300);
    if (text) t.text = text;
    const old = t.steps || [];
    t.steps = $('#edit-steps').value.split('\n').map((s) => clampText(s, 200)).filter(Boolean)
      .map((s) => ({ t: s, d: !!(old.find((o) => o.t === s) || {}).d }));
    save(); closeSheet(); render();
  },
  park() {
    const note = $('#park-input').value;
    parkCurrent(note);
    save(); closeSheet(); render();
    toast('Paused. It\'s at the top when you\'re ready.');
  },
  'paste-tpl'() {
    const v = $('#paste-input').value.trim();
    const m = /#cl=([A-Za-z0-9_-]+)/.exec(v) || /^([A-Za-z0-9_-]{8,})$/.exec(v);
    const c = m && parseChecklist(m[1]);
    if (!c) { toast('That doesn\'t look like a checklist link.'); return; }
    ui.pendingChecklist = c;
    A['import-tpl']();
  },
  jot() {
    const inp = $('#jot-input');
    const t = addTask(inp.value, false);
    if (!t) return;
    save(); inp.value = '';
    toast('Parked on your list for later.');
  }
};

/* ---------- Wiring ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const fn = A[el.dataset.a];
  if (!fn) return;
  e.preventDefault();
  fn(el, e);
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'capture') {
    const inp = $('#cap-input');
    const t = addTask(inp.value, ui.capUrgent);
    if (!t) return;
    inp.value = '';
    ui.capUrgent = false;
    ui.newId = t.id;
    save(); render();
    return;
  }
  const fn = F[form.dataset.form];
  if (fn) fn(form);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.run) {
    const r = S.runs.find((x) => x.id === el.dataset.run);
    if (r) { r.label = clampText(el.value, 60); save(); }
  } else if (el.dataset.tplName) {
    const t = S.templates.find((x) => x.id === el.dataset.tplName);
    if (t) { t.name = el.value.slice(0, 80); save(); }
  } else if (el.dataset.tplStep !== undefined && el.dataset.id) {
    const t = S.templates.find((x) => x.id === el.dataset.id);
    if (t) { t.steps[Number(el.dataset.tplStep)] = el.value.slice(0, 200); save(); }
  }
});

// Enter in a step field jumps to a new step (fast list typing).
document.addEventListener('keydown', (e) => {
  const el = e.target;
  if (e.key === 'Enter' && el.dataset && el.dataset.tplStep !== undefined) {
    e.preventDefault();
    const inputs = $$('[data-tpl-step]');
    const idx = inputs.indexOf(el);
    if (idx === inputs.length - 1) A['tpl-add-step']({ dataset: { id: el.dataset.id } });
    else inputs[idx + 1].focus();
  } else if (e.key === 'Enter' && el.classList && el.classList.contains('label-input')) {
    el.blur();
  } else if (e.key === 'Escape' && !$('#sheet-wrap').hidden) {
    closeSheet();
  }
});

$('#restore-file').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (!s || !Array.isArray(s.tasks) || !Array.isArray(s.templates)) throw new Error('bad');
    const snap = snapshot();
    const d = defaultState();
    for (const k in d) if (!(k in s)) s[k] = d[k];
    S = s; save(); closeSheet(); ui.tab = 'now'; ui.view = null; render(); toast('Backup restored.', restoreSnap(snap));
  } catch (err) { toast('That file isn\'t a Next Up backup.'); }
});

// First touch anywhere unlocks sound on iPhone (needed for chimes).
document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });

// Keep the capture bar above the iPhone keyboard.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const onVV = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', kb + 'px');
    document.body.classList.toggle('kb-open', kb > 80);
  };
  vv.addEventListener('resize', onVV);
  vv.addEventListener('scroll', onVV);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    S = load();
    if (S.focus && !S.focus.ended) keepAwake(true);
    tick();
    if (!typingInMain()) render();
  }
});

window.addEventListener('hashchange', () => handleHash(location.hash));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if (S.focus && !S.focus.ended) { ui.tab = 'focus'; keepAwake(true); }
render();
handleHash(location.hash);
setInterval(tick, 1000);
