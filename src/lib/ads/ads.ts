/**
 * طبقة موحّدة للتعامل مع Google Mobile Ads (AdMob) عبر Capacitor.
 *
 * - التهيئة تحدث مرة واحدة فقط (singleton).
 * - تعمل فقط على المنصة الأصلية (Android). على الويب تُتجاهل بصمت.
 * - أي فشل في AdMob لا يؤثر إطلاقاً على وظائف NFC أو تشغيل التطبيق.
 * - جاهزة للتوسع: Banner الآن، وInterstitial / Rewarded لاحقاً.
 */
import { adsConfig } from "./config";

type AdMobModule = typeof import("@capacitor-community/admob");

let initPromise: Promise<AdMobModule | null> | null = null;
let bannerShown = false;

export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return !!w.Capacitor?.isNativePlatform?.();
}

export function adsAvailable(): boolean {
  return adsConfig.enabled && isNativePlatform();
}

/** تهيئة SDK مرة واحدة + تجهيز الموافقة (Consent) قبل عرض أي إعلان. */
export function initAds(): Promise<AdMobModule | null> {
  if (!adsAvailable()) return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const mod = await import("@capacitor-community/admob");
      await mod.AdMob.initialize({ initializeForTesting: adsConfig.testMode });
      await prepareConsent(mod);
      return mod;
    } catch (err) {
      console.warn("AdMob init failed (ignored)", err);
      return null;
    }
  })();

  return initPromise;
}

/**
 * تجهيز الموافقة الإعلانية (UMP).
 * يطلب معلومات الموافقة، ويعرض نموذج الموافقة عند الحاجة (مثل المستخدمين داخل الاتحاد الأوروبي).
 * عند عدم الموافقة على التخصيص يتم عرض إعلانات غير مخصّصة تلقائياً من الـ SDK.
 */
async function prepareConsent(mod: AdMobModule): Promise<void> {
  try {
    const info = await mod.AdMob.requestConsentInfo({
      debugGeography: adsConfig.testMode
        ? mod.AdmobConsentDebugGeography.DISABLED
        : mod.AdmobConsentDebugGeography.DISABLED,
      testDeviceIdentifiers: [],
    });
    if (info.isConsentFormAvailable && info.status === mod.AdmobConsentStatus.REQUIRED) {
      await mod.AdMob.showConsentForm();
    }
  } catch (err) {
    console.warn("AdMob consent flow skipped", err);
  }
}

/** هل وافق المستخدم على الإعلانات المخصّصة؟ (يُستخدم مستقبلاً للإعدادات) */
export async function consentStatus(): Promise<string | null> {
  const mod = await initAds();
  if (!mod) return null;
  try {
    const info = await mod.AdMob.requestConsentInfo();
    return String(info.status);
  } catch {
    return null;
  }
}

export async function showBanner(): Promise<void> {
  const mod = await initAds();
  if (!mod || bannerShown) return;
  try {
    await mod.AdMob.showBanner({
      adId: adsConfig.bannerId,
      adSize: mod.BannerAdSize.ADAPTIVE_BANNER,
      position: mod.BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: adsConfig.testMode,
    });
    bannerShown = true;
  } catch (err) {
    // فشل تحميل الإعلان لا يُعرض للمستخدم ولا يكسر التطبيق.
    console.warn("Banner load failed (ignored)", err);
  }
}

export async function hideBanner(): Promise<void> {
  if (!bannerShown) return;
  try {
    const mod = await initAds();
    await mod?.AdMob.hideBanner();
  } catch {
    /* ignore */
  } finally {
    bannerShown = false;
  }
}
