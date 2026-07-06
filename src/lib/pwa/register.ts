/**
 * تسجيل Service Worker المُخصّص (public/sw.js) لدعم التشغيل Offline.
 *
 * يعمل فقط في:
 *  - بناء الإنتاج (import.meta.env.PROD).
 *  - خارج الـ iframe (أي ليس داخل معاينة Lovable المدمجة).
 *  - خارج نطاقات معاينة Lovable (id-preview--…, preview--…, lovableproject*, beta.lovable.dev).
 *  - عندما لا يكون ?sw=off موجوداً في الرابط (Kill-switch).
 *
 * داخل Capacitor WebView، السكيمة تكون https://localhost وهذه تسمح بتسجيل Service Worker،
 * ما يوفر تشغيلاً Offline حقيقياً للـ APK بعد أول فتح.
 */

const SW_URL = "/sw.js";

function shouldRegister(): boolean {
  if (!import.meta.env.PROD) return false;
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return false;

  const host = window.location.hostname;
  const blocked =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");

  return !blocked;
}

async function unregisterMatching(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url =
            r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export function registerPwa(): void {
  if (typeof window === "undefined") return;

  if (!shouldRegister()) {
    void unregisterMatching();
    return;
  }

  const register = () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((reg) => {
        // فحص تحديث دوري بسيط
        setInterval(() => reg.update().catch(() => undefined), 60 * 60 * 1000);
      })
      .catch((err) => console.warn("SW registration failed", err));
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
