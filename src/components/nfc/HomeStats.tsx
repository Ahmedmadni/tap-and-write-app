import { useEffect, useState } from "react";
import { ScanLine, Edit3, Clock } from "lucide-react";
import { loadHistory } from "@/lib/storage/history";

interface Stats {
  reads: number;
  writes: number;
  total: number;
  lastAt: number | null;
}

export function HomeStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadHistory().then((list) => {
      if (cancelled) return;
      setStats({
        reads: list.filter((e) => e.type === "read").length,
        writes: list.filter((e) => e.type === "write").length,
        total: list.length,
        lastAt: list[0]?.timestamp ?? null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats || stats.total === 0) return null;

  const relTime = stats.lastAt ? formatRelative(stats.lastAt) : "—";

  return (
    <section className="mt-4 grid grid-cols-3 gap-2">
      <StatTile icon={ScanLine} value={stats.reads} label="قراءة" />
      <StatTile icon={Edit3} value={stats.writes} label="كتابة" />
      <StatTile icon={Clock} value={relTime} label="آخر عملية" small />
    </section>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
  small,
}: {
  icon: typeof ScanLine;
  value: number | string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card p-3 text-center">
      <Icon className="h-4 w-4 text-primary" />
      <p
        className={`font-semibold text-foreground ${small ? "text-xs" : "text-lg"}`}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `منذ ${hr} س`;
  const day = Math.round(hr / 24);
  return `منذ ${day} ي`;
}
