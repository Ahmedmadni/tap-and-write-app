import type { CapacitorConfig } from "@capacitor/cli";

/**
 * إعدادات Capacitor.
 *
 * الوضع الحالي (هجين): التطبيق يحمّل من النسخة المنشورة على Lovable عند أول فتح،
 * ثم Service Worker (public/sw.js) يخزّن الـ App Shell + الأصول ليعمل Offline لاحقاً.
 *
 * سبب استخدام server.url بدل حزم HTML محلياً: prerender في TanStack Start حالياً
 * يتعارض مع مخرجات nitro/cloudflare-module (يبحث عن dist/server/server.js بينما
 * nitro يُنتج dist/server/index.mjs). بمجرد أن يُصلَح ذلك في الأدوات، يمكن الرجوع
 * لوضع dist/public كامل offline من أول تشغيل.
 *
 * webDir يشير لمجلد فارغ إلى حين تفعيل prerender؛ Capacitor يتجاهله عندما server.url مضبوط.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.nfctools",
  appName: "NFC Tools",
  webDir: "dist/client",
  server: {
    url: "https://tap-and-write-app.lovable.app",
    androidScheme: "https",
  },
};

export default config;
