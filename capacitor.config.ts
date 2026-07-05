import type { CapacitorConfig } from "@capacitor/cli";

/**
 * إعدادات Capacitor — وضع Offline كامل (المرحلة 4).
 *
 * التطبيق يُبنى كـ SPA static داخل `dist/public` عبر TanStack Start
 * (prerender)، ثم Capacitor يعبّئ الملفات داخل APK.
 * - لا حاجة للإنترنت لتشغيل التطبيق.
 * - Web NFC (NDEFReader) يعمل داخل WebView على Android 10+ مع تحديث System WebView.
 * - يمكن تفعيل Native NFC عبر @capawesome-team/capacitor-nfc (اختياري).
 *
 * لو أردت إعادة الوضع الأونلاين (تحميل من Lovable مباشرة)، أعد سطر:
 *   server: { url: "https://tap-and-write-app.lovable.app", androidScheme: "https" }
 */
const config: CapacitorConfig = {
  appId: "app.lovable.nfctools",
  appName: "NFC Tools",
  webDir: "dist/public",
  android: {
    allowMixedContent: false,
  },
};

export default config;
