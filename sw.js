// Service worker mínimo: solo existe para que el navegador ofrezca "instalar" la app.
// Guarda el cascarón del lanzador; la bitácora (Apps Script) nunca pasa por aquí.
const CACHE_NAME = "bitacora-shell-v2";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Red primero; si no hay señal o tarda más de 4 s (datos débiles), se usa la copia guardada
self.addEventListener("fetch", function (event) {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    new Promise(function (resolve) {
      var listo = false;
      function copia(sinRed) {
        if (listo) return;
        caches.match("./index.html").then(function (r) {
          if (listo) return;
          if (r) { listo = true; resolve(r); }
          else if (sinRed) { listo = true; resolve(Response.error()); }
        });
      }
      var t = setTimeout(copia, 4000);
      fetch(event.request)
        .then(function (r) {
          clearTimeout(t);
          if (!listo) { listo = true; resolve(r); }
          if (r.ok) { var c = r.clone(); caches.open(CACHE_NAME).then(function (cache) { cache.put("./index.html", c); }); }
        })
        .catch(function () { clearTimeout(t); copia(true); });
    })
  );
});
