/**
 * طبقة تجريد فوق Web NFC و Capacitor Native NFC.
 *
 * - داخل تطبيق Capacitor (Android/iOS): تستخدم plugin أصلي `@exxili/capacitor-nfc`.
 * - على المتصفح (Chrome Android): تستخدم NDEFReader القياسي (Web NFC).
 *
 * الاختيار تلقائي: لو `Capacitor.isNativePlatform()` صحيح والـ plugin متاح → native.
 */

import type { DecodedRecord, ScanResult } from "./types";
import { decodeRecord } from "./decoder";
import { setNfcBusy } from "./busy";

export type Platform = "web" | "native" | "unavailable";

type NativeRecord = { type: string; payload: number[] };
type NativeTagInfo = { uid?: string; techTypes?: string[]; maxSize?: number; type?: string };
type NativeReadData = {
  numberArray: () => { messages: { records: NativeRecord[] }[]; tagInfo?: NativeTagInfo };
};
type NativePlugin = {
  NFC: {
    isSupported: () => Promise<{ supported: boolean }>;
    startScan: (o?: { mode?: string }) => Promise<void>;
    cancelScan: () => Promise<void>;
    writeNDEF: (o: { records: { type: string; payload: Uint8Array }[]; rawMode?: boolean }) => Promise<void>;
    cancelWriteAndroid: () => Promise<void>;
    onRead: (cb: (d: NativeReadData) => void) => () => void;
    onWrite: (cb: () => void) => () => void;
    onError: (cb: (e: { error: string }) => void) => () => void;
  };
};

let cachedPlatform: Platform | null = null;
let cachedNativePlugin: NativePlugin | null = null;

async function tryLoadNativePlugin(): Promise<NativePlugin | null> {
  if (cachedNativePlugin) return cachedNativePlugin;
  try {
    if (typeof window === "undefined") return null;
    const capName = "@capacitor/core";
    const cap = await import(/* @vite-ignore */ capName).catch(() => null);
    const Capacitor = (cap as { Capacitor?: { isNativePlatform: () => boolean } } | null)
      ?.Capacitor;
    if (!Capacitor?.isNativePlatform?.()) return null;
    const pluginName = "@exxili/capacitor-nfc";
    const mod = (await import(/* @vite-ignore */ pluginName).catch(() => null)) as NativePlugin | null;
    if (!mod?.NFC) return null;
    cachedNativePlugin = mod;
    return mod;
  } catch {
    return null;
  }
}

export async function getPlatform(): Promise<Platform> {
  if (cachedPlatform) return cachedPlatform;
  if (typeof window === "undefined") return "unavailable";
  const native = await tryLoadNativePlugin();
  if (native) {
    cachedPlatform = "native";
    return "native";
  }
  if ("NDEFReader" in window) {
    cachedPlatform = "web";
    return "web";
  }
  cachedPlatform = "unavailable";
  return "unavailable";
}

export interface ReadOptions {
  signal?: AbortSignal;
  onReading: (r: ScanResult) => void;
  onError?: (err: unknown) => void;
}

const URI_PREFIXES = [
  "",
  "http://www.",
  "https://www.",
  "http://",
  "https://",
  "tel:",
  "mailto:",
];

/** يحوّل سجل أصلي (type + bytes) إلى DecodedRecord عبر decodeRecord الحالي. */
function nativeToDecoded(r: NativeRecord): DecodedRecord {
  const bytes = new Uint8Array(r.payload ?? []);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const t = r.type ?? "";
  if (t === "T" || t === "text") {
    // payload: [status(lang len)] [lang] [text]
    const langLen = bytes.length ? bytes[0] & 0x3f : 0;
    const body = bytes.subarray(1 + langLen);
    const lang = new TextDecoder().decode(bytes.subarray(1, 1 + langLen));
    return decodeRecord({
      recordType: "text",
      lang,
      data: new DataView(body.buffer, body.byteOffset, body.byteLength),
    } as NDEFRecord);
  }
  if (t === "U" || t === "url") {
    const idx = bytes.length ? bytes[0] : 0;
    const rest = new TextDecoder().decode(bytes.subarray(1));
    const full = (URI_PREFIXES[idx] ?? "") + rest;
    const enc = new TextEncoder().encode(full);
    return decodeRecord({
      recordType: "url",
      data: new DataView(enc.buffer, enc.byteOffset, enc.byteLength),
    } as NDEFRecord);
  }
  if (t.includes("/")) {
    return decodeRecord({ recordType: "mime", mediaType: t, data: view } as NDEFRecord);
  }
  return decodeRecord({ recordType: t || "unknown", data: view } as NDEFRecord);
}

async function startReadImpl(opts: ReadOptions): Promise<void> {
  const platform = await getPlatform();
  if (platform === "native") {
    const mod = cachedNativePlugin!;
    const offRead = mod.NFC.onRead((data) => {
      const parsed = data.numberArray();
      const records: DecodedRecord[] = [];
      for (const m of parsed.messages ?? []) {
        for (const r of m.records ?? []) records.push(nativeToDecoded(r));
      }
      opts.onReading({
        serialNumber: parsed.tagInfo?.uid ?? "",
        records,
        timestamp: Date.now(),
      });
    });
    const offErr = mod.NFC.onError((e) => opts.onError?.(new Error(e.error)));
    opts.signal?.addEventListener("abort", () => {
      offRead();
      offErr();
      mod.NFC.cancelScan().catch(() => {});
    });
    await mod.NFC.startScan();
    return;
  }
  if (platform === "web") {
    const reader = new NDEFReader();
    await reader.scan({ signal: opts.signal });
    reader.onreading = (e: NDEFReadingEvent) => {
      opts.onReading({
        serialNumber: e.serialNumber,
        records: e.message.records.map(decodeRecord),
        timestamp: Date.now(),
      });
    };
    reader.onreadingerror = () => opts.onError?.(new Error("read-error"));
    return;
  }
  throw new Error("NFC غير متاح على هذا الجهاز.");
}

function dataToBytes(data: NDEFRecordInit["data"]): Uint8Array {
  if (typeof data === "string") return new TextEncoder().encode(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    const v = data as ArrayBufferView;
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  return new Uint8Array();
}

/** يحوّل NDEFRecordInit (صيغة Web NFC) إلى سجل خام للـ plugin الأصلي. */
function toNativeRecord(r: NDEFRecordInit): { type: string; payload: Uint8Array } {
  const bytes = dataToBytes(r.data);
  if (r.recordType === "text") {
    const lang = new TextEncoder().encode((r.lang || "ar").slice(0, 63));
    const out = new Uint8Array(1 + lang.length + bytes.length);
    out[0] = lang.length; // UTF-8
    out.set(lang, 1);
    out.set(bytes, 1 + lang.length);
    return { type: "T", payload: out };
  }
  if (r.recordType === "url") {
    const full = typeof r.data === "string" ? r.data : new TextDecoder().decode(bytes);
    let idx = 0;
    let rest = full;
    for (let i = URI_PREFIXES.length - 1; i >= 1; i--) {
      if (full.startsWith(URI_PREFIXES[i])) {
        idx = i;
        rest = full.slice(URI_PREFIXES[i].length);
        break;
      }
    }
    const restBytes = new TextEncoder().encode(rest);
    const out = new Uint8Array(1 + restBytes.length);
    out[0] = idx;
    out.set(restBytes, 1);
    return { type: "U", payload: out };
  }
  if (r.recordType === "mime") {
    return { type: r.mediaType || "text/plain", payload: bytes };
  }
  if (r.recordType === "empty") {
    return { type: "", payload: new Uint8Array() };
  }
  return { type: r.recordType, payload: bytes };
}

async function writeRecordsImpl(
  records: NDEFRecordInit[],
  opts: { overwrite?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const platform = await getPlatform();
  if (platform === "native") {
    const mod = cachedNativePlugin!;
    const nativeRecords = records.map(toNativeRecord);
    await new Promise<void>((resolve, reject) => {
      const offWrite = mod.NFC.onWrite(() => {
        cleanup();
        resolve();
      });
      const offErr = mod.NFC.onError((e) => {
        cleanup();
        reject(new Error(e.error));
      });
      const onAbort = () => {
        cleanup();
        mod.NFC.cancelWriteAndroid().catch(() => {});
        reject(new DOMException("aborted", "AbortError"));
      };
      function cleanup() {
        offWrite();
        offErr();
        opts.signal?.removeEventListener("abort", onAbort);
      }
      opts.signal?.addEventListener("abort", onAbort);
      // rawMode: نُنسّق T/U يدوياً أعلاه، فنكتب البايتات كما هي.
      mod.NFC.writeNDEF({ records: nativeRecords, rawMode: true }).catch((err) => {
        cleanup();
        reject(err);
      });
    });
    return;
  }
  if (platform === "web") {
    const reader = new NDEFReader();
    await reader.write({ records }, { overwrite: opts.overwrite, signal: opts.signal });
    return;
  }
  throw new Error("NFC غير متاح على هذا الجهاز.");
}

async function makeReadOnlyImpl(opts: { signal?: AbortSignal } = {}): Promise<void> {
  const platform = await getPlatform();
  if (platform === "native") {
    throw new Error("قفل البطاقة غير مدعوم في وضع NFC الأصلي حالياً.");
  }
  if (platform === "web") {
    const reader = new NDEFReader();
    await reader.makeReadOnly({ signal: opts.signal });
    return;
  }
  throw new Error("NFC غير متاح على هذا الجهاز.");
}

/* ------------------------------------------------------------------
 * أغلفة تتبّع انشغال NFC — تُخفي الإعلانات أثناء أي عملية جارية.
 * ------------------------------------------------------------------ */

function releaseOnAbort(signal: AbortSignal | undefined, release: () => void) {
  if (!signal) return;
  if (signal.aborted) {
    release();
    return;
  }
  signal.addEventListener("abort", release, { once: true });
}

export async function startRead(opts: ReadOptions): Promise<void> {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    setNfcBusy(false);
  };
  setNfcBusy(true);
  releaseOnAbort(opts.signal, release);
  try {
    await startReadImpl({
      ...opts,
      onReading: opts.onReading,
    });
    if (!opts.signal) release();
  } catch (err) {
    release();
    throw err;
  }
}

export async function writeRecords(
  records: NDEFRecordInit[],
  opts: { overwrite?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  setNfcBusy(true);
  try {
    await writeRecordsImpl(records, opts);
  } finally {
    setNfcBusy(false);
  }
}

export async function makeReadOnly(opts: { signal?: AbortSignal } = {}): Promise<void> {
  setNfcBusy(true);
  try {
    await makeReadOnlyImpl(opts);
  } finally {
    setNfcBusy(false);
  }
}

