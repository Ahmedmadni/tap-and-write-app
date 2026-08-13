import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, UserPlus, Mail, KeyRound } from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — NFC PRO" },
      { name: "description", content: "سجّل الدخول لإدارة اشتراك البريميوم في NFC PRO." },
      { property: "og:title", content: "تسجيل الدخول — NFC PRO" },
      { property: "og:description", content: "سجّل الدخول لإدارة اشتراك البريميوم في NFC PRO." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/account" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/account` },
        });
        if (error) throw error;
        setMsg("تم إنشاء الحساب. تحقق من بريدك لتأكيد التسجيل إن طُلب ذلك.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        void navigate({ to: "/account" });
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "تعذّر إتمام العملية");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsg("تعذّر تسجيل الدخول عبر Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/account" });
  }

  return (
    <AppShell title={mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"} icon={LogIn} adsDisabled>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> البريد الإلكتروني
          </span>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" /> كلمة المرور
          </span>
          <input
            type="password"
            required
            minLength={6}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {mode === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {mode === "signin" ? "دخول" : "إنشاء حساب"}
        </button>
      </form>

      <button
        onClick={google}
        className="mt-3 w-full rounded-xl border border-border bg-card py-3 text-sm font-medium hover:bg-secondary/60"
      >
        المتابعة باستخدام Google
      </button>

      {msg && <p className="mt-3 text-center text-xs text-muted-foreground">{msg}</p>}

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 w-full text-center text-xs text-primary hover:underline"
      >
        {mode === "signin" ? "ليس لديك حساب؟ أنشئ حساباً جديداً" : "لديك حساب؟ سجّل الدخول"}
      </button>
    </AppShell>
  );
}
