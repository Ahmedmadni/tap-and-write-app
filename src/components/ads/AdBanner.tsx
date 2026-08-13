import { useEffect } from "react";
import { adsAvailable, hideBanner, showBanner } from "@/lib/ads/ads";
import { BANNER_RESERVED_HEIGHT } from "@/lib/ads/config";
import { useNfcBusy } from "@/lib/nfc/busy";
import { useAdsEnabled } from "@/lib/auth/AuthProvider";

interface Props {
  /** إخفاء المساحة كلياً (مثلاً في شاشات العمليات الحسّاسة). */
  disabled?: boolean;
  className?: string;
}

/**
 * مساحة إعلانية موحّدة (Banner).
 *
 * - تحجز ارتفاعاً ثابتاً مسبقاً فلا يحدث Layout Shift.
 * - تختفي تلقائياً أثناء أي عملية NFC جارية.
 * - لا تعرض أي رسالة خطأ عند فشل التحميل.
 * - على الويب لا يظهر شيء (المساحة محجوزة فقط داخل التطبيق الأصلي).
 */
export function AdBanner({ disabled = false, className }: Props) {
  const nfcBusy = useNfcBusy();
  const adsEnabled = useAdsEnabled();
  const active = adsEnabled && !disabled && !nfcBusy;

  useEffect(() => {
    if (!adsAvailable()) return;
    if (active) void showBanner();
    else void hideBanner();
    return () => {
      void hideBanner();
    };
  }, [active]);

  if (!active || !adsAvailable()) return null;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ height: BANNER_RESERVED_HEIGHT }}
      data-ad-slot="banner"
    />
  );
}
