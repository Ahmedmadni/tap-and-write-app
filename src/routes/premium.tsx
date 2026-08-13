import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Check } from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PRICING, PREMIUM_FEATURES } from "@/lib/premium/gate";

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
  const { user, isPremium } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [msg, setMsg] = useState<string | null>(null);

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
                <p className="mt-1 text-2xl font-bold text-primary">${p.price}</p>
                <p className="text-xs text-muted-foreground">{p.suffix}</p>
                {key === "yearly" && <p className="mt-1 text-[11px] text-primary">الأوفر — يعادل 0.83$ شهرياً</p>}
              </button>
            );
          })}
        </div>

        {isPremium ? (
          <p className="rounded-2xl border border-border/60 bg-card p-4 text-center text-sm text-muted-foreground">
            اشتراكك فعّال بالفعل — شكراً لدعمك.
          </p>
        ) : user ? (
          <button
            onClick={() => setMsg("سيتم فتح صفحة الدفع الآمنة. إن لم تفتح، جرّب من متصفح الجهاز.")}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            اشترك الآن — {PRICING[plan].label} (${PRICING[plan].price})
          </button>
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
          الدفع يتم عبر صفحة الاشتراك على موقع التطبيق. بعد إتمام الدفع يُفعّل البريميوم على حسابك تلقائياً.
        </p>
      </div>
    </AppShell>
  );
}
