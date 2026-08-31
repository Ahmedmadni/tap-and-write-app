/**
 * طبقة Google Play Billing داخل تطبيق Android (Capacitor + cordova-plugin-purchase).
 *
 * القواعد:
 * - داخل تطبيق Android: كل عمليات الشراء تتم عبر Google Play Billing (شرط Google Play).
 * - داخل المتصفح: لا يوجد شراء داخل التطبيق، تظهر رسالة توضيحية فقط.
 * - بعد الموافقة على الشراء يُرسل purchaseToken إلى الخادم للتحقق منه لدى Google
 *   قبل تفعيل البريميوم في قاعدة البيانات.
 */
import { Capacitor } from "@capacitor/core";
import { PLAY_BASE_PLANS, PLAY_SUBSCRIPTION_ID, type PlanKey } from "./products";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function isPlayBillingAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

let storePromise: Promise<any> | null = null;
let verifyHandler: ((payload: PlayPurchasePayload) => Promise<boolean>) | null = null;

export interface PlayPurchasePayload {
  productId: string;
  purchaseToken: string;
  basePlanId?: string | null;
  orderId?: string | null;
}

function cdv(): any {
  return (globalThis as any).CdvPurchase;
}

async function getStore(): Promise<any> {
  if (!isPlayBillingAvailable()) throw new Error("Google Play Billing غير متاح على هذه المنصة");
  if (!storePromise) {
    storePromise = (async () => {
      if (!cdv()) await import("cordova-plugin-purchase");
      const CdvPurchase = cdv();
      if (!CdvPurchase) throw new Error("تعذّر تحميل إضافة الدفع");
      const { store, ProductType, Platform } = CdvPurchase;

      store.verbosity = CdvPurchase.LogLevel.WARNING;
      store.register([
        {
          id: PLAY_SUBSCRIPTION_ID,
          type: ProductType.PAID_SUBSCRIPTION,
          platform: Platform.GOOGLE_PLAY,
        },
      ]);

      store.when().approved(async (transaction: any) => {
        const ok = await runVerification(transaction);
        if (ok) transaction.finish();
      });

      store.error((err: any) => {
        console.warn("[billing]", err?.code, err?.message);
      });

      await store.initialize([Platform.GOOGLE_PLAY]);
      return store;
    })().catch((e) => {
      storePromise = null;
      throw e;
    });
  }
  return storePromise;
}

async function runVerification(transaction: any): Promise<boolean> {
  try {
    const purchaseToken: string | undefined =
      transaction?.purchaseToken ?? transaction?.nativePurchase?.purchaseToken;
    const productId: string =
      transaction?.products?.[0]?.id ?? transaction?.nativePurchase?.productId ?? PLAY_SUBSCRIPTION_ID;
    if (!purchaseToken || !verifyHandler) return false;
    return await verifyHandler({
      productId,
      purchaseToken,
      basePlanId:
        transaction?.products?.[0]?.offerId ??
        transaction?.nativePurchase?.basePlanId ??
        null,
      orderId: transaction?.transactionId ?? transaction?.nativePurchase?.orderId ?? null,
    });
  } catch (e) {
    console.warn("[billing] verify failed", e);
    return false;
  }
}

/** تسجيل دالة التحقق من الخادم (تُستدعى من واجهة البريميوم). */
export function setPurchaseVerifier(fn: (payload: PlayPurchasePayload) => Promise<boolean>) {
  verifyHandler = fn;
}

export interface PlayOfferInfo {
  plan: PlanKey;
  priceText: string | null;
  available: boolean;
}

/** جلب أسعار الخطط كما تظهر في Google Play (بعملة المستخدم). */
export async function loadPlayOffers(): Promise<PlayOfferInfo[]> {
  const store = await getStore();
  const product = store.get(PLAY_SUBSCRIPTION_ID, cdv().Platform.GOOGLE_PLAY);
  return (Object.keys(PLAY_BASE_PLANS) as PlanKey[]).map((plan) => {
    const offer = findOffer(product, plan);
    const phase = offer?.pricingPhases?.[offer.pricingPhases.length - 1];
    return { plan, priceText: phase?.price ?? null, available: Boolean(offer) };
  });
}

function findOffer(product: any, plan: PlanKey): any | null {
  if (!product) return null;
  const basePlanId = PLAY_BASE_PLANS[plan];
  const offers: any[] = product.offers ?? [];
  return (
    offers.find((o) => o.id === basePlanId || o.id?.includes(basePlanId) || o.basePlanId === basePlanId) ??
    null
  );
}

/** بدء عملية شراء اشتراك عبر Google Play. */
export async function purchasePlan(plan: PlanKey): Promise<void> {
  const store = await getStore();
  const product = store.get(PLAY_SUBSCRIPTION_ID, cdv().Platform.GOOGLE_PLAY);
  const offer = findOffer(product, plan);
  if (!offer) throw new Error("الخطة غير متاحة حالياً في Google Play");
  const result = await store.order(offer);
  if (result && result.isError) throw new Error(result.message || "تعذّر إتمام الشراء");
}

/** استعادة المشتريات السابقة (مطلوب من Google Play). */
export async function restorePurchases(): Promise<void> {
  const store = await getStore();
  await store.restorePurchases();
}

/** فتح صفحة إدارة الاشتراك في Google Play. */
export function manageSubscriptionUrl(): string {
  return `https://play.google.com/store/account/subscriptions?sku=${PLAY_SUBSCRIPTION_ID}&package=com.ahmedmadni.nfcpro`;
}
