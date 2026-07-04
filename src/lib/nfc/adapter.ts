/**
 * طبقة تجريد فوق Web NFC و Capacitor Native NFC.
 *
 * - على المتصفح (Chrome/Android): تستخدم NDEFReader القياسي.
 * - داخل تطبيق Capacitor: تحاول تحميل plugin `@capawesome-team/capacitor-nfc`
 *   ديناميكياً. لو غير مثبّت، ترجع تلقائياً لـ Web NFC (لأن WebView
 *   على Android 10+ يدعم NDEFReader بشكل جيد عادةً).
 *
 * لتفعيل الطبقة الأصلية بالكامل:
 *   bun add @capawesome-team/capacitor-nfc
 *   bunx cap sync android
 *
 * ثم استخدم الأداة كما هي — الكود يكتشف الـ plugin تلقائياً.
 */

import type { DecodedRecord, ScanResult } from "./types";
import { decodeRecord } from "./decoder";

export type Platform = "web" | "native" | "unavailable";

let cachedPlatform: Platform | null = null;
let cachedNativePlugin: unknown = null;

async function tryLoadNativePlugin(): Promise<unknown> {
  if (cachedNativePlugin) return cachedNativePlugin;
  try {
    const capName = "@capacitor/core";
    const cap = await import(/* @vite-ignore */ capName).catch(() => null);
    const Capacitor = (cap as { Capacitor?: { isNativePlatform: () => boolean } } | null)
      ?.Capacitor;
    if (!Capacitor?.isNativePlatform?.()) return null;
    // dynamic — الـ plugin قد لا يكون مثبّتاً بعد
    const pluginName = "@capawesome-team/capacitor-nfc";
    const mod = await import(/* @vite-ignore */ pluginName).catch(() => null);
    if (!mod) return null;
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

export async function startRead(opts: ReadOptions): Promise<void> {
  const platform = await getPlatform();
  if (platform === "native") {
    const mod = cachedNativePlugin as {
      Nfc: {
        startScanSession: (o?: unknown) => Promise<void>;
        stopScanSession: () => Promise<void>;
        addListener: (
          ev: string,
          cb: (e: { nfcTag?: { id?: number[]; message?: { records?: unknown[] } } }) => void,
        ) => Promise<{ remove: () => void }>;
      };
    };
    const handle = await mod.Nfc.addListener("nfcTagScanned", (e) => {
      const uidBytes = e.nfcTag?.id ?? [];
      const uid = uidBytes.map((b) => b.toString(16).padStart(2, "0")).join(":");
      const rawRecords = (e.nfcTag?.message?.records ?? []) as Array<{
        type?: number[];
        payload?: number[];
        typeNameFormat?: number;
      }>;
      const decoded: DecodedRecord[] = rawRecords.map((r) => {
        const type = r.type ? new TextDecoder().decode(new Uint8Array(r.type)) : "";
        const payload = r.payload ? new Uint8Array(r.payload) : new Uint8Array();
        return decodeRecord({
          recordType: type || "unknown",
          data: new DataView(payload.buffer),
        } as NDEFRecord);
      });
      opts.onReading({
        serialNumber: uid,
        records: decoded,
        timestamp: Date.now(),
      });
    });
    opts.signal?.addEventListener("abort", () => {
      handle.remove();
      mod.Nfc.stopScanSession().catch(() => {});
    });
    await mod.Nfc.startScanSession();
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

export async function writeRecords(
  records: NDEFRecordInit[],
  opts: { overwrite?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const platform = await getPlatform();
  if (platform === "native") {
    const mod = cachedNativePlugin as {
      Nfc: {
        write: (o: { message: { records: unknown[] } }) => Promise<void>;
        startScanSession: () => Promise<void>;
        stopScanSession: () => Promise<void>;
      };
    };
    // تحويل السجلات لصيغة plugin الأصلية (تقريبية — قد تحتاج تعديل حسب الـ API)
    const nativeRecords = records.map((r) => ({
      type: Array.from(new TextEncoder().encode(r.recordType)),
      payload:
        typeof r.data === "string"
          ? Array.from(new TextEncoder().encode(r.data))
          : r.data instanceof ArrayBuffer
            ? Array.from(new Uint8Array(r.data))
            : ArrayBuffer.isView(r.data)
              ? Array.from(
                  new Uint8Array(
                    (r.data as ArrayBufferView).buffer,
                    (r.data as ArrayBufferView).byteOffset,
                    (r.data as ArrayBufferView).byteLength,
                  ),
                )
              : [],
    }));
    await mod.Nfc.startScanSession();
    try {
      await mod.Nfc.write({ message: { records: nativeRecords } });
    } finally {
      await mod.Nfc.stopScanSession().catch(() => {});
    }
    return;
  }
  if (platform === "web") {
    const reader = new NDEFReader();
    await reader.write({ records }, { overwrite: opts.overwrite, signal: opts.signal });
    return;
  }
  throw new Error("NFC غير متاح على هذا الجهاز.");
}

export async function makeReadOnly(opts: { signal?: AbortSignal } = {}): Promise<void> {
  const platform = await getPlatform();
  if (platform === "native") {
    const mod = cachedNativePlugin as {
      Nfc: {
        makeReadOnly?: () => Promise<void>;
        startScanSession: () => Promise<void>;
        stopScanSession: () => Promise<void>;
      };
    };
    if (!mod.Nfc.makeReadOnly) throw new Error("قفل البطاقة غير مدعوم على هذا الـ plugin.");
    await mod.Nfc.startScanSession();
    try {
      await mod.Nfc.makeReadOnly();
    } finally {
      await mod.Nfc.stopScanSession().catch(() => {});
    }
    return;
  }
  if (platform === "web") {
    const reader = new NDEFReader();
    await reader.makeReadOnly({ signal: opts.signal });
    return;
  }
  throw new Error("NFC غير متاح على هذا الجهاز.");
}
