import type { NDEFReadingEvent } from "./types";

export type NfcSupport =
  | { status: "ok" }
  | { status: "native"; message: string }
  | { status: "ssr" }
  | { status: "iframe"; message: string }
  | { status: "insecure"; message: string }
  | { status: "unsupported"; message: string };

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return !!w.Capacitor?.isNativePlatform?.();
}

export function checkNfcSupport(): NfcSupport {
  if (typeof window === "undefined") return { status: "ssr" };

  if (isCapacitorNative()) {
    return {
      status: "native",
      message: "وضع التطبيق الأصلي — NFC عبر Capacitor.",
    };
  }

  if (window.self !== window.top) {
    return {
      status: "iframe",
      message:
        "أنت تشاهد التطبيق داخل إطار المعاينة. NFC لا يعمل هنا — افتح الرابط مباشرة على متصفح هاتفك (Chrome على Android).",
    };
  }

  if (!window.isSecureContext) {
    return {
      status: "insecure",
      message: "NFC يتطلب اتصال آمن (HTTPS).",
    };
  }

  if (!("NDEFReader" in window)) {
    return {
      status: "unsupported",
      message:
        "متصفحك لا يدعم Web NFC. استخدم Chrome أو Edge على هاتف Android، وتأكد أن خاصية NFC مفعّلة في إعدادات الجهاز.",
    };
  }

  return { status: "ok" };
}

export function friendlyError(err: unknown): string {
  if (!(err instanceof Error)) return "حدث خطأ غير متوقع.";
  const name = err.name;
  if (name === "NotAllowedError")
    return "تم رفض الإذن. الرجاء السماح للموقع باستخدام NFC.";
  if (name === "NotSupportedError")
    return "هذه البطاقة أو هذه العملية غير مدعومة على جهازك.";
  if (name === "NotReadableError")
    return "تعذّر قراءة البطاقة. تأكد من تفعيل NFC وقرّب البطاقة من الجهاز.";
  if (name === "NetworkError")
    return "تم فقد الاتصال بالبطاقة قبل اكتمال العملية.";
  if (name === "InvalidStateError")
    return "العملية قيد التنفيذ بالفعل أو في حالة غير صالحة.";
  if (name === "AbortError") return "تم إلغاء العملية.";
  return err.message || "حدث خطأ غير متوقع.";
}

// re-export للراحة
export type { NDEFReadingEvent };
