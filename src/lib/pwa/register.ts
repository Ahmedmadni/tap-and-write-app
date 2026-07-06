/**
 * Guarded Service Worker registration.
 * Registers only in production, outside Lovable preview / iframes,
 * and supports ?sw=off as a kill-switch.
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
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
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

  window.addEventListener("load", () => {
    void (async () => {
      try {
        const { registerSW } = await import("virtual:pwa-register");
        registerSW({ immediate: true });
      } catch (err) {
        console.warn("PWA registration failed", err);
      }
    })();
  });
}
