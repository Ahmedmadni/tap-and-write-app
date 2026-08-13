import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { UserCircle, Crown, LogOut, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي — NFC PRO" },
      { name: "description", content: "حالة الاشتراك وإدارة الحساب في NFC PRO." },
      { property: "og:title", content: "حسابي — NFC PRO" },
      { property: "og:description", content: "حالة الاشتراك وإدارة الحساب في NFC PRO." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { loading, user, isAdmin, isPremium, subscription, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  return (
    <AppShell title="حسابي" icon={UserCircle} adsDisabled>
      <div className="space-y-3">
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
          <p dir="ltr" className="mt-1 text-sm font-medium">
            {user?.email ?? "—"}
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-primary" /> حالة الاشتراك
          </div>
          <p className="text-sm text-muted-foreground">
            {isPremium ? "بريميوم فعّال — التطبيق يعمل بلا إعلانات." : "الخطة المجانية — الإعلانات مفعّلة."}
          </p>
          {subscription && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>الخطة: {subscription.plan === "yearly" ? "سنوي" : "شهري"}</li>
              <li>الحالة: {subscription.status}</li>
              {subscription.current_period_end && (
                <li>ينتهي في: {new Date(subscription.current_period_end).toLocaleDateString("ar")}</li>
              )}
            </ul>
          )}
          {!isPremium && (
            <Link
              to="/premium"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Crown className="h-4 w-4" /> ترقية إلى بريميوم
            </Link>
          )}
        </section>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 py-3 text-sm font-medium text-primary"
          >
            <ShieldCheck className="h-4 w-4" /> لوحة تحكم الأدمن
          </Link>
        )}

        <button
          onClick={async () => {
            await signOut();
            void navigate({ to: "/" });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3 text-sm font-medium text-destructive hover:bg-destructive/20"
        >
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </button>
      </div>
    </AppShell>
  );
}
