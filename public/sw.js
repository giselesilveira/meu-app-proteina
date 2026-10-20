/* Service worker do App Maratona 21.
 * - Arquivos estáticos (JS/CSS/fontes/ícones): cache para abrir rápido.
 * - Páginas: sempre da rede (dados pessoais NUNCA ficam em cache); sem
 *   conexão, mostra a página /offline.
 */
const VERSION = "m21-v1";
const SCOPE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const OFFLINE_URL = `${SCOPE}/offline`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith(`${SCOPE}/_next/static/`) ||
      url.pathname.startsWith(`${SCOPE}/icons/`) ||
      /\.(?:woff2|png|svg|ico)$/.test(url.pathname))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
