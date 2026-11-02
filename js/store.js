import { DEFAULT_PROGRAMS, SEED_SESSIONS } from "./data.js";
import { uid, exKey } from "./util.js";

const KEY = "gymlog.v1";

function withIds(programs) {
  return programs.map((p) => ({
    ...p,
    days: p.days.map((d) => ({ id: d.id || uid(), ...d, items: d.items.map((it) => ({ id: it.id || uid(), ...it })) })),
  }));
}

function fresh() {
  return {
    version: 1,
    programs: withIds(structuredClone(DEFAULT_PROGRAMS)),
    activeProgramId: "p4",
    sessions: [], // allenamenti completati
    bodyweight: [], // { date: "YYYY-MM-DD", kg }
    active: null, // allenamento in corso
    createdAt: new Date().toISOString(),
  };
}

let state;
try {
  state = JSON.parse(localStorage.getItem(KEY)) || fresh();
} catch {
  state = fresh();
}
if (!state.programs?.length) state.programs = withIds(structuredClone(DEFAULT_PROGRAMS));

// Migrazione 1: storico importato dall'app del coach + note tecniche aggiornate.
if (!(state.seedV >= 1)) {
  const have = new Set(state.sessions.map((x) => x.id));
  for (const sess of SEED_SESSIONS) {
    if (have.has(sess.id)) continue;
    state.sessions.push({ ...sess, exercises: sess.exercises.map((e) => ({ ...e, key: exKey(e.name) })) });
  }
  const def = DEFAULT_PROGRAMS.find((p) => p.id === "p4");
  const mine = state.programs.find((p) => p.id === "p4");
  if (def && mine) {
    const notes = new Map(def.days.flatMap((d) => d.items).map((it) => [exKey(it.name), it.note]));
    for (const d of mine.days) for (const it of d.items) {
      const n = notes.get(exKey(it.name));
      if (n && (!it.note || it.note.startsWith("Nell'app del coach") || it.note.startsWith("Myo-reps:"))) it.note = n;
    }
  }
  state.seedV = 1;
}

// Migrazione 2: peso di partenza dichiarato (84 kg al 12/10/2026).
if (!(state.seedV >= 2)) {
  if (!state.bodyweight.some((x) => x.date === "2026-10-12")) state.bodyweight.push({ date: "2026-10-12", kg: 84 });
  state.seedV = 2;
}

// Migrazione 3: il dato di 84 kg del 12/10 era una stima sbagliata (peso reale ~83).
if (!(state.seedV >= 3)) {
  state.bodyweight = state.bodyweight.filter((x) => !(x.date === "2026-10-12" && x.kg === 84));
  state.seedV = 3;
}

// Migrazione 4: misurazione Tanita del 13/10/2026.
if (!(state.seedV >= 4)) {
  if (!state.bodyweight.some((x) => x.date === "2026-10-13")) state.bodyweight.push({ date: "2026-10-13", kg: 83.05, bf: 14.9 });
  state.seedV = 4;
}

// Migrazione 5 (15/10/2026): nuova scheda 4 giorni. Prima salva una copia dei dati.
if (!(state.seedV >= 5)) {
  try { localStorage.setItem("gymlog.pre-v5", JSON.stringify(state)); } catch {}
  const def = DEFAULT_PROGRAMS.find((p) => p.id === "p4");
  const i = state.programs.findIndex((p) => p.id === "p4");
  if (def) {
    const fresh4 = withIds([structuredClone(def)])[0];
    if (i >= 0) {
      state.archivedPrograms = [...(state.archivedPrograms || []), { ...state.programs[i], archivedAt: new Date().toISOString() }];
      state.programs[i] = fresh4;
    } else state.programs.unshift(fresh4);
  }
  state.exNotes = state.exNotes || {};
  state.seedV = 5;
}

// Migrazione 6: reverse fly unico (manubri 12,5 kg) e leg extension 3 min di recupero.
if (!(state.seedV >= 6)) {
  const p4 = state.programs.find((p) => p.id === "p4");
  if (p4) for (const d of p4.days) for (const it of d.items) {
    if (it.name === "Reverse fly") { it.name = "Reverse fly con manubri"; it.kg = 12.5; }
    if (it.name === "Reverse fly con manubri") { it.kg = 12.5; if (it.note === "15 kg troppi: si riparte da 12,5 kg.") it.note = ""; }
    if (it.name === "Leg Extension" && it.group === "E" && it.rest === "2 min") it.rest = "3 min";
  }
  for (const se of state.sessions) for (const e of se.exercises) if (e.key === "reverse fly") { e.key = "reverse fly con manubri"; e.name = "Reverse fly con manubri"; }
  if (state.active) for (const e of state.active.exercises) if (e.key === "reverse fly") { e.key = "reverse fly con manubri"; e.name = "Reverse fly con manubri"; e.target.kg = 12.5; }
  if (state.exNotes?.["reverse fly"] && !state.exNotes["reverse fly con manubri"]) state.exNotes["reverse fly con manubri"] = state.exNotes["reverse fly"];
  state.seedV = 6;
}

// Migrazione 7: reverse fly alla macchina (pec deck), note su military, french press e pressa polpacci.
if (!(state.seedV >= 7)) {
  const NEW = "Reverse fly alla macchina (pec deck)", NK = exKey(NEW), OK = exKey("Reverse fly con manubri");
  const notes = { "military press con bilanciere": "Da seduto.", "french press con manubri su panca piana": "Panca orizzontale.", "pressa per polpacci": "In piedi alla hack squat machine." };
  const p4 = state.programs.find((p) => p.id === "p4");
  if (p4) for (const d of p4.days) for (const it of d.items) {
    if (exKey(it.name) === OK) { it.name = NEW; it.note = "Stessa macchina del pectoral fly, seduto al contrario."; }
    const n = notes[exKey(it.name)];
    if (n && !it.note) it.note = n;
  }
  for (const se of state.sessions) for (const e of se.exercises) if (e.key === OK) { e.key = NK; e.name = NEW; }
  if (state.active) for (const e of state.active.exercises) if (e.key === OK) { e.key = NK; e.name = NEW; }
  if (state.exNotes?.[OK]) { state.exNotes[NK] = state.exNotes[NK] || state.exNotes[OK]; delete state.exNotes[OK]; }
  state.seedV = 7;
}

// Migrazione 8 (18/10/2026): recuperi Giorno 4.
if (!(state.seedV >= 8)) {
  const d4 = state.programs.find((p) => p.id === "p4")?.days[3];
  const R = { "leg curl in piedi": "90 sec", "panca piana con bilanciere": "3 min", "curl alternato con manubri": "2 min" };
  if (d4) for (const it of d4.items) { const r = R[exKey(it.name)]; if (r) it.rest = r; }
  if (state.active?.programId === "p4" && state.active.dayIndex === 3)
    for (const e of state.active.exercises) { const r = R[e.key]; if (r) e.target.rest = r; }
  state.seedV = 8;
}

// Migrazione 9 (26/10/2026): alzate laterali 2 min; gradino 1 iniziato il 13/10 (prova +/- del 26/10 annullata).
if (!(state.seedV >= 9)) {
  const d1 = state.programs.find((p) => p.id === "p4")?.days[0];
  if (d1) for (const it of d1.items) if (exKey(it.name) === "alzate laterali con manubri") it.rest = "2 min";
  if (state.active?.programId === "p4" && state.active.dayIndex === 0)
    for (const e of state.active.exercises) if (e.key === "alzate laterali con manubri") e.target.rest = "2 min";
  if (state.carbStep === 1 && String(state.carbStepDate || "").startsWith("2026-10-26")) state.carbStepDate = "2026-10-13T06:00:00.000Z";
  state.seedV = 9;
}

// Migrazione 10 (30/10/2026): Giorno 3 esercizio B recupero 2 min.
if (!(state.seedV >= 10)) {
  const d3 = state.programs.find((p) => p.id === "p4")?.days[2];
  if (d3) for (const it of d3.items) if (exKey(it.name) === "spinte su panca inclinata con manubri") it.rest = "2 min";
  if (state.active?.programId === "p4" && state.active.dayIndex === 2)
    for (const e of state.active.exercises) if (e.key === "spinte su panca inclinata con manubri") e.target.rest = "2 min";
  state.seedV = 10;
}

// Migrazione 11 (02/11/2026): G4 RDL al posto del leg curl e panca prima degli affondi;
// G1 spinte seduto 2 min, tirata singola al cavo al posto della french press (seduta del 2/11 corretta).
if (!(state.seedV >= 11)) {
  try { localStorage.setItem("gymlog.pre-v11", JSON.stringify(state)); } catch {}
  const NEWT = "Tirata singola al cavo per tricipiti";
  const p4 = state.programs.find((p) => p.id === "p4");
  const def4 = DEFAULT_PROGRAMS.find((p) => p.id === "p4");
  if (p4 && def4) {
    const d1 = p4.days[0];
    for (const it of d1.items) if (exKey(it.name) === "spinte in alto con manubri da seduto") it.rest = "2 min";
    const fi = d1.items.findIndex((it) => exKey(it.name) === "french press con manubri su panca piana");
    if (fi >= 0) d1.items[fi] = { id: uid(), name: NEWT, sets: 3, reps: "12-15", rest: "90 sec", note: "", group: "", kg: 5 };
    const d4 = p4.days[3];
    const byKey = (k) => d4.items.find((it) => exKey(it.name) === k);
    const lc = d4.items.findIndex((it) => exKey(it.name) === "leg curl in piedi");
    if (lc >= 0) d4.items[lc] = { id: uid(), name: "RDL con bilanciere", sets: 3, reps: "8-12", rest: "2 min", note: "", group: "", kg: 60 };
    const ia = d4.items.findIndex((it) => exKey(it.name) === "affondi con bilanciere");
    const ip = d4.items.findIndex((it) => exKey(it.name) === "panca piana con bilanciere");
    if (ia >= 0 && ip >= 0 && ia < ip) [d4.items[ia], d4.items[ip]] = [d4.items[ip], d4.items[ia]];
  }
  // Il 2/11 la french press risulta registrata con i valori della volta prima: in realtà era la tirata singola 5 kg x 15.
  const s = state.sessions.find((x) => x.id === "mvz9bnwguqyith");
  const e = s?.exercises.find((x) => x.key === "french press con manubri su panca piana");
  if (e) { e.key = exKey(NEWT); e.name = NEWT; e.sets = [{ kg: 5, reps: 15 }, { kg: 5, reps: 15 }, { kg: 5, reps: 15 }]; }
  state.seedV = 11;
}

// Migrazione 12 (02/11/2026): G2 esercizio D leg curl in piedi al posto dell'RDL.
if (!(state.seedV >= 12)) {
  const d2 = state.programs.find((p) => p.id === "p4")?.days[1];
  const i = d2 ? d2.items.findIndex((it) => exKey(it.name) === "rdl con bilanciere") : -1;
  if (i >= 0) d2.items[i] = { id: uid(), name: "Leg Curl in piedi", sets: 3, reps: "10-15", rest: "90 sec", note: "", group: "" };
  state.seedV = 12;
}

// Migrazione 13 (02/11/2026): G2 leg curl seduto al posto di quello in piedi.
if (!(state.seedV >= 13)) {
  const d2 = state.programs.find((p) => p.id === "p4")?.days[1];
  const i = d2 ? d2.items.findIndex((it) => exKey(it.name) === "leg curl in piedi") : -1;
  if (i >= 0) d2.items[i] = { id: uid(), name: "Leg Curl seduto", sets: 3, reps: "10-15", rest: "90 sec", note: "Busto leggermente in avanti per allungare di più i femorali.", group: "" };
  state.seedV = 13;
}

// Copia di sicurezza locale una volta al giorno (protegge da errori, non dalla cancellazione dei dati del browser).
try {
  const snapAt = localStorage.getItem("gymlog.snap.at");
  if (!snapAt || Date.now() - new Date(snapAt) > 86400000) {
    localStorage.setItem("gymlog.snap", JSON.stringify(state));
    localStorage.setItem("gymlog.snap.at", new Date().toISOString());
  }
} catch {}

let saveErr = null;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveErr = null;
    window.dispatchEvent(new Event("gymlog:saved"));
  } catch (e) {
    saveErr = e;
    console.error("Salvataggio fallito", e);
  }
}
export const lastSaveError = () => saveErr;
export const S = () => state;

export function replaceState(next) {
  if (!next || !Array.isArray(next.programs) || !Array.isArray(next.sessions)) throw new Error("File di backup non valido");
  state = { ...fresh(), ...next };
  save();
}

export function resetPrograms() {
  state.programs = withIds(structuredClone(DEFAULT_PROGRAMS));
  if (!state.programs.find((p) => p.id === state.activeProgramId)) state.activeProgramId = state.programs[0].id;
  save();
}

export const program = (id = state.activeProgramId) => state.programs.find((p) => p.id === id) || state.programs[0];

save();
// Chiede al browser di non cancellare i dati in automatico.
navigator.storage?.persist?.().catch(() => {});
