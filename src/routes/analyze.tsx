import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { analyzeNfcData } from "@/lib/ai/analyze.functions";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "تحليل بيانات NFC بالذكاء الاصطناعي — NFC PRO" },
      { name: "description", content: "اشرح محتوى بطاقة NFC واكتشف البيانات الحساسة والمخاطر المحتملة." },
      { property: "og:title", content: "تحليل بيانات NFC بالذكاء الاصطناعي" },
      { property: "og:description", content: "شرح محتوى البطاقة واكتشاف المخاطر تلقائياً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const analyze = useServerFn(analyzeNfcData);
  const [content, setContent] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!content.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await analyze({ data: { content } });
      if (r.ok) setResult(r.text);
      else setError(r.error);
    } catch {
      setError("تعذر الاتصال بخدمة التحليل.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="تحليل ذكي" icon={Sparkles}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          الصق البيانات المقروءة من البطاقة (نص، رابط، WiFi، vCard…) وسيشرح الذكاء الاصطناعي محتواها ويكشف أي بيانات حساسة أو مخاطر.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 8000))}
          rows={7}
          placeholder="مثال: https://bit.ly/xyz أو WIFI:S:Home;T:WPA;P:12345678;;"
          className="w-full rounded-2xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          dir="auto"
        />
        <div className="text-xs text-muted-foreground">{content.length}/8000</div>
        <button
          onClick={run}
          disabled={busy || !content.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
          {busy ? "جارٍ التحليل…" : "حلّل البيانات"}
        </button>
        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        {result && (
          <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-4 text-sm leading-7 text-card-foreground" dir="auto">
            {result.replace(/\*\*/g, "")}
          </div>
        )}
      </div>
    </AppShell>
  );
}
