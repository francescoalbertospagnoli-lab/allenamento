// Service worker: rende l'app utilizzabile offline.
// Aggiorna VERSION a ogni modifica dei file per forzare l'aggiornamento sui telefoni.
const VERSION = "v6";
const FILES = [
  "./", "./index.html", "./css/styles.css", "./manifest.webmanifest",
  "./js/app.js", "./js/store.js", "./js/data.js", "./js/util.js", "./js/chart.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rete prima (così prendi gli aggiornamenti), cache se sei offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
