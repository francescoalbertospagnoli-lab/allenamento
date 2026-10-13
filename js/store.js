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

let saveErr = null;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveErr = null;
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
