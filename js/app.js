import { S, save, program, replaceState, resetPrograms, lastSaveError } from "./store.js";
import { NUTRITION } from "./data.js";
import { lineChart } from "./chart.js";
import { esc, uid, exKey, parseRest, fmtSec, num, fmtKg, fmtDate, fmtMonth, todayISO, fmtDuration, e1rm, daysAgo } from "./util.js";

const app = document.getElementById("app");
const timerBar = document.getElementById("timer");
const nav = document.getElementById("nav");

/* ------------------------------------------------------------------ helpers */

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function labelItems(items) {
  const out = [];
  let li = -1, sub = 0;
  items.forEach((it, i) => {
    const prev = items[i - 1];
    const next = items[i + 1];
    if (it.group && prev && prev.group === it.group) { sub++; out.push(`${LETTERS[li]}.${sub}`); }
    else {
      li++;
      if (it.group && next && next.group === it.group) { sub = 1; out.push(`${LETTERS[li]}.1`); }
      else { sub = 0; out.push(LETTERS[li] || "•"); }
    }
  });
  return out;
}

const sessionsDesc = () => [...S().sessions].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

function lastPerformance(key, beforeISO) {
  for (const s of sessionsDesc()) {
    if (beforeISO && new Date(s.startedAt) >= new Date(beforeISO)) continue;
    const ex = s.exercises.find((e) => e.key === key);
    if (ex && ex.sets.length) return { date: s.startedAt, sets: ex.sets };
  }
  return null;
}

function exerciseHistory(key) {
  return sessionsDesc()
    .map((s) => ({ s, ex: s.exercises.find((e) => e.key === key) }))
    .filter((r) => r.ex && r.ex.sets.length)
    .map(({ s, ex }) => {
      const best = Math.max(0, ...ex.sets.map((x) => e1rm(x.kg || 0, x.reps || 0)));
      const top = Math.max(0, ...ex.sets.map((x) => x.kg || 0));
      const vol = ex.sets.reduce((a, x) => a + (x.kg || 0) * (x.reps || 0), 0);
      return { id: s.id, date: s.startedAt, name: ex.name, sets: ex.sets, best, top, vol };
    });
}

const setsTxt = (sets) => sets.map((x) => (x.kg ? `${fmtKg(x.kg)}×${x.reps ?? "–"}` : `${x.reps ?? "–"}`)).join(" · ");
const sessionVolume = (s) => s.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.kg || 0) * (x.reps || 0), 0), 0);
const sessionSets = (s) => s.exercises.reduce((a, e) => a + e.sets.length, 0);

function prsOf(session) {
  const out = [];
  for (const ex of session.exercises) {
    const prev = exerciseHistory(ex.key).filter((h) => new Date(h.date) < new Date(session.startedAt));
    if (!prev.length) continue;
    const prevBest = Math.max(...prev.map((h) => h.best));
    const prevTop = Math.max(...prev.map((h) => h.top));
    const best = Math.max(0, ...ex.sets.map((x) => e1rm(x.kg || 0, x.reps || 0)));
    const top = Math.max(0, ...ex.sets.map((x) => x.kg || 0));
    if (top > prevTop) out.push({ key: ex.key, name: ex.name, txt: `nuovo carico max ${fmtKg(top)} kg` });
    else if (best > prevBest + 0.01) out.push({ key: ex.key, name: ex.name, txt: `nuovo 1RM stimato ${fmtKg(Math.round(best * 10) / 10)} kg` });
  }
  return out;
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("out"), 2200);
  setTimeout(() => t.remove(), 2700);
}

/* ------------------------------------------------------------------ routing */

const route = () => (location.hash.replace(/^#\/?/, "") || "home").split("/");
let lastRoute = "";

function render() {
  const r = route();
  const key = r.join("/");
  const views = { home: vHome, day: vDay, session: vSession, history: vHistory, log: vLog, progress: vProgress, ex: vExercise, weight: vWeight, food: vFood, settings: vSettings, edit: vEdit };
  const v = views[r[0]] || vHome;
  app.innerHTML = v(...r.slice(1));
  const tab = { home: "home", day: "home", session: "home", edit: "home", settings: "home", history: "history", log: "history", progress: "progress", ex: "progress", weight: "weight", food: "food" }[r[0]] || "home";
  nav.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  if (key !== lastRoute) window.scrollTo(0, 0);
  lastRoute = key;
  if (lastSaveError()) toast("Attenzione: memoria piena, esporta un backup");
  renderTimer();
}
window.addEventListener("hashchange", render);
const go = (h) => { location.hash = h; };

const header = (title, { back = null, right = "" } = {}) => `
  <header class="top">
    ${back ? `<a class="icon-btn" href="${back}" aria-label="Indietro">${ICON.back}</a>` : ""}
    <h1>${esc(title)}</h1>
    <div class="top-r">${right}</div>
  </header>`;

const activeBanner = () => {
  const a = S().active;
  if (!a || route()[0] === "session") return "";
  return `<a class="banner" href="#/session"><span class="pulse"></span><span><b>Allenamento in corso</b> · ${esc(a.dayTitle)}</span><span class="banner-go">Riprendi ›</span></a>`;
};

/* ------------------------------------------------------------------ HOME */

function vHome() {
  const st = S();
  const p = program();
  const done = sessionsDesc().filter((s) => s.programId === p.id);
  const next = done.length ? (done[0].dayIndex + 1) % p.days.length : 0;
  const week = sessionsDesc().filter((s) => Date.now() - new Date(s.startedAt) < 7 * 86400000).length;
  return `
  ${header("Allenamento", { right: `<a class="icon-btn" href="#/settings" aria-label="Impostazioni">${ICON.gear}</a>` })}
  ${activeBanner()}
  <div class="seg" role="tablist">
    ${st.programs.map((x) => `<button data-action="set-program" data-id="${x.id}" class="${x.id === p.id ? "on" : ""}">${esc(x.name)}</button>`).join("")}
  </div>
  <p class="muted center small">${esc(p.subtitle || "")}</p>
  <div class="stats3">
    <div><b>${week}</b><span>sedute 7 gg</span></div>
    <div><b>${st.sessions.length}</b><span>sedute totali</span></div>
    <div><b>${st.sessions.length ? daysAgo(sessionsDesc()[0].startedAt) : "–"}</b><span>ultima seduta</span></div>
  </div>
  ${p.days
    .map((d, i) => {
      const last = done.find((s) => s.dayIndex === i);
      return `<a class="day-card ${i === next ? "next" : ""}" href="#/day/${p.id}/${i}">
        <div>
          <span class="pill">GIORNO ${i + 1}</span>${i === next ? `<span class="pill ghost">prossimo</span>` : ""}
          <h3>${esc(d.title)}</h3>
          <p class="muted small">${d.items.length} esercizi${last ? ` · fatto ${fmtDate(last.startedAt)}` : ""}</p>
        </div>
        <span class="chev">${ICON.chev}</span>
      </a>`;
    })
    .join("")}
  <a class="link-row" href="#/edit/${p.id}">${ICON.edit} Modifica questa scheda</a>`;
}

/* ------------------------------------------------------------------ DAY */

function vDay(pid, di) {
  const p = program(pid);
  const d = p.days[+di];
  if (!d) return vHome();
  const labels = labelItems(d.items);
  let html = "";
  d.items.forEach((it, i) => {
    const prevG = d.items[i - 1]?.group, nextG = d.items[i + 1]?.group;
    const startSS = it.group && it.group !== prevG && it.group === nextG;
    if (startSS) html += `<div class="ss-head">${ICON.loop} Superserie — senza pausa tra gli esercizi</div>`;
    const last = lastPerformance(exKey(it.name));
    html += `<a class="ex-row ${it.group && (it.group === prevG || it.group === nextG) ? "ss" : ""}" href="#/ex/${encodeURIComponent(exKey(it.name))}">
      <span class="lt">${labels[i]}</span>
      <div class="ex-main">
        <h4>${esc(it.name)}</h4>
        <p class="spec"><b>Serie:</b> ${esc(it.sets)} <b>Rip:</b> ${esc(it.reps)} <b>Rec:</b> ${esc(it.rest)}</p>
        ${it.note ? `<p class="note">${esc(it.note)}</p>` : ""}
        ${last ? `<p class="last">Ultima: ${esc(setsTxt(last.sets))} <span class="muted">(${fmtDate(last.date)})</span></p>` : ""}
      </div>
    </a>`;
  });
  return `
  ${header(`Giorno ${+di + 1}`, { back: "#/", right: `<a class="icon-btn" href="#/edit/${p.id}" aria-label="Modifica">${ICON.edit}</a>` })}
  ${activeBanner()}
  <h2 class="day-title">${esc(d.title)}</h2>
  <p class="muted small">${esc(p.name)} · ${d.items.length} esercizi</p>
  ${html}
  <div class="sticky-cta"><button class="btn primary big" data-action="start" data-pid="${p.id}" data-di="${di}">Inizia allenamento ${ICON.play}</button></div>`;
}

/* ------------------------------------------------------------------ SESSION */

function startSession(pid, di) {
  const st = S();
  if (st.active) {
    if (st.active.programId === pid && st.active.dayIndex === +di) return go("#/session");
    if (!confirm(`C'è già un allenamento in corso (${st.active.dayTitle}). Vuoi abbandonarlo e iniziarne uno nuovo?`)) return;
  }
  const p = program(pid);
  const d = p.days[+di];
  st.active = {
    id: uid(),
    programId: p.id,
    programName: p.name,
    dayIndex: +di,
    dayTitle: d.title,
    startedAt: new Date().toISOString(),
    note: "",
    exercises: d.items.map((it) => ({
      key: exKey(it.name),
      name: it.name,
      target: { sets: it.sets, reps: it.reps, rest: it.rest, note: it.note, group: it.group },
      sets: Array.from({ length: Math.max(1, parseInt(it.sets) || 3) }, () => ({ kg: "", reps: "", done: false })),
    })),
  };
  save();
  go("#/session");
}

function vSession() {
  const a = S().active;
  if (!a) return `${header("Allenamento", { back: "#/" })}<div class="empty">Nessun allenamento in corso.<br><a class="btn" href="#/">Scegli un giorno</a></div>`;
  const items = a.exercises.map((e) => ({ group: e.target.group }));
  const labels = labelItems(items);
  const doneSets = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  const totSets = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  let html = "";
  a.exercises.forEach((ex, ei) => {
    const prevG = items[ei - 1]?.group, nextG = items[ei + 1]?.group;
    const inSS = ex.target.group && (ex.target.group === prevG || ex.target.group === nextG);
    if (ex.target.group && ex.target.group !== prevG && ex.target.group === nextG) html += `<div class="ss-head">${ICON.loop} Superserie — senza pausa tra gli esercizi</div>`;
    const last = lastPerformance(ex.key);
    const allDone = ex.sets.length && ex.sets.every((x) => x.done);
    html += `<section class="ex-card ${inSS ? "ss" : ""} ${allDone ? "complete" : ""}" id="ex-${ei}">
      <div class="ex-head">
        <span class="lt">${labels[ei]}</span>
        <div class="ex-main">
          <h4>${esc(ex.name)}</h4>
          <p class="spec"><b>Serie:</b> ${esc(ex.target.sets)} <b>Rip:</b> ${esc(ex.target.reps)} <b>Rec:</b> ${esc(ex.target.rest)}</p>
          ${ex.target.note ? `<p class="note">${esc(ex.target.note)}</p>` : ""}
          ${last ? `<p class="last">Ultima volta (${fmtDate(last.date)}): ${esc(setsTxt(last.sets))}</p>` : `<p class="last muted">Prima volta: scrivi il carico che usi.</p>`}
        </div>
      </div>
      <div class="sets">
        <div class="set-row head"><span>Serie</span><span>kg</span><span>reps</span><span></span></div>
        ${ex.sets
          .map((s, si) => {
            const ref = last ? last.sets[Math.min(si, last.sets.length - 1)] : null;
            return `<div class="set-row ${s.done ? "done" : ""}" data-ei="${ei}" data-si="${si}">
              <span class="n">${si + 1}</span>
              <input inputmode="decimal" enterkeyhint="next" data-field="kg" data-ei="${ei}" data-si="${si}" value="${esc(s.kg)}" placeholder="${ref?.kg != null ? fmtKg(ref.kg) : "kg"}" ${ref?.kg != null ? 'data-auto="1"' : ""} aria-label="Chili serie ${si + 1}">
              <input inputmode="numeric" enterkeyhint="done" data-field="reps" data-ei="${ei}" data-si="${si}" value="${esc(s.reps)}" placeholder="${ref?.reps != null ? ref.reps : esc((String(ex.target.reps).match(/\d+/) || ["reps"])[0])}" ${ref?.reps != null ? 'data-auto="1"' : ""} aria-label="Ripetizioni serie ${si + 1}">
              <button class="chk" data-action="toggle-set" data-ei="${ei}" data-si="${si}" aria-label="Serie fatta">${ICON.check}</button>
            </div>`;
          })
          .join("")}
      </div>
      <div class="ex-actions">
        <button class="btn small ghost" data-action="add-set" data-ei="${ei}">+ Serie</button>
        <button class="btn small ghost" data-action="del-set" data-ei="${ei}" ${ex.sets.length <= 1 ? "disabled" : ""}>− Serie</button>
        <a class="btn small ghost" href="#/ex/${encodeURIComponent(ex.key)}">Storico</a>
      </div>
    </section>`;
  });
  const mins = Math.floor((Date.now() - new Date(a.startedAt)) / 60000);
  return `
  ${header(a.dayTitle, { back: "#/" })}
  <div class="sess-bar">
    <span>${esc(a.programName)} · Giorno ${a.dayIndex + 1}</span>
    <span><b id="sess-count">${doneSets}/${totSets}</b> serie · <span id="sess-time">${mins} min</span></span>
  </div>
  <div class="progress"><i id="sess-prog" style="width:${totSets ? (doneSets / totSets) * 100 : 0}%"></i></div>
  ${html}
  <label class="field"><span>Note allenamento</span><textarea data-field="note" rows="2" placeholder="Sensazioni, dolori, energia…">${esc(a.note)}</textarea></label>
  <div class="row gap">
    <button class="btn danger ghost" data-action="discard">Annulla</button>
    <button class="btn primary grow" data-action="finish">Termina e salva</button>
  </div>
  <div class="spacer"></div>`;
}

function updateSessionCounters() {
  const a = S().active;
  if (!a) return;
  const d = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  const t = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  const c = document.getElementById("sess-count");
  if (c) c.textContent = `${d}/${t}`;
  const p = document.getElementById("sess-prog");
  if (p) p.style.width = `${t ? (d / t) * 100 : 0}%`;
  a.exercises.forEach((e, ei) => document.getElementById(`ex-${ei}`)?.classList.toggle("complete", e.sets.every((x) => x.done)));
}

function toggleSet(ei, si) {
  const a = S().active;
  const ex = a.exercises[ei];
  const s = ex.sets[si];
  const row = app.querySelector(`.set-row[data-ei="${ei}"][data-si="${si}"]`);
  if (s.done) {
    s.done = false;
  } else {
    const kgIn = row.querySelector('[data-field="kg"]');
    const repsIn = row.querySelector('[data-field="reps"]');
    // Se il campo è vuoto usa il valore della volta scorsa (placeholder)
    if (s.kg === "" && kgIn.dataset.auto && num(kgIn.placeholder) != null) { s.kg = kgIn.placeholder; kgIn.value = s.kg; }
    if (s.reps === "" && repsIn.dataset.auto && num(repsIn.placeholder) != null) { s.reps = repsIn.placeholder; repsIn.value = s.reps; }
    if (num(s.reps) == null) { repsIn.focus(); toast("Scrivi le ripetizioni"); return; }
    s.done = true;
    // Timer: nelle superserie parte solo dopo l'ultimo esercizio del gruppo
    const rest = parseRest(ex.target.rest);
    const nextEx = a.exercises[ei + 1];
    const inSSnotLast = ex.target.group && nextEx && nextEx.target.group === ex.target.group;
    let r = rest;
    if (inSSnotLast) r = 0;
    else if (ex.target.group && rest === 0) {
      // ultimo della superserie con recupero 0: usa il recupero del primo esercizio del gruppo
      for (let k = ei - 1; k >= 0 && a.exercises[k].target.group === ex.target.group; k--) r = parseRest(a.exercises[k].target.rest) || r;
    }
    if (r > 0) startTimer(r, ex.name);
    if (navigator.vibrate) navigator.vibrate(30);
  }
  row.classList.toggle("done", s.done);
  save();
  updateSessionCounters();
}

function finishSession() {
  const st = S();
  const a = st.active;
  const exercises = a.exercises
    .map((e) => ({
      key: e.key,
      name: e.name,
      sets: e.sets.filter((x) => x.done || (num(x.reps) != null)).map((x) => ({ kg: num(x.kg), reps: num(x.reps) })).filter((x) => x.reps != null),
    }))
    .filter((e) => e.sets.length);
  const pending = a.exercises.reduce((n, e) => n + e.sets.filter((x) => !x.done && num(x.reps) == null).length, 0);
  if (!exercises.length) {
    if (confirm("Non hai registrato nessuna serie. Vuoi chiudere l'allenamento senza salvarlo?")) { st.active = null; save(); stopTimer(); go("#/"); }
    return;
  }
  if (pending && !confirm(`Ci sono ${pending} serie non compilate: verranno ignorate. Terminare?`)) return;
  const session = { id: a.id, programId: a.programId, programName: a.programName, dayIndex: a.dayIndex, dayTitle: a.dayTitle, startedAt: a.startedAt, endedAt: new Date().toISOString(), note: a.note, exercises };
  st.sessions.push(session);
  st.active = null;
  save();
  stopTimer();
  releaseWake();
  go(`#/log/${session.id}?fine`);
}

/* ------------------------------------------------------------------ TIMER */

let tick = null;
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.18);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch {}
}
function startTimer(sec, label) {
  const a = S().active;
  if (!a) return;
  a.timer = { end: Date.now() + sec * 1000, total: sec, label, rang: false };
  save();
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch {}
  renderTimer();
}
function stopTimer() {
  const a = S().active;
  if (a) { a.timer = null; save(); }
  renderTimer();
}
function renderTimer() {
  const t = S().active?.timer;
  clearInterval(tick);
  if (!t) { timerBar.hidden = true; document.body.classList.remove("has-timer"); return; }
  timerBar.hidden = false;
  document.body.classList.add("has-timer");
  const draw = () => {
    const left = (t.end - Date.now()) / 1000;
    const over = left <= 0;
    timerBar.classList.toggle("over", over);
    timerBar.innerHTML = `
      <div class="t-fill" style="width:${over ? 100 : (1 - left / t.total) * 100}%"></div>
      <div class="t-main"><span class="t-label">${over ? "Recupero finito — vai!" : "Recupero"} · ${esc(t.label)}</span><span class="t-time">${over ? "+" + fmtSec(-left) : fmtSec(left)}</span></div>
      <div class="t-btns">
        <button data-action="t-add" data-v="-15">−15</button>
        <button data-action="t-add" data-v="15">+15</button>
        <button data-action="t-stop">${over ? "Chiudi" : "Salta"}</button>
      </div>`;
    if (over && !t.rang) {
      t.rang = true; save();
      beep();
      if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]);
    }
  };
  draw();
  tick = setInterval(draw, 500);
}
timerBar.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const t = S().active?.timer;
  if (!t) return;
  if (b.dataset.action === "t-stop") return stopTimer();
  const v = +b.dataset.v;
  t.end = Math.max(Date.now(), t.end + v * 1000);
  if (v > 0 && t.end - Date.now() > 0) t.rang = false;
  t.total = Math.max(t.total, (t.end - Date.now()) / 1000);
  save();
  renderTimer();
});

// Schermo acceso durante l'allenamento
let wake = null;
async function keepAwake() {
  if (!S().active || wake || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
  try { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null)); } catch {}
}
function releaseWake() { try { wake?.release(); } catch {} wake = null; }
document.addEventListener("visibilitychange", () => { keepAwake(); renderTimer(); });
setInterval(() => {
  const el = document.getElementById("sess-time");
  const a = S().active;
  if (el && a) el.textContent = `${Math.floor((Date.now() - new Date(a.startedAt)) / 60000)} min`;
}, 30000);

/* ------------------------------------------------------------------ HISTORY */

function vHistory() {
  const list = sessionsDesc();
  if (!list.length) return `${header("Storico")}${activeBanner()}<div class="empty">Qui troverai tutti i tuoi allenamenti.<br>Inizia una seduta dalla scheda.</div>`;
  let html = "", month = "";
  for (const s of list) {
    const m = fmtMonth(s.startedAt);
    if (m !== month) { month = m; html += `<h5 class="month">${m}</h5>`; }
    html += `<a class="hist-card" href="#/log/${s.id}">
      <div class="date"><b>${new Date(s.startedAt).getDate()}</b><span>${fmtDate(s.startedAt, true).split(" ")[0]}</span></div>
      <div class="grow"><h4>${esc(s.dayTitle)}</h4><p class="muted small">${esc(s.programName)} · ${sessionSets(s)} serie · ${fmtKg(Math.round(sessionVolume(s)))} kg volume${s.endedAt ? ` · ${fmtDuration(new Date(s.endedAt) - new Date(s.startedAt))}` : ""}</p></div>
      <span class="chev">${ICON.chev}</span></a>`;
  }
  return `${header("Storico")}${activeBanner()}${html}`;
}

function vLog(id) {
  const [sid, flag] = String(id).split("?");
  const s = S().sessions.find((x) => x.id === sid);
  if (!s) return `${header("Seduta", { back: "#/history" })}<div class="empty">Seduta non trovata.</div>`;
  const prs = prsOf(s);
  const fin = flag === "fine" || location.hash.includes("?fine");
  return `
  ${header(fin ? "Allenamento salvato" : "Seduta", { back: "#/history" })}
  ${fin ? `<div class="done-hero">${ICON.check}<div><b>Ottimo lavoro.</b><br><span class="small">Seduta salvata nello storico.</span></div></div>` : ""}
  <h2 class="day-title">${esc(s.dayTitle)}</h2>
  <p class="muted small">${fmtDate(s.startedAt, true)} · ${new Date(s.startedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · ${esc(s.programName)}</p>
  <div class="stats3">
    <div><b>${s.endedAt ? fmtDuration(new Date(s.endedAt) - new Date(s.startedAt)) : "–"}</b><span>durata</span></div>
    <div><b>${sessionSets(s)}</b><span>serie</span></div>
    <div><b>${fmtKg(Math.round(sessionVolume(s)))}</b><span>kg volume</span></div>
  </div>
  ${prs.length ? `<div class="pr-box"><h5>${ICON.trophy} Record personali</h5>${prs.map((p) => `<p><b>${esc(p.name)}</b>: ${esc(p.txt)}</p>`).join("")}</div>` : ""}
  ${s.exercises
    .map(
      (e, ei) => `<section class="ex-card">
      <div class="ex-head"><div class="ex-main"><a href="#/ex/${encodeURIComponent(e.key)}"><h4>${esc(e.name)} ›</h4></a></div></div>
      <div class="sets">
        <div class="set-row head"><span>Serie</span><span>kg</span><span>reps</span><span></span></div>
        ${e.sets
          .map(
            (x, si) => `<div class="set-row log">
          <span class="n">${si + 1}</span>
          <input inputmode="decimal" data-logfield="kg" data-sid="${s.id}" data-ei="${ei}" data-si="${si}" value="${x.kg != null ? fmtKg(x.kg) : ""}" aria-label="kg">
          <input inputmode="numeric" data-logfield="reps" data-sid="${s.id}" data-ei="${ei}" data-si="${si}" value="${x.reps ?? ""}" aria-label="reps">
          <span class="muted small">${x.kg && x.reps ? "≈" + Math.round(e1rm(x.kg, x.reps)) : ""}</span>
        </div>`
          )
          .join("")}
      </div></section>`
    )
    .join("")}
  ${s.note ? `<div class="note-box"><b>Note:</b> ${esc(s.note)}</div>` : ""}
  <p class="muted small center">Puoi correggere kg e reps toccando i valori. "≈" = 1RM stimato (formula di Epley).</p>
  <button class="btn danger ghost full" data-action="del-session" data-id="${s.id}">Elimina seduta</button>
  <div class="spacer"></div>`;
}

/* ------------------------------------------------------------------ PROGRESS */

let progQuery = "";
function vProgress() {
  const map = new Map();
  for (const s of sessionsDesc()) for (const e of s.exercises) {
    if (!map.has(e.key)) map.set(e.key, { key: e.key, name: e.name, n: 0, last: s.startedAt, top: 0 });
    const m = map.get(e.key);
    m.n++;
    m.top = Math.max(m.top, ...e.sets.map((x) => x.kg || 0));
  }
  const rows = [...map.values()].filter((r) => !progQuery || r.key.includes(exKey(progQuery)));
  const bw = [...S().bodyweight].sort((a, b) => a.date.localeCompare(b.date));
  return `${header("Progressi")}${activeBanner()}
  ${bw.length ? `<a class="mini-card" href="#/weight"><span>Peso corporeo</span><b>${fmtKg(bw.at(-1).kg)} kg</b></a>` : ""}
  <input class="search" type="search" placeholder="Cerca esercizio…" value="${esc(progQuery)}" data-action="prog-search">
  ${rows.length
    ? rows
        .map(
          (r) => `<a class="hist-card" href="#/ex/${encodeURIComponent(r.key)}"><div class="grow"><h4>${esc(r.name)}</h4>
          <p class="muted small">${r.n} ${r.n === 1 ? "seduta" : "sedute"} · max ${fmtKg(r.top)} kg · ultima ${fmtDate(r.last)}</p></div><span class="chev">${ICON.chev}</span></a>`
        )
        .join("")
    : `<div class="empty">${map.size ? "Nessun esercizio trovato." : "I grafici compaiono dopo la prima seduta salvata."}</div>`}`;
}

let exMetric = "best";
function vExercise(k) {
  const key = decodeURIComponent(k || "");
  const hist = exerciseHistory(key);
  const name = hist[0]?.name || findNameInPrograms(key) || key;
  const back = S().active ? "#/session" : "#/progress";
  if (!hist.length) return `${header(name, { back })}<div class="empty">Nessuna serie registrata per questo esercizio.</div>`;
  const metrics = { best: ["1RM stimato", (h) => Math.round(h.best * 10) / 10], top: ["Carico max", (h) => h.top], vol: ["Volume", (h) => Math.round(h.vol)] };
  const [mLabel, mFn] = metrics[exMetric];
  const pts = hist.map((h) => ({ t: h.date, y: mFn(h) }));
  const bestTop = Math.max(...hist.map((h) => h.top));
  const bestE = Math.max(...hist.map((h) => h.best));
  const maxRepsAtTop = Math.max(...hist.flatMap((h) => h.sets.filter((x) => x.kg === bestTop).map((x) => x.reps || 0)));
  return `${header(name, { back })}
  <div class="stats3">
    <div><b>${fmtKg(bestTop)}</b><span>carico max (×${maxRepsAtTop})</span></div>
    <div><b>${fmtKg(Math.round(bestE * 10) / 10)}</b><span>1RM stimato</span></div>
    <div><b>${hist.length}</b><span>sedute</span></div>
  </div>
  <div class="seg small">${Object.entries(metrics).map(([k, [l]]) => `<button data-action="metric" data-m="${k}" class="${k === exMetric ? "on" : ""}">${l}</button>`).join("")}</div>
  <div class="card">${lineChart(pts, { unit: exMetric === "vol" ? "kg" : "kg" })}</div>
  <h5 class="month">Tutte le sedute</h5>
  ${hist
    .map(
      (h) => `<a class="hist-card" href="#/log/${h.id}"><div class="grow"><h4>${fmtDate(h.date, true)}</h4><p class="small">${esc(setsTxt(h.sets))}</p>
      <p class="muted small">1RM st. ${fmtKg(Math.round(h.best * 10) / 10)} · volume ${fmtKg(Math.round(h.vol))} kg</p></div></a>`
    )
    .join("")}
  <p class="muted small center">1RM stimato con formula di Epley: utile per vedere la tendenza, non è un massimale reale.</p>`;
}
function findNameInPrograms(key) {
  for (const p of S().programs) for (const d of p.days) for (const it of d.items) if (exKey(it.name) === key) return it.name;
  return null;
}

/* ------------------------------------------------------------------ WEIGHT */

function vWeight() {
  const bw = [...S().bodyweight].sort((a, b) => a.date.localeCompare(b.date));
  const last = bw.at(-1);
  const avg = (days) => {
    const from = Date.now() - days * 86400000;
    const r = bw.filter((x) => new Date(x.date).getTime() >= from);
    return r.length ? r.reduce((a, x) => a + x.kg, 0) / r.length : null;
  };
  // pendenza (kg/settimana) negli ultimi 28 giorni, regressione lineare
  const r28 = bw.filter((x) => Date.now() - new Date(x.date) <= 28 * 86400000);
  let slope = null;
  const span = r28.length ? (new Date(r28.at(-1).date) - new Date(r28[0].date)) / 86400000 : 0;
  if (r28.length >= 4 && span >= 10) {
    const xs = r28.map((x) => new Date(x.date).getTime() / (7 * 86400000)), ys = r28.map((x) => x.kg);
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    slope = den ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den : null;
  }
  const a7 = avg(7);
  const pct = slope != null && a7 ? (slope / a7) * 100 : null;
  return `${header("Peso corporeo")}${activeBanner()}
  <form class="card weigh" data-form="weight">
    <label class="field"><span>Data</span><input type="date" name="date" value="${todayISO()}" max="${todayISO()}" required></label>
    <label class="field"><span>Peso (kg)</span><input name="kg" inputmode="decimal" placeholder="${last ? fmtKg(last.kg) : "es. 78,5"}" required></label>
    <button class="btn primary" type="submit">Salva</button>
  </form>
  <div class="stats3">
    <div><b>${last ? fmtKg(last.kg) : "–"}</b><span>ultimo</span></div>
    <div><b>${a7 ? fmtKg(Math.round(a7 * 10) / 10) : "–"}</b><span>media 7 gg</span></div>
    <div><b>${slope != null ? (slope > 0 ? "+" : "") + fmtKg(Math.round(slope * 100) / 100) : "–"}</b><span>kg/sett. (28 gg)</span></div>
  </div>
  ${stepCard(slope, r28.length, span)}
  ${pct != null ? `<p class="muted small center">Variazione ${pct > 0 ? "+" : ""}${(Math.round(pct * 100) / 100).toLocaleString("it-IT")}% del peso a settimana. In fase di massa il riferimento in letteratura è circa +0,25–0,5%/sett.</p>` : `<p class="muted small center">Pesati al mattino, a digiuno, dopo il bagno. Conta la media settimanale, non il singolo dato.</p>`}
  <div class="card">${lineChart(bw.map((x) => ({ t: x.date, y: x.kg })))}</div>
  ${bw
    .slice()
    .reverse()
    .map((x) => `<div class="w-row"><span>${fmtDate(x.date, true)}</span><b>${fmtKg(x.kg)} kg</b><button class="icon-btn small" data-action="del-weight" data-date="${x.date}" aria-label="Elimina">${ICON.x}</button></div>`)
    .join("")}`;
}

function stepCard(slope, n, span) {
  const st = S();
  const steps = NUTRITION.phases;
  const cur = Math.min(st.carbStep ?? 0, steps.length - 1);
  const since = st.carbStepDate ? Math.floor((Date.now() - new Date(st.carbStepDate)) / 86400000) : null;
  const wait = since != null && since < 14;
  let cls = "ok", title, msg;
  if (slope == null) {
    cls = "wait"; title = "Servono più pesate";
    msg = `Pesati ogni mattina: dopo almeno 4 pesate su 10+ giorni ti dico se aumentare (ora: ${n}${n ? `, su ${Math.round(span)} giorni` : ""}).`;
  } else if (wait) {
    cls = "wait"; title = `Aspetta ancora ${14 - since} giorni`;
    msg = `Hai cambiato gradino ${since === 0 ? "oggi" : `${since} giorni fa`}: i primi giorni il peso sale per acqua e glicogeno. Valuta dopo 2 settimane.`;
  } else if (slope < 0.2) {
    cls = "low"; title = "Sotto obiettivo → sali di un gradino";
    msg = cur < steps.length - 1 ? `Passa a <b>${esc(steps[cur + 1][0])}</b>: ${esc(steps[cur + 1][1])}.` : "Sei all'ultimo gradino: aggiungi ~150 kcal di carboidrati densi (frutta secca, cereali, pane).";
  } else if (slope > 0.4) {
    cls = "high"; title = "Sopra obiettivo → scendi di un gradino";
    msg = cur > 0 ? `Torna a <b>${esc(steps[cur - 1][0])}</b>: ${esc(steps[cur - 1][1])}.` : "Togli ~150 kcal (es. 20 g di pasta a pasto): stai prendendo troppo grasso.";
  } else {
    title = "In linea → resta così"; msg = "Continua con quello che mangi adesso.";
  }
  return `<div class="status ${cls}"><b>${title}</b><p>${msg}</p>
    <div class="step-now"><span>Gradino attuale: <b>${esc(steps[cur][0])}</b> · ${esc(steps[cur][1])}</span></div>
    <div class="row gap wrap">
      <button class="btn small" data-action="step" data-d="-1" ${cur === 0 ? "disabled" : ""}>− Gradino</button>
      <button class="btn small" data-action="step" data-d="1" ${cur === steps.length - 1 ? "disabled" : ""}>+ Gradino</button>
    </div>
    <span class="small">Obiettivo +0,2–0,4 kg/sett. Quando cambi davvero cosa mangi, aggiorna il gradino qui.</span></div>`;
}

/* ------------------------------------------------------------------ FOOD */

function vFood() {
  const N = NUTRITION;
  return `${header("Alimentazione")}${activeBanner()}
  <div class="card kv">${N.summary.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>
  ${N.meals
    .map(
      (m) => `<details class="meal" ${m.name === "Pranzo" ? "" : ""}><summary><h3>${esc(m.name)}</h3><span class="chev">${ICON.chev}</span></summary>
      ${m.hint ? `<p class="muted small">${esc(m.hint)}</p>` : ""}
      ${m.groups
        .map((g) => `${g.title ? `<h5>${esc(g.title)}</h5>` : ""}<table>${g.rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table>`)
        .join("")}
    </details>`
    )
    .join("")}
  <h5 class="month">Come alzare i carboidrati</h5>
  <div class="card">
    <p class="small">${esc(N.phasesNote)}</p>
    <table class="phases">${N.phases.map(([a, b, c], i) => `<tr class="${i === (S().carbStep ?? 0) ? "cur" : ""}"><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</table>
    <a class="btn small full" href="#/weight">Controlla il tuo andamento</a>
  </div>
  <h5 class="month">Che frutta</h5>
  <div class="card kv">${N.fruits.map(([k, v]) => `<div><b>${esc(k)}</b><span class="small">${esc(v)}</span></div>`).join("")}</div>
  <h5 class="month">Regole</h5>
  <div class="card"><ul class="rules">${N.rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
  <h5 class="month">Integrazione</h5>
  <div class="card supp">${N.supplements.map(([k, list]) => `<div><span>${esc(k)}</span><ul>${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>
  <div class="spacer"></div>`;
}

/* ------------------------------------------------------------------ SETTINGS */

function vSettings() {
  const st = S();
  let size = 0;
  try { size = (localStorage.getItem("gymlog.v1") || "").length; } catch {}
  return `${header("Impostazioni", { back: "#/" })}
  <h5 class="month">Schede</h5>
  <div class="card list">
    ${st.programs.map((p) => `<a href="#/edit/${p.id}"><span>${esc(p.name)} <span class="muted small">· ${esc(p.subtitle || p.days.length + " giorni")}</span></span>${p.id === st.activeProgramId ? `<span class="pill">attiva</span>` : ""}<span class="chev">${ICON.chev}</span></a>`).join("")}
    <button data-action="new-program">+ Nuova scheda vuota</button>
  </div>
  <h5 class="month">Backup dei dati</h5>
  <div class="card">
    <p class="small">I dati sono salvati <b>solo su questo telefono</b>. Esporta un backup ogni tanto (es. su Drive o WhatsApp a te stesso): se cambi telefono o cancelli i dati del browser lo reimporti da qui.</p>
    <div class="row gap wrap">
      <button class="btn primary" data-action="export">Esporta backup</button>
      <label class="btn">Importa backup<input type="file" accept=".json,application/json" data-action="import" hidden></label>
    </div>
    <p class="muted small">Versione app 7 · ${st.sessions.length} sedute · ${st.bodyweight.length} pesate · ${(size / 1024).toFixed(1)} KB</p>
  </div>
  <h5 class="month">Installa sul telefono</h5>
  <div class="card small">
    <p><b>Android (Chrome):</b> menu ⋮ → <i>Aggiungi a schermata Home</i> / <i>Installa app</i>.</p>
    <p><b>iPhone (Safari):</b> tasto Condividi → <i>Aggiungi alla schermata Home</i>.</p>
    <p class="muted">Una volta installata funziona anche senza internet.</p>
  </div>
  <h5 class="month">Ripristino</h5>
  <div class="card">
    <div class="row gap wrap">
      <button class="btn ghost" data-action="reset-programs">Ripristina schede originali</button>
      <button class="btn danger ghost" data-action="wipe">Cancella tutti i dati</button>
    </div>
    <p class="muted small">"Ripristina schede" non tocca lo storico.</p>
  </div>
  <div class="spacer"></div>`;
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(S(), null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `backup-allenamenti-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  S().lastBackup = new Date().toISOString();
  save();
}

/* ------------------------------------------------------------------ EDITOR */

function vEdit(pid) {
  const p = program(pid);
  return `${header("Modifica scheda", { back: "#/settings" })}
  <div class="card">
    <label class="field"><span>Nome scheda</span><input data-edit="pname" data-pid="${p.id}" value="${esc(p.name)}"></label>
    <label class="field"><span>Descrizione</span><input data-edit="psub" data-pid="${p.id}" value="${esc(p.subtitle || "")}"></label>
    <div class="row gap wrap">
      ${p.id === S().activeProgramId ? `<span class="pill">scheda attiva</span>` : `<button class="btn small" data-action="set-program" data-id="${p.id}">Usa questa scheda</button>`}
      <button class="btn small ghost" data-action="dup-program" data-pid="${p.id}">Duplica</button>
      ${S().programs.length > 1 ? `<button class="btn small danger ghost" data-action="del-program" data-pid="${p.id}">Elimina</button>` : ""}
    </div>
  </div>
  ${p.days
    .map(
      (d, di) => `<details class="edit-day" ${di === 0 ? "open" : ""}>
    <summary><span class="pill">GIORNO ${di + 1}</span> <b>${esc(d.title)}</b><span class="chev">${ICON.chev}</span></summary>
    <label class="field"><span>Titolo giorno</span><input data-edit="dtitle" data-pid="${p.id}" data-di="${di}" value="${esc(d.title)}"></label>
    ${d.items
      .map(
        (it, ii) => `<div class="edit-ex">
        <div class="row gap"><b class="lt small">${ii + 1}</b>
          <input class="grow" data-edit="name" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" value="${esc(it.name)}" aria-label="Nome esercizio">
        </div>
        <div class="grid4">
          <label><span>Serie</span><input inputmode="numeric" data-edit="sets" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" value="${esc(it.sets)}"></label>
          <label><span>Rip</span><input data-edit="reps" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" value="${esc(it.reps)}"></label>
          <label><span>Recupero</span><input data-edit="rest" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" value="${esc(it.rest)}"></label>
          <label><span>Superserie</span><input data-edit="group" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" value="${esc(it.group || "")}" placeholder="—"></label>
        </div>
        <input data-edit="note" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" value="${esc(it.note || "")}" placeholder="Note tecniche" aria-label="Note">
        <div class="row gap end">
          <button class="icon-btn small" data-action="mv" data-dir="-1" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" ${ii === 0 ? "disabled" : ""} aria-label="Su">↑</button>
          <button class="icon-btn small" data-action="mv" data-dir="1" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" ${ii === d.items.length - 1 ? "disabled" : ""} aria-label="Giù">↓</button>
          <button class="icon-btn small danger" data-action="del-ex" data-pid="${p.id}" data-di="${di}" data-ii="${ii}" aria-label="Elimina">${ICON.x}</button>
        </div>
      </div>`
      )
      .join("")}
    <div class="row gap wrap">
      <button class="btn small" data-action="add-ex" data-pid="${p.id}" data-di="${di}">+ Esercizio</button>
      ${p.days.length > 1 ? `<button class="btn small danger ghost" data-action="del-day" data-pid="${p.id}" data-di="${di}">Elimina giorno</button>` : ""}
    </div>
  </details>`
    )
    .join("")}
  <button class="btn full" data-action="add-day" data-pid="${p.id}">+ Aggiungi giorno</button>
  <p class="muted small center">Le modifiche si salvano da sole. Per una superserie scrivi la stessa lettera (es. "F") nel campo Superserie di esercizi consecutivi. Lo storico è legato al nome dell'esercizio: se lo rinomini, lo storico precedente resta col vecchio nome.</p>
  <div class="spacer"></div>`;
}

/* ------------------------------------------------------------------ EVENTS */

app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const st = S();
  const A = el.dataset.action;
  const d = el.dataset;
  const P = () => program(d.pid);
  switch (A) {
    case "set-program": st.activeProgramId = d.id; save(); route()[0] === "edit" ? render() : render(); break;
    case "start": startSession(d.pid, d.di); keepAwake(); break;
    case "toggle-set": toggleSet(+d.ei, +d.si); break;
    case "add-set": {
      const ex = st.active.exercises[+d.ei];
      const lastS = ex.sets.at(-1);
      ex.sets.push({ kg: lastS?.kg || "", reps: "", done: false });
      save(); render(); break;
    }
    case "del-set": {
      const ex = st.active.exercises[+d.ei];
      if (ex.sets.length > 1) { ex.sets.pop(); save(); render(); }
      break;
    }
    case "finish": finishSession(); break;
    case "discard":
      if (confirm("Annullare l'allenamento? Le serie scritte andranno perse.")) { st.active = null; save(); stopTimer(); releaseWake(); go("#/"); }
      break;
    case "del-session":
      if (confirm("Eliminare definitivamente questa seduta?")) { st.sessions = st.sessions.filter((s) => s.id !== d.id); save(); go("#/history"); }
      break;
    case "metric": exMetric = d.m; render(); break;
    case "step": {
      const max = NUTRITION.phases.length - 1;
      st.carbStep = Math.max(0, Math.min(max, (st.carbStep ?? 0) + +d.d));
      st.carbStepDate = new Date().toISOString();
      save(); render(); break;
    }
    case "del-weight": st.bodyweight = st.bodyweight.filter((x) => x.date !== d.date); save(); render(); break;
    case "export": exportBackup(); break;
    case "reset-programs":
      if (confirm("Ripristinare le schede 3/4/5 giorni originali? Le modifiche alle schede andranno perse (lo storico resta).")) { resetPrograms(); toast("Schede ripristinate"); render(); }
      break;
    case "wipe":
      if (confirm("Cancellare TUTTI i dati (storico, pesi, schede)?") && confirm("Sicuro? Operazione irreversibile. Hai esportato un backup?")) {
        localStorage.removeItem("gymlog.v1"); location.hash = "#/"; location.reload();
      }
      break;
    case "new-program": {
      const p = { id: uid(), name: "Nuova scheda", subtitle: "", days: [{ id: uid(), title: "Giorno 1", items: [] }] };
      st.programs.push(p); save(); go(`#/edit/${p.id}`); break;
    }
    case "dup-program": {
      const p = structuredClone(P());
      p.id = uid(); p.name += " (copia)";
      p.days.forEach((x) => { x.id = uid(); x.items.forEach((i) => (i.id = uid())); });
      st.programs.push(p); save(); go(`#/edit/${p.id}`); break;
    }
    case "del-program":
      if (confirm(`Eliminare la scheda "${P().name}"? Lo storico resta.`)) {
        st.programs = st.programs.filter((x) => x.id !== d.pid);
        if (st.activeProgramId === d.pid) st.activeProgramId = st.programs[0].id;
        save(); go("#/settings");
      }
      break;
    case "add-day": P().days.push({ id: uid(), title: `Giorno ${P().days.length + 1}`, items: [] }); save(); render(); break;
    case "del-day":
      if (confirm("Eliminare questo giorno?")) { P().days.splice(+d.di, 1); save(); render(); }
      break;
    case "add-ex": P().days[+d.di].items.push({ id: uid(), name: "Nuovo esercizio", sets: 3, reps: "8-12", rest: "90 sec", note: "", group: "" }); save(); render(); break;
    case "del-ex": P().days[+d.di].items.splice(+d.ii, 1); save(); render(); break;
    case "mv": {
      const items = P().days[+d.di].items, i = +d.ii, j = i + +d.dir;
      [items[i], items[j]] = [items[j], items[i]]; save(); render(); break;
    }
  }
});

let saveT = null;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };

app.addEventListener("input", (e) => {
  const el = e.target;
  const st = S();
  if (el.dataset.field && st.active) {
    if (el.dataset.field === "note") st.active.note = el.value;
    else {
      const s = st.active.exercises[+el.dataset.ei].sets[+el.dataset.si];
      s[el.dataset.field] = el.value;
    }
    saveSoon();
  } else if (el.dataset.logfield) {
    const s = st.sessions.find((x) => x.id === el.dataset.sid);
    s.exercises[+el.dataset.ei].sets[+el.dataset.si][el.dataset.logfield] = num(el.value);
    saveSoon();
  } else if (el.dataset.edit) {
    const p = program(el.dataset.pid);
    const f = el.dataset.edit;
    if (f === "pname") p.name = el.value;
    else if (f === "psub") p.subtitle = el.value;
    else if (f === "dtitle") p.days[+el.dataset.di].title = el.value;
    else {
      const it = p.days[+el.dataset.di].items[+el.dataset.ii];
      it[f] = f === "sets" ? parseInt(el.value) || el.value : f === "group" ? el.value.trim().toUpperCase() : el.value;
    }
    saveSoon();
  } else if (el.dataset.action === "prog-search") {
    progQuery = el.value;
    const pos = el.selectionStart;
    render();
    const s = app.querySelector(".search");
    s.focus(); s.setSelectionRange(pos, pos);
  }
});

// Invio sul campo kg -> passa alle reps; invio sulle reps -> spunta la serie
app.addEventListener("keydown", (e) => {
  const el = e.target;
  if (e.key !== "Enter" || !el.dataset.field || el.dataset.field === "note") return;
  e.preventDefault();
  if (el.dataset.field === "kg") app.querySelector(`[data-field="reps"][data-ei="${el.dataset.ei}"][data-si="${el.dataset.si}"]`)?.focus();
  else { el.blur(); const s = S().active.exercises[+el.dataset.ei].sets[+el.dataset.si]; if (!s.done) toggleSet(+el.dataset.ei, +el.dataset.si); }
});

app.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.dataset.action === "import" && el.files?.[0]) {
    try {
      const data = JSON.parse(await el.files[0].text());
      if (!confirm(`Importare il backup? Contiene ${data.sessions?.length ?? 0} sedute. I dati attuali su questo telefono verranno sostituiti.`)) return;
      replaceState(data);
      toast("Backup importato");
      go("#/history");
      render();
    } catch (err) {
      alert("Impossibile leggere il file: " + err.message);
    }
  }
  if (el.dataset.edit === "name" || el.dataset.edit === "dtitle") { save(); }
});

app.addEventListener("submit", (e) => {
  const f = e.target;
  if (f.dataset.form !== "weight") return;
  e.preventDefault();
  const kg = num(f.kg.value);
  if (kg == null || kg < 20 || kg > 300) { toast("Peso non valido"); return; }
  const st = S();
  st.bodyweight = st.bodyweight.filter((x) => x.date !== f.date.value);
  st.bodyweight.push({ date: f.date.value, kg });
  save();
  toast("Peso salvato");
  render();
});

/* ------------------------------------------------------------------ ICONS */

const sv = (p, extra = "") => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${p}</svg>`;
const ICON = {
  back: sv('<path d="M15 5l-7 7 7 7"/>'),
  chev: sv('<path d="M9 5l7 7-7 7"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  edit: sv('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  play: sv('<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>'),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  loop: sv('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  trophy: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
};

/* ------------------------------------------------------------------ boot */

render();
keepAwake();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
