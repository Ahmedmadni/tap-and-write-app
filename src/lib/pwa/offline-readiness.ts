/**
 * التحقق من جاهزية التطبيق للعمل Offline قبل الاعتماد على الكاش.
 *
 * يفحص:
 *  - دعم Service Worker + Cache Storage.
 *  - وجود تسجيل نشط (active) يتحكم بالصفحة.
 *  - وجود كل روابط App Shell الأساسية داخل أي كاش.
 *
 * يُستخدم في صفحة /cache-status لعرض بطاقة "جاهز للعمل بدون اتصال" ومنع
 * المستخدم من الاعتماد على الوضع Offline قبل أول تحميل كامل عبر الشبكة.
 */

/** يجب أن يظل متطابقاً مع APP_SHELL في public/sw.js. */
export const REQUIRED_APP_SHELL: readonly string[] = [
  "/",
  "/read",
  "/write",
  "/erase",
  "/lock",
  "/history",
  "/settings",
  "/test",
  "/manifest.webmanifest",
] as const;

export interface OfflineReadiness {
  ready: boolean;
  swSupported: boolean;
  cachesSupported: boolean;
  controllerActive: boolean;
  registrationActive: boolean;
  cachedPaths: string[];
  missingPaths: string[];
  reason: string | null;
}

async function isCached(path: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const url = new URL(path, window.location.origin).toString();
    const hit = await caches.match(url, { ignoreSearch: true, ignoreVary: true });
    if (hit) return true;
    // Fallback: fetch match ignoring trailing slash differences.
    const alt =
      path.endsWith("/") && path !== "/"
        ? path.slice(0, -1)
        : path === "/"
          ? "/index.html"
          : null;
    if (alt) {
      const altUrl = new URL(alt, window.location.origin).toString();
      const altHit = await caches.match(altUrl, { ignoreSearch: true, ignoreVary: true });
      if (altHit) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function checkOfflineReadiness(): Promise<OfflineReadiness> {
  const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const cachesSupported = typeof caches !== "undefined";

  let registrationActive = false;
  let controllerActive = false;

  if (swSupported) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      registrationActive = Boolean(reg?.active);
      controllerActive = Boolean(navigator.serviceWorker.controller);
    } catch {
      /* ignore */
    }
  }

  const cachedFlags = await Promise.all(REQUIRED_APP_SHELL.map((p) => isCached(p)));
  const cachedPaths: string[] = [];
  const missingPaths: string[] = [];
  REQUIRED_APP_SHELL.forEach((p, i) => {
    (cachedFlags[i] ? cachedPaths : missingPaths).push(p);
  });

  let reason: string | null = null;
  if (!swSupported) reason = "المتصفح لا يدعم Service Worker.";
  else if (!cachesSupported) reason = "المتصفح لا يدعم Cache Storage.";
  else if (!registrationActive) reason = "لم يتم تفعيل Service Worker بعد. أعد تحميل الصفحة مرة عبر الشبكة.";
  else if (!controllerActive)
    reason = "Service Worker مسجّل لكن لا يتحكم بهذه الصفحة بعد. أعد تحميلها مرة واحدة.";
  else if (missingPaths.length > 0)
    reason = `لم يتم تخزين ${missingPaths.length} صفحة/ملف من App Shell بعد.`;

  const ready =
    swSupported &&
    cachesSupported &&
    registrationActive &&
    controllerActive &&
    missingPaths.length === 0;

  return {
    ready,
    swSupported,
    cachesSupported,
    controllerActive,
    registrationActive,
    cachedPaths,
    missingPaths,
    reason,
  };
}
