import { get, set } from "idb-keyval";
import type { DecodedRecord, DraftRecord } from "@/lib/nfc/types";

export interface HistoryEntry {
  id: string;
  type: "read" | "write" | "erase" | "lock";
  timestamp: number;
  serialNumber?: string;
  records?: DecodedRecord[];
  drafts?: DraftRecord[];
  note?: string;
  /** مثبّت في أعلى القائمة إذا كان true. */
  pinned?: boolean;
  /** آخر وقت تم فيه تعديل ملاحظة/تثبيت (لأغراض الفرز الثانوي). */
  updatedAt?: number;
}

const KEY = "nfc-history-v1";

/** يُرجع السجل مرتباً: المثبّت أولاً ثم الأحدث. */
export async function loadHistory(): Promise<HistoryEntry[]> {
  const list = (await get<HistoryEntry[]>(KEY)) || [];
  return sortEntries(list);
}

function sortEntries(list: HistoryEntry[]): HistoryEntry[] {
  return [...list].sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.timestamp - a.timestamp;
  });
}

export async function addHistory(entry: HistoryEntry) {
  const list = (await get<HistoryEntry[]>(KEY)) || [];
  list.unshift(entry);
  await set(KEY, list.slice(0, 200));
}

export async function saveHistory(list: HistoryEntry[]) {
  await set(KEY, list.slice(0, 500));
}

export async function updateEntry(id: string, patch: Partial<HistoryEntry>) {
  const list = (await get<HistoryEntry[]>(KEY)) || [];
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const next = { ...list[idx], ...patch, updatedAt: Date.now() };
  list[idx] = next;
  await set(KEY, list);
  return next;
}

export async function removeEntries(ids: string[]) {
  const list = (await get<HistoryEntry[]>(KEY)) || [];
  const set2 = new Set(ids);
  const next = list.filter((e) => !set2.has(e.id));
  await set(KEY, next);
  return sortEntries(next);
}

export async function clearHistory() {
  await set(KEY, []);
}
