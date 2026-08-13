/** قواعد الخطة المجانية مقابل البريميوم. */

/** أقصى عدد عمليات محفوظة في السجل للمستخدم المجاني. */
export const FREE_HISTORY_LIMIT = 20;

/** صيغ NDEF المتقدمة المتاحة للمشتركين فقط. */
export const PREMIUM_KINDS = ["wifi", "vcard", "mime", "external", "app"] as const;

export type PremiumKind = (typeof PREMIUM_KINDS)[number];

export function isPremiumKind(kind: string): boolean {
  return (PREMIUM_KINDS as readonly string[]).includes(kind);
}

export const PRICING = {
  monthly: { label: "شهري", price: 2, suffix: "دولار / شهر" },
  yearly: { label: "سنوي", price: 10, suffix: "دولار / سنة" },
} as const;

export const PREMIUM_FEATURES = [
  "تجربة بلا إعلانات نهائياً",
  "سجل غير محدود مع التصدير والاستيراد",
  "الكتابة الدفعية وقوالب محفوظة",
  "قفل البطاقة (للقراءة فقط)",
  "الصيغ المتقدمة: WiFi و vCard و MIME و التطبيقات والأنواع الخارجية",
] as const;
