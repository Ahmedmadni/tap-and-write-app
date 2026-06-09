import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Trash2, Smartphone, Info } from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import { clearHistory } from "@/lib/storage/history";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "الإعدادات" }, { name: "description", content: "إعدادات التطبيق." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell title="الإعدادات" icon={SettingsIcon}>
      <div className="space-y-3">
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4 text-primary" />
            تثبيت كتطبيق
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            افتح القائمة في Chrome على Android، ثم اختر "إضافة إلى الشاشة الرئيسية" لتثبيت التطبيق كأيقونة مستقلة.
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-primary" />
            عن التطبيق
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            يدعم هذا التطبيق صيغ NDEF: نص، URL، WiFi، vCard، البريد، SMS، الهاتف، الموقع، تطبيقات Android، MIME المخصص، والأنواع الخارجية.
            لا يدعم القراءة الخام لبطاقات MIFARE Classic أو بطاقات البنوك (EMV).
          </p>
        </section>

        <button
          onClick={async () => {
            if (!confirm("مسح كل السجل المحلي؟")) return;
            await clearHistory();
            alert("تم المسح");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3 text-sm font-medium text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-4 w-4" /> مسح كل البيانات المحلية
        </button>
      </div>
    </AppShell>
  );
}
