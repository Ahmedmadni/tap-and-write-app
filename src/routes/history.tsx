import { createFileRoute } from "@tanstack/react-router";
import { History as HistoryIcon, Trash2, ScanLine, Edit3, Eraser, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { clearHistory, loadHistory, type HistoryEntry } from "@/lib/storage/history";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [{ title: "سجل العمليات" }, { name: "description", content: "سجل عمليات NFC المحفوظة محلياً." }],
  }),
  component: HistoryPage,
});

const ICONS = { read: ScanLine, write: Edit3, erase: Eraser, lock: Lock } as const;
const LABELS = { read: "قراءة", write: "كتابة", erase: "تهيئة", lock: "قفل" } as const;

function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    loadHistory().then(setItems);
  }, []);

  async function clear() {
    if (!confirm("هل تريد مسح السجل بالكامل؟")) return;
    await clearHistory();
    setItems([]);
  }

  return (
    <AppShell title="السجل" icon={HistoryIcon}>
      {items && items.length > 0 && (
        <button
          onClick={clear}
          className="mb-4 flex items-center gap-2 text-sm text-destructive hover:underline"
        >
          <Trash2 className="h-4 w-4" /> مسح السجل
        </button>
      )}

      {items === null && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
      {items && items.length === 0 && (
        <p className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          لا توجد عمليات محفوظة بعد.
        </p>
      )}

      <div className="space-y-3">
        {items?.map((e) => {
          const Icon = ICONS[e.type];
          return (
            <div key={e.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{LABELS[e.type]}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString("ar")}</p>
                </div>
              </div>
              {e.serialNumber && (
                <p className="mt-2 font-mono text-xs break-all text-muted-foreground">UID: {e.serialNumber}</p>
              )}
              {e.records && e.records.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {e.records.slice(0, 3).map((r, i) => (
                    <li key={i} className="truncate">
                      <span className="text-primary">{r.recordType}</span> · {r.display}
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
