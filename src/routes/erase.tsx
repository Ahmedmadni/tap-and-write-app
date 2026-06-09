import { createFileRoute } from "@tanstack/react-router";
import { Eraser, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { ScanOverlay } from "@/components/nfc/ScanOverlay";
import { SupportBanner } from "@/components/nfc/SupportBanner";
import { checkNfcSupport, friendlyError } from "@/lib/nfc/support";
import { addHistory } from "@/lib/storage/history";

export const Route = createFileRoute("/erase")({
  head: () => ({
    meta: [
      { title: "تهيئة بطاقة NFC" },
      { name: "description", content: "امسح محتوى بطاقة NFC بكتابة سجل فارغ." },
    ],
  }),
  component: ErasePage,
});

function ErasePage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    setError(null);
    setDone(false);
    const sup = checkNfcSupport();
    if (sup.status !== "ok") {
      setError(sup.status === "ssr" ? "" : (sup as { message: string }).message);
      return;
    }
    try {
      const reader = new NDEFReader();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      await reader.write({ records: [{ recordType: "empty" }] }, { overwrite: true, signal: ctrl.signal });
      setBusy(false);
      setDone(true);
      await addHistory({ id: crypto.randomUUID(), type: "erase", timestamp: Date.now() });
    } catch (err) {
      setBusy(false);
      setError(friendlyError(err));
    }
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <AppShell title="تهيئة البطاقة" icon={Eraser}>
      <SupportBanner />

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        سيتم استبدال محتوى البطاقة بسجل NDEF فارغ. لا يمكن استرجاع المحتوى القديم بعد ذلك.
      </div>

      {error && <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
      {done && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" /> تمت التهيئة بنجاح.
        </p>
      )}

      <button
        onClick={run}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98]"
      >
        <Eraser className="h-5 w-5" /> ابدأ التهيئة
      </button>

      {busy && (
        <ScanOverlay
          label="قرّب البطاقة لتهيئتها"
          onCancel={() => {
            abortRef.current?.abort();
            setBusy(false);
          }}
        />
      )}
    </AppShell>
  );
}
