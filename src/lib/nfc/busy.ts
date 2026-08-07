/**
 * حالة انشغال NFC (قراءة/كتابة/تهيئة/قفل).
 * الإعلانات تُخفى تلقائياً أثناء أي عملية NFC جارية، فالأولوية الكاملة للعملية.
 */
import { useSyncExternalStore } from "react";

let busyCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setNfcBusy(busy: boolean): void {
  busyCount = Math.max(0, busyCount + (busy ? 1 : -1));
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => busyCount > 0;
const getServerSnapshot = () => false;

export function useNfcBusy(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
