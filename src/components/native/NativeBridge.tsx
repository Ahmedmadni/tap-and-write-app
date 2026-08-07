/**
 * تكامل Android داخل التطبيق الأصلي (Capacitor):
 *  - تهيئة Google Mobile Ads مرة واحدة فقط (فشلها لا يؤثر على التطبيق).
 *  - زر الرجوع في Android: إغلاق الحوارات، ثم العودة للخلف، ثم الخروج من الشاشة الرئيسية فقط.
 *    ولا يُسمح بالخروج أثناء عملية NFC جارية.
 */
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { initAds, isNativePlatform } from "@/lib/ads/ads";
import { useNfcBusy } from "@/lib/nfc/busy";

export function NativeBridge() {
  const router = useRouter();
  const nfcBusy = useNfcBusy();

  useEffect(() => {
    void initAds();
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;
    let remove: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          const openDialog = document.querySelector<HTMLElement>("[data-state='open'][role='dialog']");
          if (openDialog) {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            return;
          }
          if (nfcBusy) return; // لا تخرج أثناء عملية NFC جارية
          const atHome = router.state.location.pathname === "/";
          if (!atHome) {
            if (canGoBack) router.history.back();
            else void router.navigate({ to: "/" });
            return;
          }
          void App.exitApp();
        });
        if (cancelled) void handle.remove();
        else remove = () => void handle.remove();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router, nfcBusy]);

  return null;
}
