/**
 * إعداد مركزي لمعرفات Google AdMob.
 *
 * لا توجد أي معرفات إنتاجية هنا. ضع معرفاتك الحقيقية عبر متغيرات البيئة:
 *   VITE_ADMOB_APP_ID_ANDROID   (مثال: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)
 *   VITE_ADMOB_BANNER_ANDROID
 *   VITE_ADMOB_INTERSTITIAL_ANDROID
 *   VITE_ADMOB_REWARDED_ANDROID
 *
 * وفي Android: android/local.properties أو gradle.properties → admobAppId=...
 * (يُحقن في AndroidManifest عبر manifestPlaceholders).
 */

/** معرفات اختبار رسمية من Google — للتطوير فقط. */
export const ADMOB_TEST_IDS = {
  appId: "ca-app-pub-3940256099942544~3347511713",
  banner: "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
} as const;

const env = import.meta.env as Record<string, string | undefined>;

function pick(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v || v.startsWith("REPLACE_ME")) return null;
  return v;
}

export interface AdsConfig {
  /** هل تم ضبط معرفات إنتاجية حقيقية؟ */
  configured: boolean;
  /** استخدام معرفات الاختبار (عند غياب المعرفات الحقيقية أو في وضع التطوير). */
  testMode: boolean;
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
  /** تفعيل عرض الإعلانات كلياً. */
  enabled: boolean;
}

const realBanner = pick(env["VITE_ADMOB_BANNER_ANDROID"]);
const realAppId = pick(env["VITE_ADMOB_APP_ID_ANDROID"]);
const configured = Boolean(realBanner && realAppId);
const testMode = !configured || !import.meta.env.PROD;

export const adsConfig: AdsConfig = {
  configured,
  testMode,
  appId: (testMode ? null : realAppId) ?? ADMOB_TEST_IDS.appId,
  bannerId: (testMode ? null : realBanner) ?? ADMOB_TEST_IDS.banner,
  interstitialId:
    (testMode ? null : pick(env["VITE_ADMOB_INTERSTITIAL_ANDROID"])) ??
    ADMOB_TEST_IDS.interstitial,
  rewardedId:
    (testMode ? null : pick(env["VITE_ADMOB_REWARDED_ANDROID"])) ?? ADMOB_TEST_IDS.rewarded,
  enabled: pick(env["VITE_ADS_ENABLED"]) !== "false",
};

/** ارتفاع محجوز لمساحة البانر (Adaptive banner ≈ 50–60dp) لتفادي Layout Shift. */
export const BANNER_RESERVED_HEIGHT = 60;
