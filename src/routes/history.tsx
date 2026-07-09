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
  Pin,
  PinOff,
  StickyNote,
  Share2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import {
  clearHistory,
  loadHistory,
  saveHistory,
  updateEntry,
  removeEntries,
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
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
        e.note || "",
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
    setSelected(new Set());
    setSelectMode(false);
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
      const seen = new Set<string>();
      const out = merged.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
      await saveHistory(out);
      setItems(await loadHistory());
    } catch {
      alert("ملف غير صالح.");
    }
  }

  function rewrite(entry: HistoryEntry) {
    const payload = entry.drafts
      ? { drafts: entry.drafts }
      : { records: entry.records || [] };
    try {
      sessionStorage.setItem("nfc:prefill", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    navigate({ to: "/write" });
  }

  async function togglePin(entry: HistoryEntry) {
    await updateEntry(entry.id, { pinned: !entry.pinned });
    setItems(await loadHistory());
  }

  function startEditNote(entry: HistoryEntry) {
    setEditingNote(entry.id);
    setNoteDraft(entry.note || "");
  }

  async function saveNote(id: string) {
    await updateEntry(id, { note: noteDraft.trim() || undefined });
    setEditingNote(null);
    setNoteDraft("");
    setItems(await loadHistory());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`حذف ${selected.size} إدخال؟`)) return;
    const next = await removeEntries([...selected]);
    setItems(next);
    setSelected(new Set());
    setSelectMode(false);
  }

  async function shareEntry(entry: HistoryEntry) {
    const lines: string[] = [`نوع العملية: ${LABELS[entry.type]}`];
    if (entry.serialNumber) lines.push(`UID: ${entry.serialNumber}`);
    if (entry.records?.length) {
      lines.push("المحتوى:");
      entry.records.forEach((r) => lines.push(`• ${r.recordType}: ${r.display}`));
    }
    if (entry.drafts?.length) {
      lines.push(`عدد السجلات: ${entry.drafts.length}`);
    }
    if (entry.note) lines.push(`ملاحظة: ${entry.note}`);
    lines.push(new Date(entry.timestamp).toLocaleString("ar"));
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "NFC — " + LABELS[entry.type], text });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("تم نسخ المحتوى إلى الحافظة.");
    } catch {
      alert("تعذّرت المشاركة.");
    }
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
          {!selectMode && (
            <>
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
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs"
                >
                  <CheckSquare className="h-3.5 w-3.5" /> تحديد
                </button>
              )}
              {items && items.length > 0 && (
                <button
                  onClick={clear}
                  className="ml-auto flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> مسح الكل
                </button>
              )}
            </>
          )}
          {selectMode && (
            <>
              <button
                onClick={() => {
                  setSelectMode(false);
                  setSelected(new Set());
                }}
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" /> إلغاء
              </button>
              <button
                onClick={() =>
                  setSelected(new Set(filtered.map((e) => e.id)))
                }
                className="rounded-xl bg-secondary px-3 py-1.5 text-xs"
              >
                تحديد الكل ({filtered.length})
              </button>
              <button
                onClick={deleteSelected}
                disabled={selected.size === 0}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-1.5 text-xs text-destructive-foreground disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> حذف ({selected.size})
              </button>
            </>
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
          const canRewrite =
            e.type === "write" || (e.type === "read" && !!e.records?.length);
          const isSelected = selected.has(e.id);
          const isEditing = editingNote === e.id;
          return (
            <div
              key={e.id}
              className={`rounded-2xl border bg-card p-4 transition ${
                e.pinned ? "border-primary/40" : "border-border/60"
              } ${isSelected ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-2">
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(e.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-primary"
                    aria-label="تحديد"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                )}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {LABELS[e.type]}
                    {e.pinned && <Pin className="h-3 w-3 fill-primary text-primary" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.timestamp).toLocaleString("ar")}
                  </p>
                </div>
                {!selectMode && (
                  <div className="flex items-center gap-1">
                    <IconBtn
                      onClick={() => togglePin(e)}
                      label={e.pinned ? "إلغاء التثبيت" : "تثبيت"}
                    >
                      {e.pinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" />
                      )}
                    </IconBtn>
                    <IconBtn onClick={() => startEditNote(e)} label="ملاحظة">
                      <StickyNote className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn onClick={() => shareEntry(e)} label="مشاركة">
                      <Share2 className="h-3.5 w-3.5" />
                    </IconBtn>
                    {canRewrite && (
                      <button
                        onClick={() => rewrite(e)}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/20"
                      >
                        <Repeat className="h-3.5 w-3.5" /> إعادة
                      </button>
                    )}
                  </div>
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
              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={noteDraft}
                    onChange={(ev) => setNoteDraft(ev.target.value)}
                    placeholder="اكتب ملاحظتك…"
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs outline-none focus:border-primary"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveNote(e.id)}
                      className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(null);
                        setNoteDraft("");
                      }}
                      className="rounded-lg bg-secondary px-3 py-1 text-xs"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                e.note && (
                  <p className="mt-2 rounded-lg border border-border/40 bg-background/40 p-2 text-xs text-foreground">
                    📝 {e.note}
                  </p>
                )
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  );
}
