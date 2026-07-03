import type { DecodedRecord } from "./types";

function dvToString(data: DataView | undefined, encoding = "utf-8"): string {
  if (!data) return "";
  try {
    return new TextDecoder(encoding).decode(data);
  } catch {
    return new TextDecoder().decode(data);
  }
}

function dvToHex(data: DataView | undefined): string {
  if (!data) return "";
  const bytes: string[] = [];
  for (let i = 0; i < data.byteLength; i++) {
    bytes.push(data.getUint8(i).toString(16).padStart(2, "0"));
  }
  return bytes.join(" ");
}

/** WIFI:T:WPA;S:MySSID;P:pass;H:false;; → key/value dict */
function parseWifi(raw: string): Record<string, string> | null {
  if (!raw.startsWith("WIFI:")) return null;
  const out: Record<string, string> = {};
  const body = raw.slice(5).replace(/;;$/, "");
  for (const part of body.split(";")) {
    const i = part.indexOf(":");
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}

function formatWifiDisplay(raw: string): string {
  const w = parseWifi(raw);
  if (!w) return raw;
  const auth = w.T || "nopass";
  const lines = [
    `📶 WiFi: ${w.S || ""}`,
    `الحماية: ${auth}`,
    w.P ? `كلمة المرور: ${w.P}` : "",
    w.H === "true" ? "شبكة مخفية" : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function formatVCard(raw: string): string {
  const lines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^(FN|TEL|EMAIL|ORG|ADR|TITLE|URL)(;[^:]*)?:(.+)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[3].replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");
    const label =
      key === "FN"
        ? "الاسم"
        : key === "TEL"
          ? "الهاتف"
          : key === "EMAIL"
            ? "البريد"
            : key === "ORG"
              ? "الشركة"
              : key === "ADR"
                ? "العنوان"
                : key === "TITLE"
                  ? "المسمى"
                  : "الرابط";
    lines.push(`${label}: ${val.replace(/^;+|;+$/g, "").replace(/;+/g, " ")}`);
  }
  return lines.length ? "👤 vCard\n" + lines.join("\n") : raw;
}

function formatUriScheme(raw: string): string {
  if (raw.startsWith("mailto:")) {
    const [addr, query] = raw.slice(7).split("?");
    const params = new URLSearchParams(query || "");
    const parts = [`✉️ إلى: ${decodeURIComponent(addr)}`];
    if (params.get("subject")) parts.push(`الموضوع: ${params.get("subject")}`);
    if (params.get("body")) parts.push(`المحتوى: ${params.get("body")}`);
    return parts.join("\n");
  }
  if (raw.startsWith("tel:")) return `📞 ${raw.slice(4)}`;
  if (raw.startsWith("sms:")) {
    const [num, query] = raw.slice(4).split("?");
    const params = new URLSearchParams(query || "");
    const body = params.get("body");
    return body ? `💬 SMS إلى ${num}\n${decodeURIComponent(body)}` : `💬 SMS إلى ${num}`;
  }
  if (raw.startsWith("geo:")) {
    const [coords] = raw.slice(4).split("?");
    return `📍 الموقع: ${coords}`;
  }
  return raw;
}

export function decodeRecord(r: NDEFRecord): DecodedRecord {
  const size = r.data ? r.data.byteLength : 0;
  const base: DecodedRecord = {
    recordType: r.recordType,
    mediaType: r.mediaType,
    id: r.id,
    lang: r.lang,
    encoding: r.encoding,
    size,
    display: "",
  };

  switch (r.recordType) {
    case "text":
      base.display = dvToString(r.data, r.encoding || "utf-8");
      break;
    case "url":
    case "absolute-url": {
      const raw = dvToString(r.data);
      base.raw = raw;
      base.display = formatUriScheme(raw);
      break;
    }
    case "mime": {
      const mt = (r.mediaType || "").toLowerCase();
      const text = dvToString(r.data);
      if (mt === "application/vnd.wfa.wsc" || text.startsWith("WIFI:")) {
        base.display = formatWifiDisplay(text);
        base.raw = text;
      } else if (mt === "text/vcard" || mt === "text/x-vcard" || text.startsWith("BEGIN:VCARD")) {
        base.display = formatVCard(text);
        base.raw = text;
      } else if (mt.startsWith("text/") || mt === "application/json" || mt === "application/xml") {
        base.display = text;
      } else {
        base.display = `[${mt || "بيانات ثنائية"} — ${size} بايت]`;
        base.raw = dvToHex(r.data);
      }
      break;
    }
    case "smart-poster":
      base.display = "Smart Poster (سجلات فرعية)";
      break;
    case "empty":
      base.display = "[فارغ]";
      break;
    default: {
      // external / unknown / android.com:pkg
      const text = dvToString(r.data);
      if (r.recordType === "android.com:pkg") {
        base.display = `📱 تطبيق Android: ${text}`;
      } else {
        base.display = text || `[${size} بايت]`;
      }
      base.raw = dvToHex(r.data);
    }
  }
  return base;
}

/** Chip presets — user-facing capacities of common NFC Forum Type 2 tags. */
export interface ChipPreset {
  name: string;
  capacity: number; // usable NDEF bytes
}

export const CHIP_PRESETS: ChipPreset[] = [
  { name: "NTAG213", capacity: 137 },
  { name: "NTAG215", capacity: 480 },
  { name: "NTAG216", capacity: 872 },
  { name: "MIFARE Ultralight", capacity: 46 },
  { name: "MIFARE Classic 1K", capacity: 716 },
  { name: "MIFARE Classic 4K", capacity: 3356 },
  { name: "Topaz 512", capacity: 450 },
];

/** Rough chip family guess based on UID length (Web NFC returns colon-hex string). */
export function guessChipFromUid(uid: string): string {
  const bytes = uid.split(":").filter(Boolean).length;
  if (bytes === 7) return "NTAG21x / MIFARE Ultralight (UID بطول 7)";
  if (bytes === 4) return "MIFARE Classic (UID بطول 4)";
  if (bytes === 10) return "بطاقة بروتوكول موسّع (UID بطول 10)";
  return `بطاقة NFC (UID بطول ${bytes})`;
}
