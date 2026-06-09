// Web NFC ambient types (minimal subset)
declare global {
  interface NDEFRecordInit {
    recordType: string;
    mediaType?: string;
    id?: string;
    encoding?: string;
    lang?: string;
    data?: BufferSource | string | NDEFMessageInit;
  }
  interface NDEFMessageInit {
    records: NDEFRecordInit[];
  }
  interface NDEFRecord {
    recordType: string;
    mediaType?: string;
    id?: string;
    encoding?: string;
    lang?: string;
    data?: DataView;
    toRecords?(): NDEFRecord[];
  }
  interface NDEFMessage {
    records: NDEFRecord[];
  }
  interface NDEFReadingEvent extends Event {
    serialNumber: string;
    message: NDEFMessage;
  }
  interface NDEFReader extends EventTarget {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    write(
      message: string | BufferSource | NDEFMessageInit,
      options?: { overwrite?: boolean; signal?: AbortSignal },
    ): Promise<void>;
    makeReadOnly(options?: { signal?: AbortSignal }): Promise<void>;
    onreading: ((this: NDEFReader, ev: NDEFReadingEvent) => unknown) | null;
    onreadingerror: ((this: NDEFReader, ev: Event) => unknown) | null;
  }
  const NDEFReader: { prototype: NDEFReader; new (): NDEFReader };
}

export type RecordKind =
  | "text"
  | "url"
  | "wifi"
  | "vcard"
  | "email"
  | "sms"
  | "tel"
  | "geo"
  | "app"
  | "mime"
  | "external"
  | "empty";

export interface DraftRecord {
  id: string;
  kind: RecordKind;
  // Text
  text?: string;
  lang?: string;
  // URL / email / sms / tel / geo / app
  url?: string;
  email?: string;
  subject?: string;
  body?: string;
  phone?: string;
  message?: string;
  lat?: string;
  lng?: string;
  appPackage?: string;
  // WiFi
  ssid?: string;
  authType?: "WPA" | "WEP" | "nopass";
  password?: string;
  hidden?: boolean;
  // vCard
  vName?: string;
  vPhone?: string;
  vEmail?: string;
  vOrg?: string;
  vAddress?: string;
  // MIME / external
  mediaType?: string;
  externalType?: string;
  payload?: string;
}

export interface DecodedRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  lang?: string;
  encoding?: string;
  size: number;
  display: string;
  raw?: string;
}

export interface ScanResult {
  serialNumber: string;
  records: DecodedRecord[];
  timestamp: number;
}

export {};
