import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/nfc/AppShell";
import {
  checkOfflineReadiness,
  REQUIRED_APP_SHELL,
  type OfflineReadiness,
} from "@/lib/pwa/offline-readiness";


export const Route = createFileRoute("/cache-status")({
  head: () => ({
    meta: [
      { title: "حالة الكاش — تشخيص Offline" },
      {
        name: "description",
        content: "عرض حالة Service Worker والكاشات المخزنة للتحقق من عمل الوضع دون اتصال.",
      },
    ],
  }),
  component: CacheStatusPage,
});

/** ملخص كاش واحد: اسمه وعدد الطلبات المخزنة + أول 5 روابط للاستعراض. */
interface CacheSummary {
  name: string;
  size: number;
  sample: string[];
}

interface Snapshot {
  swSupported: boolean;
  swController: string | null;
  registrationScope: string | null;
  registrationState: string | null;
  scriptUrl: string | null;
  cachesSupported: boolean;
  caches: CacheSummary[];
  totalEntries: number;
  online: boolean;
  collectedAt: string;
  version: string | null;
}

async function collectSnapshot(): Promise<Snapshot> {
  const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const cachesSupported = typeof caches !== "undefined";

  let registrationScope: string | null = null;
  let registrationState: string | null = null;
  let scriptUrl: string | null = null;
  let swController: string | null = null;

  if (swSupported) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (reg) {
        registrationScope = reg.scope;
        const worker = reg.active || reg.waiting || reg.installing;
        registrationState = worker?.state ?? null;
        scriptUrl = worker?.scriptURL ?? null;
      }
      swController = navigator.serviceWorker.controller?.scriptURL ?? null;
    } catch {
      /* ignore */
    }
  }

  const cacheSummaries: CacheSummary[] = [];
  if (cachesSupported) {
    try {
      const names = await caches.keys();
      for (const name of names) {
        try {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          cacheSummaries.push({
            name,
            size: keys.length,
            sample: keys.slice(0, 5).map((r) => {
              try {
                return new URL(r.url).pathname + new URL(r.url).search;
              } catch {
                return r.url;
              }
            }),
          });
        } catch {
          cacheSummaries.push({ name, size: 0, sample: [] });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // استخراج إصدار الـ SW من أسماء الكاشات (nfc-tools-app-v1 → v1).
  const versionFromCache = cacheSummaries
    .map((c) => /-(v\d+)$/.exec(c.name)?.[1])
    .find((v): v is string => Boolean(v));

  return {
    swSupported,
    swController,
    registrationScope,
    registrationState,
    scriptUrl,
    cachesSupported,
    caches: cacheSummaries,
    totalEntries: cacheSummaries.reduce((n, c) => n + c.size, 0),
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    collectedAt: new Date().toLocaleString("ar-EG"),
    version: versionFromCache ?? null,
  };
}

function CacheStatusPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [readiness, setReadiness] = useState<OfflineReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [warming, setWarming] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([collectSnapshot(), checkOfflineReadiness()]);
      setSnap(s);
      setReadiness(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onOnline = () => void refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
    };
  }, [refresh]);

  const clearAll = async () => {
    if (!confirm("سيتم مسح جميع الكاشات المخزنة محلياً. متابعة؟")) return;
    setClearing(true);
    try {
      if (typeof caches !== "undefined") {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      await refresh();
    } finally {
      setClearing(false);
    }
  };

  /** يجبر Service Worker على تنزيل App Shell عبر إصدار طلبات لكل مسار مفقود.
   *  الـ SW يعترض هذه الطلبات (NetworkFirst للتنقلات) ويخزّنها. */
  const warmCache = async () => {
    if (!readiness) return;
    setWarming(true);
    try {
      await Promise.allSettled(
        readiness.missingPaths.map((p) =>
          fetch(p, { cache: "reload", credentials: "same-origin" }),
        ),
      );
      // مهلة قصيرة كي يُنهي الـ SW الكتابة داخل Cache Storage.
      await new Promise((r) => setTimeout(r, 400));
      await refresh();
    } finally {
      setWarming(false);
    }
  };



  return (
    <AppShell title="حالة الكاش" icon={Database}>
      <div className="space-y-3">
        {/* شريط الإجراءات */}
        <div className="flex gap-2">
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <button
            onClick={() => void clearAll()}
            disabled={clearing || !snap?.caches.length}
            className="flex items-center justify-center gap-2 rounded-xl bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/25 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            مسح
          </button>
        </div>

        {/* بطاقة Service Worker */}
        <StatusCard
          title="Service Worker"
          ok={Boolean(snap?.scriptUrl)}
          items={[
            ["مدعوم", snap?.swSupported ? "نعم" : "لا"],
            ["مسجّل", snap?.scriptUrl ? "نعم" : "لا"],
            ["الحالة", snap?.registrationState ?? "—"],
            ["يتحكم بالصفحة", snap?.swController ? "نعم" : "لا"],
            ["Scope", snap?.registrationScope ?? "—"],
            ["Script", snap?.scriptUrl ? shorten(snap.scriptUrl) : "—"],
            ["الإصدار (من الكاش)", snap?.version ?? "—"],
          ]}
        />

        {/* بطاقة الاتصال */}
        <StatusCard
          title="الشبكة"
          ok={snap?.online ?? true}
          items={[
            ["الحالة", snap?.online ? "متصل" : "غير متصل"],
            ["آخر فحص", snap?.collectedAt ?? "—"],
          ]}
        />

        {/* بطاقة الكاشات */}
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-primary" />
              الكاشات المخزنة
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {snap ? `${snap.caches.length} كاش / ${snap.totalEntries} عنصر` : "…"}
            </span>
          </div>

          {!snap?.cachesSupported && (
            <EmptyRow
              icon={<XCircle className="h-4 w-4" />}
              text="Cache Storage غير مدعومة في هذا المتصفح."
            />
          )}
          {snap?.cachesSupported && snap.caches.length === 0 && (
            <EmptyRow
              icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
              text="لا يوجد أي محتوى مخزن بعد. افتح التطبيق مرة عبر الشبكة أولاً."
            />
          )}

          <ul className="space-y-2">
            {snap?.caches.map((c) => (
              <li key={c.name} className="rounded-xl border border-border/40 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="truncate text-xs text-foreground">{c.name}</code>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                    {c.size} عنصر
                  </span>
                </div>
                {c.sample.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                    {c.sample.map((s) => (
                      <li key={s} className="truncate" dir="ltr">
                        · {s}
                      </li>
                    ))}
                    {c.size > c.sample.length && (
                      <li className="text-[10px] opacity-60">
                        …و{c.size - c.sample.length} عنصر إضافي
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>

        <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
          ملاحظة: Service Worker لا يعمل داخل معاينة Lovable المدمجة — التشخيص الحقيقي يظهر بعد
          النشر أو داخل APK.
        </p>
      </div>
    </AppShell>
  );
}

function StatusCard({
  title,
  ok,
  items,
}: {
  title: string;
  ok: boolean;
  items: Array<[string, string]>;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        )}
        {title}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        {items.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate font-mono text-foreground" dir="ltr" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function EmptyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function shorten(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url;
  }
}
