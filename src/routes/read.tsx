import { createFileRoute } from "@tanstack/react-router";
import { ScanLine, Copy, Save, Tag, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { ScanOverlay } from "@/components/nfc/ScanOverlay";
import { SupportBanner } from "@/components/nfc/SupportBanner";
import { checkNfcSupport, friendlyError } from "@/lib/nfc/support";
import { decodeRecord, guessChipFromUid } from "@/lib/nfc/decoder";
import type { ScanResult } from "@/lib/nfc/types";
import { addHistory } from "@/lib/storage/history";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "قراءة بطاقة NFC" },
      { name: "description", content: "اقرأ محتوى أي بطاقة NFC تدعم NDEF." },
    ],
  }),
  component: ReadPage,
});

function ReadPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function start() {
    setError(null);
    setSaved(false);
    const sup = checkNfcSupport();
    if (sup.status !== "ok") {
      setError(sup.status === "ssr" ? "" : (sup as { message: string }).message);
      return;
    }
    try {
      const reader = new NDEFReader();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      await reader.scan({ signal: ctrl.signal });
      setScanning(true);
      reader.onreading = (e: NDEFReadingEvent) => {
        const decoded = e.message.records.map(decodeRecord);
        const res: ScanResult = {
          serialNumber: e.serialNumber,
          records: decoded,
          timestamp: Date.now(),
        };
        setResult(res);
        setScanning(false);
        ctrl.abort();
      };
      reader.onreadingerror = () => {
        setError("تعذّر قراءة البطاقة، حاول مرة أخرى.");
      };
    } catch (err) {
      setScanning(false);
      setError(friendlyError(err));
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setScanning(false);
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  async function save() {
    if (!result) return;
    await addHistory({
      id: crypto.randomUUID(),
      type: "read",
      timestamp: result.timestamp,
      serialNumber: result.serialNumber,
      records: result.records,
    });
    setSaved(true);
  }

  return (
    <AppShell title="قراءة بطاقة" icon={ScanLine}>
      <SupportBanner />

      {!result && (
        <button
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98]"
        >
          <ScanLine className="h-5 w-5" />
          ابدأ المسح
        </button>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              المعرف الفريد (UID)
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-mono text-sm break-all">{result.serialNumber}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(result.serialNumber)}
                className="shrink-0 rounded-md bg-secondary p-1.5 text-muted-foreground hover:text-foreground"
                title="نسخ UID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-primary">{guessChipFromUid(result.serialNumber)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {result.records.length} سجل • {new Date(result.timestamp).toLocaleString("ar")}
            </p>
          </div>

          {result.records.map((r, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {r.recordType}
                  {r.mediaType ? ` · ${r.mediaType}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{r.size} بايت</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.display}</p>
              {r.raw && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">hex خام</summary>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed break-all text-muted-foreground">
                    {r.raw}
                  </p>
                </details>
              )}
              <button
                onClick={() => navigator.clipboard?.writeText(r.display)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Copy className="h-3.5 w-3.5" />
                نسخ
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              onClick={save}
              disabled={saved}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition active:scale-[0.98] disabled:opacity-60"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> محفوظ
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> حفظ في السجل
                </>
              )}
            </button>
            <button
              onClick={() => {
                setResult(null);
                start();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              <ScanLine className="h-4 w-4" /> مسح جديد
            </button>
          </div>
        </div>
      )}

      {scanning && (
        <ScanOverlay
          label="قرّب البطاقة من ظهر الهاتف"
          hint="أبقها قريبة حتى تكتمل القراءة"
          onCancel={cancel}
        />
      )}
    </AppShell>
  );
}
