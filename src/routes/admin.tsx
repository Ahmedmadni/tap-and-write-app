import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PRICING } from "@/lib/premium/gate";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — NFC PRO" },
      { name: "description", content: "متابعة المشتركين وإدارة اشتراكات بريميوم في NFC PRO." },
      { property: "og:title", content: "لوحة التحكم — NFC PRO" },
      { property: "og:description", content: "متابعة المشتركين وإدارة اشتراكات بريميوم." },
    ],
  }),
  component: AdminPage,
});

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}
interface SubRow {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  amount_usd: number | null;
  provider: string | null;
}

function planEnd(plan: "monthly" | "yearly"): string {
  const d = new Date();
  if (plan === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function AdminPage() {
  const navigate = useNavigate();
  const { loading, user, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth" });
    else if (!isAdmin) void navigate({ to: "/account" });
  }, [loading, user, isAdmin, navigate]);

  const load = useCallback(async () => {
    setBusy(true);
    const [p, s] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,created_at").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id,plan,status,current_period_end,amount_usd,provider"),
    ]);
    setProfiles((p.data as ProfileRow[]) ?? []);
    setSubs((s.data as SubRow[]) ?? []);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const subByUser = useMemo(() => new Map(subs.map((s) => [s.user_id, s])), [subs]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return profiles.filter((p) => !needle || (p.email ?? "").toLowerCase().includes(needle));
  }, [profiles, q]);

  const activeCount = subs.filter(
    (s) => s.status === "active" && (!s.current_period_end || new Date(s.current_period_end) > new Date()),
  ).length;
  const revenue = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.amount_usd ?? (s.plan === "yearly" ? 10 : 2)), 0);

  async function activate(userId: string, plan: "monthly" | "yearly") {
    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan,
        status: "active",
        current_period_end: planEnd(plan),
        amount_usd: PRICING[plan].price,
        provider: "manual",
      },
      { onConflict: "user_id" },
    );
    await load();
  }

  async function deactivate(userId: string) {
    await supabase.from("subscriptions").update({ status: "canceled" }).eq("user_id", userId);
    await load();
  }

  if (!isAdmin) return null;

  return (
    <AppShell title="لوحة التحكم" icon={ShieldCheck} adsDisabled>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "المستخدمون", value: profiles.length },
            { label: "المشتركون", value: activeCount },
            { label: "الإيراد ($)", value: revenue },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border/60 bg-card p-3 text-center">
              <p className="text-lg font-bold text-primary">{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالبريد"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <button
            onClick={() => void load()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
            aria-label="تحديث"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="space-y-2">
          {rows.map((p) => {
            const s = subByUser.get(p.id);
            const active = s?.status === "active" && (!s.current_period_end || new Date(s.current_period_end) > new Date());
            return (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p dir="ltr" className="truncate text-sm font-medium">
                    {p.email ?? p.id.slice(0, 8)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                      active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {active ? "مشترك" : "غير مشترك"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s
                    ? `${s.plan === "yearly" ? "سنوي" : "شهري"} · ${s.status}${
                        s.current_period_end ? ` · حتى ${new Date(s.current_period_end).toLocaleDateString("ar")}` : ""
                      }`
                    : "لا يوجد اشتراك"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => void activate(p.id, "monthly")}
                    className="flex-1 rounded-lg bg-secondary py-1.5 text-xs hover:bg-secondary/70"
                  >
                    تفعيل شهري
                  </button>
                  <button
                    onClick={() => void activate(p.id, "yearly")}
                    className="flex-1 rounded-lg bg-secondary py-1.5 text-xs hover:bg-secondary/70"
                  >
                    تفعيل سنوي
                  </button>
                  <button
                    onClick={() => void deactivate(p.id)}
                    className="flex-1 rounded-lg bg-destructive/10 py-1.5 text-xs text-destructive"
                  >
                    إيقاف
                  </button>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون بعد.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
