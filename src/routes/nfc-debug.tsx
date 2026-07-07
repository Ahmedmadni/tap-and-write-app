import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bug, Play, Square, Trash2, PenLine, RefreshCw, Cpu } from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import { getPlatform, startRead, writeRecords, type Platform } from "@/lib/nfc/adapter";
import type { ScanResult } from "@/lib/nfc/types";

export const Route = createFileRoute("/nfc-debug")({
  head: () => ({
    meta: [
      { title: "NFC Debug — تشخيص Native NFC" },
      {
        name: "description",
        content: "عرض المحول الفعّال، أحداث القراءة والكتابة الحية مع طوابع زمنية لتوثيق اختبارات NFC.",
      },
    ],
  }),
  component: NfcDebugPage,
});

type EventLevel = "info" | "success" | "error";
interface LogEvent {
  id: number;
  at: number;
  level: EventLevel;
  label: string;
  detail?: string;
}

interface EnvInfo {
  platform: Platform;
  isCapacitor: boolean;
  hasNDEFReader: boolean;
  userAgent: string;
  online: boolean;
}

let logSeq = 0;

function NfcDebugPage() {
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [reading, setReading] = useState(false);
  const [writing, setWriting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const push = useCallback((level: EventLevel, label: string, detail?: string) => {
    setEvents((prev) => [
      { id: ++logSeq, at: Date.now(), level, label, detail },
      ...prev,
    ].slice(0, 200));
  }, []);

  const refreshEnv = useCallback(async () => {
    const platform = await getPlatform();
    const isCapacitor =
      typeof window !== "undefined" &&
      Boolean((window as unknown as { Capacitor?: unknown }).Capacitor);
    setEnv({
      platform,
      isCapacitor,
      hasNDEFReader: typeof window !== "undefined" && "NDEFReader" in window,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
    });
    push("info", `Adapter: ${platform}`, isCapacitor ? "Capacitor detected" : "web context");
  }, [push]);

  useEffect(() => {
    void refreshEnv();
    return () => abortRef.current?.abort();
  }, [refreshEnv]);

  const startReading = async () => {
    if (reading) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setReading(true);
    push("info", "startRead()", "بدء جلسة قراءة — قرّب بطاقة NFC");
    try {
      await startRead({
        signal: ctrl.signal,
        onReading: (r: ScanResult) => {
          push(
            "success",
            `tag → ${r.serialNumber || "(no uid)"}`,
            `${r.records.length} سجل${r.records.length === 1 ? "" : "ات"} · ${summarize(r)}`,
          );
        },
        onError: (err) => push("error", "readingerror", stringifyErr(err)),
      });
    } catch (err) {
      push("error", "startRead() فشل", stringifyErr(err));
      setReading(false);
    }
  };

  const stopReading = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setReading(false);
    push("info", "stopRead()", "تم إنهاء الجلسة");
  };

  const testWrite = async () => {
    if (writing) return;
    setWriting(true);
    push("info", "write() نص اختباري", `NFC Debug @ ${new Date().toISOString()}`);
    const ctrl = new AbortController();
    try {
      await writeRecords(
        [{ recordType: "text", data: `NFC Debug @ ${new Date().toISOString()}`, lang: "ar" }],
        { signal: ctrl.signal },
      );
      push("success", "write() نجحت", "تمت الكتابة بنجاح");
    } catch (err) {
      push("error", "write() فشلت", stringifyErr(err));
    } finally {
      setWriting(false);
    }
  };

  return (
    <AppShell title="NFC Debug" icon={Bug}>
      <div className="space-y-3">
        {/* بطاقة البيئة */}
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="h-4 w-4 text-primary" />
              المحول (Adapter)
            </div>
            <button
              onClick={() => void refreshEnv()}
              className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/70"
              aria-label="تحديث"
            >
              <RefreshCw className="h-3 w-3" />
              تحديث
            </button>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <Row k="Platform">
              <PlatformBadge platform={env?.platform ?? "unavailable"} />
            </Row>
            <Row k="Capacitor">{env?.isCapacitor ? "نعم" : "لا"}</Row>
            <Row k="NDEFReader">{env?.hasNDEFReader ? "متاح" : "غير متاح"}</Row>
            <Row k="Online">{env?.online ? "متصل" : "غير متصل"}</Row>
            <Row k="UA">
              <span className="block truncate" dir="ltr" title={env?.userAgent}>
                {env?.userAgent ?? "—"}
              </span>
            </Row>
          </div>
        </section>

        {/* أزرار الإجراءات */}
        <div className="grid grid-cols-3 gap-2">
          {!reading ? (
            <button
              onClick={() => void startReading()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Play className="h-4 w-4" /> قراءة
            </button>
          ) : (
            <button
              onClick={stopReading}
              className="flex items-center justify-center gap-2 rounded-xl bg-destructive/15 px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/25"
            >
              <Square className="h-4 w-4" /> إيقاف
            </button>
          )}
          <button
            onClick={() => void testWrite()}
            disabled={writing}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70 disabled:opacity-50"
          >
            <PenLine className="h-4 w-4" /> كتابة
          </button>
          <button
            onClick={() => setEvents([])}
            disabled={!events.length}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-sm text-secondary-foreground transition hover:bg-secondary/40 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> مسح
          </button>
        </div>

        {/* سجل الأحداث */}
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold">
            <span>سجل الأحداث</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {events.length} حدث
            </span>
          </div>
          {events.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              لا يوجد أحداث بعد — اضغط "قراءة" أو "كتابة" ثم قرّب بطاقة.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-xl border border-border/40 bg-background/40 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold ${levelClass(ev.level)}`}>{ev.label}</span>
                    <time className="shrink-0 font-mono text-[10px] text-muted-foreground" dir="ltr">
                      {formatTime(ev.at)}
                    </time>
                  </div>
                  {ev.detail && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground" dir="auto">
                      {ev.detail}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
          Platform=<code className="rounded bg-muted px-1">native</code> يعني تحميل
          <code className="mx-1 rounded bg-muted px-1">@capawesome-team/capacitor-nfc</code>
          داخل Capacitor. <code className="rounded bg-muted px-1">web</code> يستخدم NDEFReader
          (Chrome/Edge على Android فقط). داخل معاينة Lovable سيظهر
          <code className="mx-1 rounded bg-muted px-1">unavailable</code>.
        </p>
      </div>
    </AppShell>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 font-mono text-foreground">{children}</dd>
    </>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const cls =
    platform === "native"
      ? "bg-emerald-500/15 text-emerald-400"
      : platform === "web"
        ? "bg-primary/15 text-primary"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {platform}
    </span>
  );
}

function levelClass(l: EventLevel) {
  return l === "success"
    ? "text-emerald-400"
    : l === "error"
      ? "text-destructive"
      : "text-primary";
}

function formatTime(at: number) {
  const d = new Date(at);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3,
  )}`;
}

function stringifyErr(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function summarize(r: ScanResult): string {
  if (!r.records.length) return "(فارغ)";
  return r.records
    .slice(0, 3)
    .map((rec) => `${rec.recordType}${rec.display ? `="${trim(rec.display, 30)}"` : ""}`)
    .join(" · ");
}

function trim(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
