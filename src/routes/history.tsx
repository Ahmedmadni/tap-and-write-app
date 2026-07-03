import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  History as HistoryIcon,
  Trash2,
  ScanLine,
  Edit3,
  Eraser,
  Lock,
  Search,
  Download,
  Upload,
  Repeat,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import {
  clearHistory,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from "@/lib/storage/history";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "سجل العمليات" },
      { name: "description", content: "سجل عمليات NFC المحفوظة محلياً." },
    ],
  }),
  component: HistoryPage,
});

const ICONS = { read: ScanLine, write: Edit3, erase: Eraser, lock: Lock } as const;
const LABELS = { read: "قراءة", write: "كتابة", erase: "تهيئة", lock: "قفل" } as const;
type Filter = "all" | "read" | "write" | "erase" | "lock";

function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory().then(setItems);
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    return items.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (!needle) return true;
      const haystack = [
        e.serialNumber || "",
        ...(e.records?.map((r) => `${r.recordType} ${r.display}`) || []),
        ...(e.drafts?.map((d) => JSON.stringify(d)) || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, filter, q]);

  async function clear() {
    if (!confirm("هل تريد مسح السجل بالكامل؟")) return;
    await clearHistory();
    setItems([]);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items || [], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfc-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as HistoryEntry[];
      if (!Array.isArray(parsed)) throw new Error("bad file");
      const merged = [...parsed, ...(items || [])];
      // dedupe by id
      const seen = new Set<string>();
      const out = merged.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
      await saveHistory(out);
      setItems(out);
    } catch {
      alert("ملف غير صالح.");
    }
  }

  function rewrite(entry: HistoryEntry) {
    // Prefer drafts (from prior write). For a read entry, we can't reconstruct
    // structured drafts reliably — send raw records so /write can prefill.
    const payload = entry.drafts
      ? { drafts: entry.drafts }
      : { records: entry.records || [] };
    try {
      sessionStorage.setItem("nfc:prefill", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    navigate({ to: "/write", search: { from: entry.id } as never });
  }

  return (
    <AppShell title="السجل" icon={HistoryIcon}>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-background py-2.5 pr-10 pl-3 text-sm outline-none focus:border-primary"
            placeholder="ابحث في السجل…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "read", "write", "erase", "lock"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {f === "all" ? "الكل" : LABELS[f]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportJson}
            disabled={!items || items.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> تصدير
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" /> استيراد
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
          {items && items.length > 0 && (
            <button
              onClick={clear}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> مسح الكل
            </button>
          )}
        </div>
      </div>

      {items === null && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
      {items && items.length === 0 && (
        <p className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          لا توجد عمليات محفوظة بعد.
        </p>
      )}
      {items && items.length > 0 && filtered.length === 0 && (
        <p className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          لا نتائج مطابقة.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((e) => {
          const Icon = ICONS[e.type];
          const canRewrite = e.type === "write" || (e.type === "read" && !!e.records?.length);
          return (
            <div key={e.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{LABELS[e.type]}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.timestamp).toLocaleString("ar")}
                  </p>
                </div>
                {canRewrite && (
                  <button
                    onClick={() => rewrite(e)}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/20"
                  >
                    <Repeat className="h-3.5 w-3.5" /> إعادة كتابة
                  </button>
                )}
              </div>
              {e.serialNumber && (
                <p className="mt-2 font-mono text-xs break-all text-muted-foreground">
                  UID: {e.serialNumber}
                </p>
              )}
              {e.records && e.records.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {e.records.slice(0, 3).map((r, i) => (
                    <li key={i} className="truncate">
                      <span className="text-primary">{r.recordType}</span> ·{" "}
                      {r.display.replace(/\n/g, " · ")}
                    </li>
                  ))}
                </ul>
              )}
              {e.drafts && e.drafts.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {e.drafts.length} سجل مكتوب ({e.drafts.map((d) => d.kind).join("، ")})
                </p>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
