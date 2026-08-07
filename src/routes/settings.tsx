import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Trash2, ShieldCheck, Info } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/nfc/AppShell";
import { clearHistory } from "@/lib/storage/history";
import { adsAvailable, initAds } from "@/lib/ads/ads";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "الإعدادات" }, { name: "description", content: "إعدادات التطبيق." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [consentMsg, setConsentMsg] = useState<string | null>(null);

  async function openConsent() {
    if (!adsAvailable()) {
      setConsentMsg("إعدادات الخصوصية الإعلانية متاحة داخل تطبيق Android فقط.");
      return;
    }
    const mod = await initAds();
    try {
      await mod?.AdMob.showConsentForm();
    } catch {
      setConsentMsg("تعذّر فتح نموذج الموافقة حالياً.");
    }
  }

  return (
    <AppShell title="الإعدادات" icon={SettingsIcon}>
      <div className="space-y-3">
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            الخصوصية والإعلانات
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            يمكنك مراجعة موافقتك على الإعلانات المخصّصة في أي وقت.
          </p>
          <button
            onClick={openConsent}
            className="mt-3 w-full rounded-xl bg-secondary py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/70"
          >
            إعدادات الموافقة الإعلانية
          </button>
          {consentMsg && <p className="mt-2 text-xs text-muted-foreground">{consentMsg}</p>}
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
