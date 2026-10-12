export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const exKey = (name) =>
  String(name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9°]+/g, " ").trim();

// "150 sec" -> 150, "2 min" -> 120, "1:30" -> 90, "0" -> 0
export function parseRest(txt) {
  if (txt == null) return 0;
  const s = String(txt).toLowerCase().replace(",", ".");
  let m = s.match(/(\d+):(\d{2})/);
  if (m) return +m[1] * 60 + +m[2];
  m = s.match(/(\d+(?:\.\d+)?)\s*min/);
  if (m) return Math.round(parseFloat(m[1]) * 60);
  m = s.match(/(\d+)/);
  return m ? +m[1] : 0;
}

export const fmtSec = (s) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const num = (v) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const fmtKg = (n) => (n == null ? "–" : (Math.round(n * 100) / 100).toLocaleString("it-IT"));

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const GIORNI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
export const fmtDate = (iso, withDay = false) => {
  const d = new Date(iso);
  const base = `${d.getDate()} ${MESI[d.getMonth()]}`;
  const y = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : "";
  return (withDay ? GIORNI[d.getDay()] + " " : "") + base + y;
};
export const fmtMonth = (iso) => {
  const d = new Date(iso);
  const m = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"][d.getMonth()];
  return `${m} ${d.getFullYear()}`;
};
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const fmtDuration = (ms) => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m} min`;
};

// Stima 1RM (Epley). Valida solo come indicatore di tendenza.
export const e1rm = (kg, reps) => (kg && reps ? (reps === 1 ? kg : kg * (1 + reps / 30)) : 0);

export const daysAgo = (iso) => {
  const a = new Date(iso); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  const d = Math.round((b - a) / 86400000);
  return d === 0 ? "oggi" : d === 1 ? "ieri" : `${d} giorni fa`;
};
