// Service worker: guarda la app en el teléfono para que abra aunque no haya señal.
// Sólo toca archivos de este sitio; las llamadas a Apps Script (script.google.com) nunca pasan
// por aquí, así que los datos jamás salen de una copia vieja.
const CACHE_NAME = "bitacora-app-v4";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon.png"];

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

// Red primero (para recibir actualizaciones); si no hay señal o tarda más de 4 s
// (datos débiles), se usa la copia guardada.
function redOCopia(request, copiaKey) {
  return new Promise(function (resolve) {
    var listo = false;
    function copia(sinRed) {
      if (listo) return;
      caches.match(copiaKey || request, { ignoreSearch: true }).then(function (r) {
        if (listo) return;
        if (r) { listo = true; resolve(r); }
        else if (sinRed) { listo = true; resolve(Response.error()); }
      });
    }
    var t = setTimeout(copia, 4000);
    fetch(request)
      .then(function (r) {
        clearTimeout(t);
        if (!listo) { listo = true; resolve(r); }
        if (r.ok) {
          var c = r.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(copiaKey || request, c); });
        }
      })
      .catch(function () { clearTimeout(t); copia(true); });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(redOCopia(req, req.mode === "navigate" ? "./index.html" : null));
});
