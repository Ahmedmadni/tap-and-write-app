import { Nfc, X } from "lucide-react";

interface Props {
  label?: string;
  hint?: string;
  onCancel?: () => void;
}

export function ScanOverlay({ label = "قرّب البطاقة من الجهاز", hint, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="absolute inset-6 animate-ping rounded-full bg-primary/30 [animation-delay:200ms]" />
        <span className="absolute inset-12 animate-pulse rounded-full bg-primary/40" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40">
          <Nfc className="h-12 w-12" />
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
