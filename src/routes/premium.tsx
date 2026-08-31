import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Crown, Check, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PRICING, PREMIUM_FEATURES } from "@/lib/premium/gate";
import {
  isPlayBillingAvailable,
  loadPlayOffers,
  purchasePlan,
  restorePurchases,
  setPurchaseVerifier,
  manageSubscriptionUrl,
  type PlayOfferInfo,
} from "@/lib/billing/play";
import { verifyPlayPurchase, syncPlaySubscription } from "@/lib/billing/billing.functions";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "بريميوم — NFC PRO بلا إعلانات" },
      {
        name: "description",
        content: "اشترك في بريميوم NFC PRO بـ 2 دولار شهرياً أو 10 دولار سنوياً: بلا إعلانات وكل الخصائص المتقدمة.",
      },
      { property: "og:title", content: "بريميوم — NFC PRO بلا إعلانات" },
      {
        property: "og:description",
        content: "بلا إعلانات، سجل غير محدود، كتابة دفعية، قفل البطاقة والصيغ المتقدمة.",
      },
    ],
  }),
  component: PremiumPage,
});

function PremiumPage() {
  const { user, isPremium, refresh } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offers, setOffers] = useState<PlayOfferInfo[]>([]);
  const native = isPlayBillingAvailable();

  // تسجيل دالة التحقق من الخادم: لا يُفعّل البريميوم إلا بعد تأكيد Google.
  useEffect(() => {
    if (!native) return;
    setPurchaseVerifier(async (payload) => {
      const res = await verifyPlayPurchase({ data: payload });
      await refresh();
      setMsg(res.active ? "تم تفعيل البريميوم — شكراً لدعمك." : "لم يتم تأكيد الاشتراك بعد.");
      return true;
    });
    loadPlayOffers()
      .then(setOffers)
      .catch(() => setOffers([]));
  }, [native, refresh]);

  const buy = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    try {
      await purchasePlan(plan);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "تعذّر إتمام الشراء");
    } finally {
      setBusy(false);
    }
  }, [plan]);

  const restore = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      await restorePurchases();
      await syncPlaySubscription({ data: undefined });
      await refresh();
      setMsg("تم تحديث حالة الاشتراك.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "تعذّر استعادة المشتريات");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const priceFor = (key: "monthly" | "yearly") =>
    offers.find((o) => o.plan === key)?.priceText ?? `$${PRICING[key].price}`;

  return (
    <AppShell title="بريميوم" icon={Crown} adsDisabled>
      <div className="space-y-4">
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">افتح كل الخصائص وأزل الإعلانات</p>
          <ul className="mt-3 space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-2 gap-3">
          {(["yearly", "monthly"] as const).map((key) => {
            const p = PRICING[key];
            const active = plan === key;
            return (
              <button
                key={key}
                onClick={() => setPlan(key)}
                className={`rounded-2xl border p-4 text-right transition ${
                  active ? "border-primary bg-primary/10" : "border-border/60 bg-card"
                }`}
              >
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{priceFor(key)}</p>
                <p className="text-xs text-muted-foreground">{p.suffix}</p>
                {key === "yearly" && <p className="mt-1 text-[11px] text-primary">الأوفر — يعادل 0.83$ شهرياً</p>}
              </button>
            );
          })}
        </div>

        {isPremium ? (
          <div className="space-y-3">
            <p className="rounded-2xl border border-border/60 bg-card p-4 text-center text-sm text-muted-foreground">
              اشتراكك فعّال بالفعل — شكراً لدعمك.
            </p>
            {native && (
              <a
                href={manageSubscriptionUrl()}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-2xl border border-border/60 bg-card py-3 text-center text-sm font-semibold"
              >
                إدارة الاشتراك في Google Play
              </a>
            )}
          </div>
        ) : user ? (
          native ? (
            <div className="space-y-3">
              <button
                onClick={buy}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                اشترك عبر Google Play — {PRICING[plan].label} ({priceFor(plan)})
              </button>
              <button
                onClick={restore}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card py-3 text-sm font-semibold disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                استعادة المشتريات
              </button>
            </div>
          ) : (
            <p className="rounded-2xl border border-border/60 bg-card p-4 text-center text-sm text-muted-foreground">
              الاشتراك متاح داخل تطبيق Android عبر Google Play. ثبّت التطبيق من Google Play ثم سجّل الدخول بنفس
              الحساب لتفعيل البريميوم.
            </p>
          )
        ) : (
          <Link
            to="/auth"
            className="block w-full rounded-2xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground"
          >
            سجّل الدخول للاشتراك
          </Link>
        )}

        {msg && <p className="text-center text-xs text-muted-foreground">{msg}</p>}

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          جميع المدفوعات داخل التطبيق تتم عبر Google Play Billing. يمكن إلغاء الاشتراك في أي وقت من إعدادات
          Google Play، ويستمر البريميوم حتى نهاية الفترة المدفوعة.
        </p>
      </div>
    </AppShell>
  );
}
