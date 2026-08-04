import type { CapacitorConfig } from "@capacitor/cli";

/**
 * إعدادات Capacitor — وضع Offline كامل.
 *
 * التطبيق يُحزم من ملفات الواجهة المبنية محلياً (dist/client) داخل APK،
 * ولا يعتمد على أي رابط خارجي عند التشغيل. نسخة الويب المنشورة تبقى تعمل كما هي.
 */
const config: CapacitorConfig = {
  appId: "com.ahmedmadni.nfcpro",
  appName: "NFC PRO",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
};

export default config;
