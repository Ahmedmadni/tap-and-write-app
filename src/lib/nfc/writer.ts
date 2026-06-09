import type { DraftRecord } from "./types";

function escVcard(s: string) {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildRecord(d: DraftRecord): NDEFRecordInit {
  switch (d.kind) {
    case "text":
      return {
        recordType: "text",
        lang: d.lang || "ar",
        data: d.text || "",
      };
    case "url":
      return { recordType: "url", data: d.url || "" };
    case "email": {
      const params = new URLSearchParams();
      if (d.subject) params.set("subject", d.subject);
      if (d.body) params.set("body", d.body);
      const q = params.toString();
      return {
        recordType: "url",
        data: `mailto:${d.email || ""}${q ? "?" + q : ""}`,
      };
    }
    case "sms":
      return {
        recordType: "url",
        data: `sms:${d.phone || ""}${d.message ? "?body=" + encodeURIComponent(d.message) : ""}`,
      };
    case "tel":
      return { recordType: "url", data: `tel:${d.phone || ""}` };
    case "geo":
      return { recordType: "url", data: `geo:${d.lat || "0"},${d.lng || "0"}` };
    case "app":
      // Android Application Record
      return {
        recordType: "android.com:pkg",
        data: new TextEncoder().encode(d.appPackage || ""),
      };
    case "wifi": {
      const ssid = d.ssid || "";
      const auth = d.authType || "WPA";
      const pwd = d.password || "";
      const h = d.hidden ? "true" : "false";
      const payload = `WIFI:T:${auth};S:${ssid};P:${pwd};H:${h};;`;
      return {
        recordType: "mime",
        mediaType: "application/vnd.wfa.wsc",
        data: new TextEncoder().encode(payload),
      };
    }
    case "vcard": {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escVcard(d.vName || "")}`,
        d.vOrg ? `ORG:${escVcard(d.vOrg)}` : "",
        d.vPhone ? `TEL:${escVcard(d.vPhone)}` : "",
        d.vEmail ? `EMAIL:${escVcard(d.vEmail)}` : "",
        d.vAddress ? `ADR:;;${escVcard(d.vAddress)};;;;` : "",
        "END:VCARD",
      ].filter(Boolean);
      return {
        recordType: "mime",
        mediaType: "text/vcard",
        data: new TextEncoder().encode(lines.join("\n")),
      };
    }
    case "mime":
      return {
        recordType: "mime",
        mediaType: d.mediaType || "text/plain",
        data: new TextEncoder().encode(d.payload || ""),
      };
    case "external":
      return {
        recordType: d.externalType || "example.com:custom",
        data: new TextEncoder().encode(d.payload || ""),
      };
    case "empty":
    default:
      return { recordType: "empty" };
  }
}

export function estimateSize(records: NDEFRecordInit[]): number {
  // rough overhead: 6 bytes header per record
  let total = 0;
  for (const r of records) {
    total += 6;
    if (typeof r.data === "string") total += new TextEncoder().encode(r.data).length;
    else if (r.data instanceof ArrayBuffer) total += r.data.byteLength;
    else if (ArrayBuffer.isView(r.data)) total += (r.data as ArrayBufferView).byteLength;
    if (r.mediaType) total += r.mediaType.length;
    if (r.lang) total += r.lang.length;
  }
  return total;
}
