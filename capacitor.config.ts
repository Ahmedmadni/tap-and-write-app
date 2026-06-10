import type { CapacitorConfig } from "@capacitor/cli";

/**
 * إعدادات Capacitor لتحويل التطبيق إلى APK عبر Android Studio.
 *
 * نستخدم وضع server.url ليفتح التطبيق المنشور على Lovable مباشرة داخل
 * WebView. هذا ضروري لأن Web NFC (NDEFReader) يحتاج Chrome على Android،
 * و WebView القياسي يدعمه أيضاً ابتداءً من Android 10+ (API 29) عندما
 * يكون System WebView محدّثاً ومبنياً على Chromium 89+.
 *
 * إذا أردت لاحقاً بناء التطبيق بالكامل offline، استبدل server.url
 * بـ webDir يحتوي مخرجات بناء ثابتة (SPA static export).
 */
const config: CapacitorConfig = {
  appId: "app.lovable.nfctools",
  appName: "NFC Tools",
  webDir: "dist/public",
  server: {
    url: "https://tap-and-write-app.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
