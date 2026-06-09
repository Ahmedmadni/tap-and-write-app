import { AlertTriangle, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { checkNfcSupport, type NfcSupport } from "@/lib/nfc/support";

export function SupportBanner() {
  const [s, setS] = useState<NfcSupport>({ status: "ssr" });
  useEffect(() => setS(checkNfcSupport()), []);

  if (s.status === "ok" || s.status === "ssr") return null;

  const isIframe = s.status === "iframe";
  return (
    <div
      className={`mb-4 flex gap-3 rounded-2xl border p-4 text-sm ${
        isIframe
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-destructive/40 bg-destructive/10 text-foreground"
      }`}
    >
      {isIframe ? (
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      )}
      <p className="leading-relaxed">{"message" in s ? s.message : ""}</p>
    </div>
  );
}
