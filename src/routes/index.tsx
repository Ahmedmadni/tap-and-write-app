import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc, ScanLine, Edit3, Eraser, Lock, History, Settings, ClipboardCheck, Database, Bug } from "lucide-react";
import { SupportBanner } from "@/components/nfc/SupportBanner";
import { HomeStats } from "@/components/nfc/HomeStats";
import { NfcHero3D } from "@/components/nfc/NfcHero3D";
import { TiltCard } from "@/components/nfc/TiltCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NFC Tools — قارئ وكاتب بطاقات NFC" },
      {
        name: "description",
        content:
          "تطبيق هاتف لقراءة وكتابة وتهيئة وقفل بطاقات NFC بجميع صيغ NDEF (نص، روابط، WiFi، vCard، MIME).",
      },
    ],
  }),
  component: Home,
});

const tiles = [
  { to: "/read", icon: ScanLine, label: "قراءة بطاقة", desc: "قرّب البطاقة لعرض محتواها" },
  { to: "/write", icon: Edit3, label: "كتابة بيانات", desc: "نص، رابط، WiFi، vCard..." },
  { to: "/erase", icon: Eraser, label: "تهيئة البطاقة", desc: "مسح كل المحتوى" },
  { to: "/lock", icon: Lock, label: "قفل البطاقة", desc: "جعلها للقراءة فقط (نهائي)" },
] as const;

function Home() {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="px-4 pt-10 pb-6">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30">
              <Nfc className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">NFC Tools</h1>
              <p className="text-xs text-muted-foreground">قارئ وكاتب بطاقات NFC</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/history"
              aria-label="السجل"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/70"
            >
              <History className="h-4 w-4" />
            </Link>
            <Link
              to="/settings"
              aria-label="الإعدادات"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/70"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-12">
        <SupportBanner />
        <div className="mb-4">
          <NfcHero3D />
        </div>
        <HomeStats />

        <div className="grid grid-cols-2 gap-3">
          {tiles.map(({ to, icon: Icon, label, desc }) => (
            <TiltCard key={to} className="rounded-3xl">
              <Link
                to={to}
                className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-card p-4 text-card-foreground transition hover:border-primary/40 hover:bg-card/80 active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground" style={{ transform: "translateZ(30px)" }}>
                  <Icon className="h-6 w-6" />
                </div>
                <div style={{ transform: "translateZ(20px)" }}>
                  <p className="text-base font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{desc}</p>
                </div>
              </Link>
            </TiltCard>
          ))}
        </div>

        <Link
          to="/test"
          className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-sm transition hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">قائمة تحقق NFC</p>
              <p className="text-xs text-muted-foreground">اختبر كل الصيغ (WiFi/vCard/mailto/…)</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">›</span>
        </Link>

        <Link
          to="/cache-status"
          className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-sm transition hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">حالة الكاش</p>
              <p className="text-xs text-muted-foreground">تشخيص Service Worker والوضع Offline</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">›</span>
        </Link>

        <Link
          to="/nfc-debug"
          className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-sm transition hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">NFC Debug</p>
              <p className="text-xs text-muted-foreground">سجل أحداث القراءة/الكتابة الحية</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">›</span>
        </Link>



        <section className="mt-8 rounded-2xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground">
          <p className="leading-relaxed">
            <strong className="text-foreground">ملاحظة:</strong> Web NFC مدعوم على Chrome / Edge في Android فقط.
            افتح هذا التطبيق على متصفح هاتفك مباشرة، ثم استخدم خيار "إضافة إلى الشاشة الرئيسية" لتثبيته كأيقونة.
          </p>
        </section>
      </main>
    </div>
  );
}
