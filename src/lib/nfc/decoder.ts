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
    case "absolute-url":
      base.display = dvToString(r.data);
      break;
    case "mime": {
      const mt = (r.mediaType || "").toLowerCase();
      if (mt.startsWith("text/") || mt === "application/json" || mt === "application/xml") {
        base.display = dvToString(r.data);
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
    default:
      // external / unknown
      base.display = dvToString(r.data) || `[${size} بايت]`;
      base.raw = dvToHex(r.data);
  }
  return base;
}
