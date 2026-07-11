import { Nfc, X } from "lucide-react";
import { ScanScene3D } from "./ScanScene3D";

interface Props {
  label?: string;
  hint?: string;
  onCancel?: () => void;
}

export function ScanOverlay({ label = "قرّب البطاقة من الجهاز", hint, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="relative">
        <ScanScene3D />
        <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <Nfc className="h-3.5 w-3.5" />
            جاهز للمسح
          </div>
        </div>
      </div>
      <p className="mt-8 text-lg font-medium">{label}</p>
      {hint && <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">{hint}</p>}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-8 flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70"
        >
          <X className="h-4 w-4" />
          إلغاء
        </button>
      )}
    </div>
  );
}
