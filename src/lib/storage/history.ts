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
}

const KEY = "nfc-history-v1";

export async function loadHistory(): Promise<HistoryEntry[]> {
  return (await get<HistoryEntry[]>(KEY)) || [];
}

export async function addHistory(entry: HistoryEntry) {
  const list = await loadHistory();
  list.unshift(entry);
  await set(KEY, list.slice(0, 200));
}

export async function saveHistory(list: HistoryEntry[]) {
  await set(KEY, list.slice(0, 500));
}

export async function clearHistory() {
  await set(KEY, []);
}
