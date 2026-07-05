import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, CheckCircle2, XCircle, Circle, Send, ScanLine, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { ScanOverlay } from "@/components/nfc/ScanOverlay";
import { SupportBanner } from "@/components/nfc/SupportBanner";
import { friendlyError } from "@/lib/nfc/support";
import { buildRecord, estimateSize } from "@/lib/nfc/writer";
import { startRead, writeRecords, getPlatform } from "@/lib/nfc/adapter";
import type { DraftRecord, ScanResult } from "@/lib/nfc/types";
import { addHistory } from "@/lib/storage/history";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "قائمة تحقق NFC — اختبار كل الصيغ" },
      {
        name: "description",
        content:
          "اختبر كتابة وقراءة كل صيغ NDEF (نص، رابط، WiFi، vCard، mailto، tel، sms، geo، MIME، خارجي) وسجّل النتائج.",
      },
    ],
  }),
  component: TestPage,
});

type Status = "pending" | "writing" | "reading" | "pass" | "fail";

interface TestCase {
  id: string;
  label: string;
  draft: DraftRecord;
  /** جزء نصي متوقع ظهوره في العرض المفكوك للتحقق. */
  expect: string[];
}

const CASES: TestCase[] = [
  {
    id: "text-ar",
    label: "نص عربي (UTF-8)",
    draft: { id: "1", kind: "text", lang: "ar", text: "مرحباً من NFC Tools" },
    expect: ["مرحباً"],
  },
  {
    id: "text-en",
    label: "نص إنجليزي",
    draft: { id: "2", kind: "text", lang: "en", text: "Hello NFC" },
    expect: ["Hello NFC"],
  },
  {
    id: "url",
    label: "رابط URL",
    draft: { id: "3", kind: "url", url: "https://lovable.dev" },
    expect: ["lovable.dev"],
  },
  {
    id: "wifi",
    label: "WiFi (WPA)",
    draft: {
      id: "4",
      kind: "wifi",
      ssid: "TestNet",
      authType: "WPA",
      password: "pass1234",
      hidden: false,
    },
    expect: ["TestNet", "pass1234"],
  },
  {
    id: "vcard",
    label: "vCard جهة اتصال",
    draft: {
      id: "5",
      kind: "vcard",
      vName: "أحمد التجريبي",
      vPhone: "+966500000000",
      vEmail: "ahmed@test.com",
      vOrg: "Lovable",
    },
    expect: ["أحمد", "+966500000000"],
  },
  {
    id: "email",
    label: "mailto مع موضوع",
    draft: {
      id: "6",
      kind: "email",
      email: "hi@test.com",
      subject: "اختبار",
      body: "رسالة تجريبية",
    },
    expect: ["hi@test.com"],
  },
  {
    id: "tel",
    label: "اتصال tel:",
    draft: { id: "7", kind: "tel", phone: "+966500000000" },
    expect: ["+966500000000"],
  },
  {
    id: "sms",
    label: "SMS مع نص",
    draft: { id: "8", kind: "sms", phone: "+966500000000", message: "test" },
    expect: ["+966500000000"],
  },
  {
    id: "geo",
    label: "موقع geo:",
    draft: { id: "9", kind: "geo", lat: "24.7136", lng: "46.6753" },
    expect: ["24.7136", "46.6753"],
  },
  {
    id: "app",
    label: "Android App Record",
    draft: { id: "10", kind: "app", appPackage: "com.android.chrome" },
    expect: ["com.android.chrome"],
  },
  {
    id: "mime",
    label: "MIME مخصص (application/json)",
    draft: {
      id: "11",
      kind: "mime",
      mediaType: "application/json",
      payload: '{"ok":true}',
    },
    expect: ['"ok":true'],
  },
  {
    id: "external",
    label: "نوع خارجي (external type)",
    draft: {
      id: "12",
      kind: "external",
      externalType: "lovable.dev:test",
      payload: "hello-external",
    },
    expect: ["hello-external"],
  },
];

interface Result {
  status: Status;
  note?: string;
  serialNumber?: string;
  display?: string;
}

function TestPage() {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState<null | { id: string; mode: "write" | "read" }>(null);
  const [platform, setPlatform] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const setResult = (id: string, r: Result) =>
    setResults((prev) => ({ ...prev, [id]: r }));

  const totalPass = Object.values(results).filter((r) => r.status === "pass").length;
  const totalFail = Object.values(results).filter((r) => r.status === "fail").length;

  async function ensurePlatform() {
    if (!platform) {
      const p = await getPlatform();
      setPlatform(p);
      return p;
    }
    return platform;
  }

  async function runWrite(c: TestCase) {
    await ensurePlatform();
    const record = buildRecord(c.draft);
    const size = estimateSize([record]);
    setResult(c.id, { status: "writing" });
    setBusy({ id: c.id, mode: "write" });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await writeRecords([record], { overwrite: true, signal: ac.signal });
      setResult(c.id, { status: "reading", note: `تمت الكتابة (${size}B) — الآن اقرأ للتحقق` });
      await addHistory({
        id: crypto.randomUUID(),
        type: "write",
        timestamp: Date.now(),
        drafts: [c.draft],
        note: `اختبار: ${c.label}`,
      });
    } catch (e) {
      setResult(c.id, { status: "fail", note: `كتابة فشلت: ${friendlyError(e)}` });
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  }

  async function runRead(c: TestCase) {
    await ensurePlatform();
    setBusy({ id: c.id, mode: "read" });
    setResult(c.id, { status: "reading" });
    const ac = new AbortController();
    abortRef.current = ac;
    let handled = false;
    try {
      await startRead({
        signal: ac.signal,
        onReading: async (scan: ScanResult) => {
          if (handled) return;
          handled = true;
          const display = scan.records.map((r) => r.display).join(" | ");
          const ok = c.expect.every((token) => display.includes(token));
          setResult(c.id, {
            status: ok ? "pass" : "fail",
            serialNumber: scan.serialNumber,
            display,
            note: ok
              ? "تطابق العرض مع المتوقع"
              : `متوقع يحتوي: ${c.expect.join(", ")}`,
          });
          await addHistory({
            id: crypto.randomUUID(),
            type: "read",
            timestamp: scan.timestamp,
            serialNumber: scan.serialNumber,
            records: scan.records,
            note: `اختبار ${c.label} — ${ok ? "PASS" : "FAIL"}`,
          });
          ac.abort();
          setBusy(null);
        },
        onError: (err) => {
          setResult(c.id, { status: "fail", note: `قراءة فشلت: ${friendlyError(err)}` });
          setBusy(null);
        },
      });
    } catch (e) {
      setResult(c.id, { status: "fail", note: `قراءة فشلت: ${friendlyError(e)}` });
      setBusy(null);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(null);
  }

  function reset() {
    setResults({});
  }

  return (
    <AppShell title="قائمة تحقق NFC" icon={ClipboardCheck}>
      <SupportBanner />

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3 text-sm">
        <div className="flex gap-3">
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" /> {totalPass}
          </span>
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="h-4 w-4" /> {totalFail}
          </span>
          <span className="text-muted-foreground">من {CASES.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {platform && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {platform === "native" ? "Native" : platform === "web" ? "Web NFC" : "غير متاح"}
            </span>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/70"
          >
            <RotateCcw className="h-3 w-3" /> إعادة
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        لكل صيغة: اضغط <strong>كتابة</strong> وقرّب البطاقة، ثم اضغط <strong>قراءة تحقق</strong>
        وقرّبها مرة أخرى. النتيجة تُسجَّل تلقائياً في{" "}
        <Link to="/history" className="text-primary underline">
          السجل
        </Link>
        .
      </p>

      <ul className="space-y-2">
        {CASES.map((c) => {
          const r = results[c.id] ?? { status: "pending" as Status };
          return (
            <li
              key={c.id}
              className="rounded-2xl border border-border/60 bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusIcon status={r.status} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.draft.kind} · متوقع: {c.expect.join(" / ")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    disabled={busy !== null}
                    onClick={() => runWrite(c)}
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                  >
                    <Send className="h-3 w-3" /> كتابة
                  </button>
                  <button
                    disabled={busy !== null}
                    onClick={() => runRead(c)}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground disabled:opacity-40"
                  >
                    <ScanLine className="h-3 w-3" /> قراءة
                  </button>
                </div>
              </div>
              {r.note && (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {r.note}
                </p>
              )}
              {r.display && (
                <p className="mt-1 rounded-md bg-muted/40 px-2 py-1 font-mono text-[11px] break-all">
                  {r.display}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {busy && (
        <ScanOverlay
          title={busy.mode === "write" ? "قرّب البطاقة للكتابة" : "قرّب البطاقة للقراءة"}
          onCancel={cancel}
        />
      )}
    </AppShell>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (status === "fail") return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
  if (status === "writing" || status === "reading")
    return <Circle className="h-4 w-4 shrink-0 animate-pulse text-primary" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />;
}
