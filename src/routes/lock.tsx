import { createFileRoute } from "@tanstack/react-router";
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { ScanOverlay } from "@/components/nfc/ScanOverlay";
import { SupportBanner } from "@/components/nfc/SupportBanner";
import { checkNfcSupport, friendlyError } from "@/lib/nfc/support";
import { makeReadOnly } from "@/lib/nfc/adapter";
import { addHistory } from "@/lib/storage/history";

export const Route = createFileRoute("/lock")({
  head: () => ({
    meta: [
      { title: "قفل بطاقة NFC" },
      { name: "description", content: "اجعل البطاقة للقراءة فقط بشكل نهائي." },
    ],
  }),
  component: LockPage,
});

function LockPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    setError(null);
    setDone(false);
    const sup = checkNfcSupport();
    if (sup.status !== "ok" && sup.status !== "native") {
      setError(sup.status === "ssr" ? "" : (sup as { message: string }).message);
      return;
    }
    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      await makeReadOnly({ signal: ctrl.signal });
      setBusy(false);
      setDone(true);
      await addHistory({ id: crypto.randomUUID(), type: "lock", timestamp: Date.now() });
    } catch (err) {
      setBusy(false);
      setError(friendlyError(err));
    }
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <AppShell title="قفل البطاقة" icon={Lock}>
      <SupportBanner />

      <div className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <p className="leading-relaxed">
          تحذير: هذه العملية <strong>نهائية ولا يمكن التراجع عنها</strong>. بعد القفل لن تستطيع الكتابة على البطاقة مجدداً أبداً.
        </p>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        أفهم أن البطاقة ستصبح للقراءة فقط بشكل دائم.
      </label>

      {error && <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
      {done && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" /> تم قفل البطاقة.
        </p>
      )}

      <button
        onClick={run}
        disabled={!confirmed}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-4 text-base font-semibold text-destructive-foreground shadow-lg shadow-destructive/30 active:scale-[0.98] disabled:opacity-50"
      >
        <Lock className="h-5 w-5" /> قفل نهائي
      </button>

      {busy && (
        <ScanOverlay
          label="قرّب البطاقة للقفل"
          onCancel={() => {
            abortRef.current?.abort();
            setBusy(false);
          }}
        />
      )}
    </AppShell>
  );
}
