import { ExternalLink } from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";

/** تذكير هادئ بالصلاة على سيدنا محمد صلى الله عليه وسلم. */
export function SalawatBar() {
  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-center"
    >
      <p className="text-sm leading-relaxed text-foreground/90">
        اللهم صل وسلم وبارك على سيدنا محمد صلى الله عليه وسلم
      </p>
    </div>
  );
}

/** رابط المطور. */
export function DeveloperLink() {
  return (
    <a
      href="https://ahmedelmadni.com"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      <span>تطوير أحمد المدني</span>
    </a>
  );
}

/**
 * تذييل موحّد: مساحة إعلانية ← التذكير بالصلاة ← رابط المطور.
 * يُستخدم من مكان واحد فقط في كل صفحة.
 */
export function AppFooter({ adsDisabled = false }: { adsDisabled?: boolean }) {
  return (
    <footer dir="rtl" className="mt-8 space-y-3">
      <AdBanner disabled={adsDisabled} />
      <SalawatBar />
      <DeveloperLink />
    </footer>
  );
}
