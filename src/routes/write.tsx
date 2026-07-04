import { createFileRoute } from "@tanstack/react-router";
import { Edit3, Plus, Trash2, Send, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { ScanOverlay } from "@/components/nfc/ScanOverlay";
import { SupportBanner } from "@/components/nfc/SupportBanner";
import { checkNfcSupport, friendlyError } from "@/lib/nfc/support";
import { buildRecord, estimateSize } from "@/lib/nfc/writer";
import { writeRecords } from "@/lib/nfc/adapter";
import { CHIP_PRESETS } from "@/lib/nfc/decoder";
import type { DraftRecord, RecordKind } from "@/lib/nfc/types";
import { addHistory } from "@/lib/storage/history";

export const Route = createFileRoute("/write")({
  head: () => ({
    meta: [
      { title: "كتابة بطاقة NFC" },
      { name: "description", content: "اكتب نصاً أو رابطاً أو WiFi أو vCard أو أي محتوى NDEF." },
    ],
  }),
  component: WritePage,
});

const KINDS: { value: RecordKind; label: string }[] = [
  { value: "text", label: "نص" },
  { value: "url", label: "رابط URL" },
  { value: "wifi", label: "WiFi" },
  { value: "vcard", label: "vCard" },
  { value: "email", label: "بريد إلكتروني" },
  { value: "sms", label: "رسالة SMS" },
  { value: "tel", label: "اتصال هاتفي" },
  { value: "geo", label: "موقع جغرافي" },
  { value: "app", label: "تطبيق Android" },
  { value: "mime", label: "MIME مخصص" },
  { value: "external", label: "نوع خارجي" },
];

function newDraft(kind: RecordKind = "text"): DraftRecord {
  return { id: crypto.randomUUID(), kind, lang: "ar", authType: "WPA" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inp =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function Editor({ d, onChange }: { d: DraftRecord; onChange: (d: DraftRecord) => void }) {
  const u = (p: Partial<DraftRecord>) => onChange({ ...d, ...p });
  switch (d.kind) {
    case "text":
      return (
        <div className="space-y-3">
          <Field label="النص">
            <textarea className={inp} rows={3} value={d.text || ""} onChange={(e) => u({ text: e.target.value })} />
          </Field>
          <Field label="اللغة (مثال: ar, en)">
            <input className={inp} value={d.lang || "ar"} onChange={(e) => u({ lang: e.target.value })} />
          </Field>
        </div>
      );
    case "url":
      return (
        <Field label="الرابط">
          <input className={inp} placeholder="https://" value={d.url || ""} onChange={(e) => u({ url: e.target.value })} />
        </Field>
      );
    case "wifi":
      return (
        <div className="space-y-3">
          <Field label="اسم الشبكة (SSID)">
            <input className={inp} value={d.ssid || ""} onChange={(e) => u({ ssid: e.target.value })} />
          </Field>
          <Field label="نوع الحماية">
            <select
              className={inp}
              value={d.authType || "WPA"}
              onChange={(e) => u({ authType: e.target.value as "WPA" | "WEP" | "nopass" })}
            >
              <option value="WPA">WPA / WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">بدون كلمة مرور</option>
            </select>
          </Field>
          {d.authType !== "nopass" && (
            <Field label="كلمة المرور">
              <input className={inp} value={d.password || ""} onChange={(e) => u({ password: e.target.value })} />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!d.hidden}
              onChange={(e) => u({ hidden: e.target.checked })}
              className="h-4 w-4"
            />
            شبكة مخفية
          </label>
        </div>
      );
    case "vcard":
      return (
        <div className="space-y-3">
          <Field label="الاسم الكامل"><input className={inp} value={d.vName || ""} onChange={(e) => u({ vName: e.target.value })} /></Field>
          <Field label="الهاتف"><input className={inp} value={d.vPhone || ""} onChange={(e) => u({ vPhone: e.target.value })} /></Field>
          <Field label="البريد"><input className={inp} value={d.vEmail || ""} onChange={(e) => u({ vEmail: e.target.value })} /></Field>
          <Field label="الشركة"><input className={inp} value={d.vOrg || ""} onChange={(e) => u({ vOrg: e.target.value })} /></Field>
          <Field label="العنوان"><input className={inp} value={d.vAddress || ""} onChange={(e) => u({ vAddress: e.target.value })} /></Field>
        </div>
      );
    case "email":
      return (
        <div className="space-y-3">
          <Field label="البريد"><input className={inp} value={d.email || ""} onChange={(e) => u({ email: e.target.value })} /></Field>
          <Field label="الموضوع"><input className={inp} value={d.subject || ""} onChange={(e) => u({ subject: e.target.value })} /></Field>
          <Field label="المحتوى"><textarea className={inp} rows={2} value={d.body || ""} onChange={(e) => u({ body: e.target.value })} /></Field>
        </div>
      );
    case "sms":
      return (
        <div className="space-y-3">
          <Field label="رقم الهاتف"><input className={inp} value={d.phone || ""} onChange={(e) => u({ phone: e.target.value })} /></Field>
          <Field label="نص الرسالة"><textarea className={inp} rows={2} value={d.message || ""} onChange={(e) => u({ message: e.target.value })} /></Field>
        </div>
      );
    case "tel":
      return <Field label="رقم الهاتف"><input className={inp} value={d.phone || ""} onChange={(e) => u({ phone: e.target.value })} /></Field>;
    case "geo":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="خط العرض"><input className={inp} value={d.lat || ""} onChange={(e) => u({ lat: e.target.value })} /></Field>
          <Field label="خط الطول"><input className={inp} value={d.lng || ""} onChange={(e) => u({ lng: e.target.value })} /></Field>
        </div>
      );
    case "app":
      return <Field label="اسم حزمة التطبيق"><input className={inp} placeholder="com.example.app" value={d.appPackage || ""} onChange={(e) => u({ appPackage: e.target.value })} /></Field>;
    case "mime":
      return (
        <div className="space-y-3">
          <Field label="نوع الوسائط"><input className={inp} placeholder="application/json" value={d.mediaType || ""} onChange={(e) => u({ mediaType: e.target.value })} /></Field>
          <Field label="المحتوى"><textarea className={inp} rows={3} value={d.payload || ""} onChange={(e) => u({ payload: e.target.value })} /></Field>
        </div>
      );
    case "external":
      return (
        <div className="space-y-3">
          <Field label="النوع الخارجي"><input className={inp} placeholder="example.com:type" value={d.externalType || ""} onChange={(e) => u({ externalType: e.target.value })} /></Field>
          <Field label="المحتوى"><textarea className={inp} rows={3} value={d.payload || ""} onChange={(e) => u({ payload: e.target.value })} /></Field>
        </div>
      );
    default:
      return null;
  }
}

function WritePage() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([newDraft()]);
  const [writing, setWriting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [chip, setChip] = useState<string>("NTAG213");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nfc:prefill");
      if (!raw) return;
      const p = JSON.parse(raw) as { drafts?: DraftRecord[] };
      if (p.drafts && Array.isArray(p.drafts) && p.drafts.length) {
        setDrafts(p.drafts.map((d) => ({ ...d, id: crypto.randomUUID() })));
      }
      sessionStorage.removeItem("nfc:prefill");
    } catch {
      /* ignore */
    }
  }, []);

  const records = drafts.map(buildRecord);
  const size = estimateSize(records);
  const preset = CHIP_PRESETS.find((c) => c.name === chip) ?? CHIP_PRESETS[0];
  const over = size > preset.capacity;

  function updateAt(i: number, d: DraftRecord) {
    setDrafts((arr) => arr.map((x, idx) => (idx === i ? d : x)));
  }
  function removeAt(i: number) {
    setDrafts((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));
  }

  async function start() {
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
      setWriting(true);
      await writeRecords(records, { overwrite, signal: ctrl.signal });
      setWriting(false);
      setDone(true);
      await addHistory({
        id: crypto.randomUUID(),
        type: "write",
        timestamp: Date.now(),
        drafts,
      });
    } catch (err) {
      setWriting(false);
      setError(friendlyError(err));
    }
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <AppShell title="كتابة بطاقة" icon={Edit3}>
      <SupportBanner />

      <div className="space-y-4">
        {drafts.map((d, i) => (
          <div key={d.id} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <select
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={d.kind}
                onChange={(e) => updateAt(i, { ...d, kind: e.target.value as RecordKind })}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
              {drafts.length > 1 && (
                <button
                  onClick={() => removeAt(i)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Editor d={d} onChange={(nd) => updateAt(i, nd)} />
          </div>
        ))}

        <button
          onClick={() => setDrafts((a) => [...a, newDraft()])}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" /> إضافة سجل آخر
        </button>

        <div className="rounded-2xl border border-border/60 bg-card/50 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              الحجم: <span className="text-foreground">{size}</span> / {preset.capacity} بايت
            </span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
              value={chip}
              onChange={(e) => setChip(e.target.value)}
            >
              {CHIP_PRESETS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all ${over ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min(100, (size / preset.capacity) * 100)}%` }}
            />
          </div>
          {over && (
            <p className="mt-2 text-amber-500">⚠ الحجم يتجاوز سعة {preset.name}.</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="h-4 w-4" />
          الكتابة فوق المحتوى القديم
        </label>

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>
        )}
        {done && (
          <p className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> تمت الكتابة بنجاح.
          </p>
        )}

        <button
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98]"
        >
          <Send className="h-5 w-5" /> الكتابة على البطاقة
        </button>
      </div>

      {writing && (
        <ScanOverlay
          label="قرّب البطاقة للكتابة"
          onCancel={() => {
            abortRef.current?.abort();
            setWriting(false);
          }}
        />
      )}
    </AppShell>
  );
}
