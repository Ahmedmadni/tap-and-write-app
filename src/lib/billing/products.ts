/**
 * تعريفات منتجات Google Play Billing (اشتراكات).
 * يجب إنشاء نفس المعرّفات حرفياً في Google Play Console → Monetize → Subscriptions.
 */

export const PLAY_PACKAGE_NAME = "com.ahmedmadni.nfcpro";

/** معرّف منتج الاشتراك في Google Play. */
export const PLAY_SUBSCRIPTION_ID = "nfcpro_premium";

/** معرّفات الخطط (Base plans) داخل منتج الاشتراك. */
export const PLAY_BASE_PLANS = {
  monthly: "premium-monthly",
  yearly: "premium-yearly",
} as const;

export type PlanKey = keyof typeof PLAY_BASE_PLANS;

export const PLAN_AMOUNT_USD: Record<PlanKey, number> = {
  monthly: 2,
  yearly: 10,
};

/** استنتاج الخطة من معرّف الخطة الأساسية القادم من Google Play. */
export function planFromBasePlan(basePlanId: string | null | undefined): PlanKey {
  return basePlanId === PLAY_BASE_PLANS.monthly ? "monthly" : "yearly";
}
