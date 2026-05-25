const CACHE_NAME = "nemuri-memo-v7";
const CACHE_FILES = ["./", "./index.html", "./manifest.json", "./sw.js", "./icon.png"];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CACHE_FILES.map((url) =>
          fetch(url, { cache: "reload" }).then((response) => {
            if (response.ok) return cache.put(url, response);
            return undefined;
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() =>
      caches.open(CACHE_NAME).then((cache) =>
        Promise.all(
          CACHE_FILES.map((url) =>
            fetch(url, { cache: "reload" }).then((response) => {
              if (response.ok) return cache.put(url, response);
              return undefined;
            })
          )
        )
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const isPage = request.mode === "navigate" || request.destination === "document";

  if (isPage) {
    event.respondWith(
      fetch(request, { cache: "reload" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy.clone());
            cache.put("./index.html", copy);
          });
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
      return cached || network;
    })
  );
});
