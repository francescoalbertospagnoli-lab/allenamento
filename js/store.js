import { DEFAULT_PROGRAMS } from "./data.js";
import { uid } from "./util.js";

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
