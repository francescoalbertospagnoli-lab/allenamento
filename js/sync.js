// Backup automatico nel cloud (Supabase). I dati viaggiano solo con il codice segreto del telefono.
import { S, save, replaceState } from "./store.js";

const URL_ = "https://njwmkxavwlpagrghmgfx.supabase.co/rest/v1/rpc/";
// Chiave pubblica (pensata per stare nel codice): da sola non dà accesso ai dati, serve anche il codice segreto.
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd21reGF2d2xwYWdyZ2htZ2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTA2NjAsImV4cCI6MjEwNzY2NjY2MH0.sN8yBKzyXVZyFkcIaEhSpBnSNXcIcHctOuhuCb4vqc8";
const META = "gymlog.sync.meta";
// Si attiva quando il database è pronto.
export const SYNC_ENABLED = false;

const rnd = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");

export function creds() {
  const st = S();
  if (!st.sync?.id || !st.sync?.secret) {
    st.sync = { id: crypto.randomUUID(), secret: rnd(28) };
    save();
  }
  return st.sync;
}
export const recoveryCode = () => { const c = creds(); return `${c.id}.${c.secret}`; };

export function meta() {
  try { return JSON.parse(localStorage.getItem(META)) || {}; } catch { return {}; }
}
function setMeta(m) {
  try { localStorage.setItem(META, JSON.stringify({ ...meta(), ...m })); } catch {}
  window.dispatchEvent(new Event("gymlog:sync"));
}

async function rpc(fn, body, keepalive = false) {
  const r = await fetch(URL_ + fn, {
    method: "POST",
    keepalive,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

let busy = false;
export async function pushNow(keepalive = false) {
  if (!SYNC_ENABLED) return;
  if (busy || !navigator.onLine) return;
  busy = true;
  try {
    const c = creds();
    const data = { ...S(), sync: undefined }; // il codice non viene salvato in chiaro nel cloud
    const json = JSON.stringify(data);
    if (json.length > 4_500_000 && keepalive) keepalive = false;
    await rpc("save_state", { p_id: c.id, p_secret: c.secret, p_data: data }, keepalive && json.length < 60000);
    setMeta({ at: new Date().toISOString(), err: null, hash: json.length + ":" + (S().sessions.length) });
  } catch (e) {
    setMeta({ err: String(e.message || e), errAt: new Date().toISOString() });
  } finally {
    busy = false;
  }
}

let t = null;
export function schedule(delay = 15000) {
  clearTimeout(t);
  t = setTimeout(() => pushNow(), delay);
}

export async function restoreFromCode(code) {
  const [id, secret] = String(code).trim().split(".");
  if (!id || !secret) throw new Error("Codice non valido");
  const res = await rpc("load_state", { p_id: id, p_secret: secret });
  const data = res.data || res;
  replaceState({ ...data, sync: { id, secret } });
  setMeta({ at: new Date().toISOString(), err: null });
  return res.updated_at;
}

// Avvio: salva a ogni modifica (dopo 15 s), quando l'app va in background e all'apertura.
export function startSync() {
  if (!SYNC_ENABLED) return;
  creds();
  window.addEventListener("gymlog:saved", () => schedule());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { clearTimeout(t); pushNow(true); } });
  window.addEventListener("online", () => schedule(2000));
  const m = meta();
  if (!m.at || Date.now() - new Date(m.at) > 3600000) schedule(3000);
}
