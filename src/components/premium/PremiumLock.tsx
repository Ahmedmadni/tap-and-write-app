import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ReactNode } from "react";

interface Props {
  title: string;
  desc?: string;
  children?: ReactNode;
}

/** بطاقة ترقية تظهر بدل الميزة المدفوعة. */
export function PremiumLock({ title, desc }: Props) {
  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center"
    >
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {desc && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>}
      <Link
        to="/premium"
        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Crown className="h-4 w-4" /> ترقية إلى بريميوم
      </Link>
    </div>
  );
}

/** يعرض المحتوى للمشتركين فقط، وإلا يعرض بطاقة الترقية. */
export function PremiumGate({ title, desc, children }: Props) {
  const { isPremium } = useAuth();
  if (isPremium) return <>{children}</>;
  return <PremiumLock title={title} desc={desc} />;
}
