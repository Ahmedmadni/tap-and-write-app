/* Service Worker — NFC Tools
 * وضع Offline SPA للتطبيق داخل Capacitor WebView وعلى الويب المنشور.
 *
 * الاستراتيجية:
 *  - install: تخزين أصول الـ App Shell (الرئيسية + الأيقونات + المنيفست).
 *  - fetch (navigate): NetworkFirst مع مهلة قصيرة، وسقوط إلى الكاش ثم إلى "/".
 *  - fetch (assets same-origin): CacheFirst، وتحديث الكاش من الشبكة عند النجاح.
 *  - activate: تنظيف الكاش القديم + claim للعملاء.
 *
 * ملاحظة: يتم تسجيله فقط من src/lib/pwa/register.ts خارج معاينة Lovable.
 */

const VERSION = "v1";
const APP_CACHE = `nfc-tools-app-${VERSION}`;
const ASSET_CACHE = `nfc-tools-assets-${VERSION}`;

const APP_SHELL = [
  "/",
  "/read",
  "/write",
  "/erase",
  "/lock",
  "/history",
  "/settings",
  "/test",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== APP_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isAsset(url) {
  return /\.(?:js|css|woff2?|png|svg|jpg|jpeg|webp|ico|json)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/~oauth")) return;

  // HTML navigations → NetworkFirst
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(APP_CACHE);
          cache.put(req, net.clone()).catch(() => undefined);
          return net;
        } catch {
          const cache = await caches.open(APP_CACHE);
          return (
            (await cache.match(req)) ||
            (await cache.match("/")) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
    return;
  }

  // Same-origin assets → CacheFirst with background update
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(req);
        if (cached) {
          fetch(req)
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone()).catch(() => undefined);
            })
            .catch(() => undefined);
          return cached;
        }
        try {
          const net = await fetch(req);
          if (net && net.ok) cache.put(req, net.clone()).catch(() => undefined);
          return net;
        } catch {
          return new Response("", { status: 504 });
        }
      })(),
    );
  }
});
