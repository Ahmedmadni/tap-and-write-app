/**
 * التحقق من اشتراكات Google Play عبر Google Play Developer API (خادم فقط).
 *
 * يتطلب سر المشروع: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
 * (مفتاح حساب خدمة JSON مرتبط بحساب Google Play وله صلاحية "View financial data / Manage orders").
 */
import { PLAY_PACKAGE_NAME } from "./products";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"];
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON غير مضبوط");
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) throw new Error("مفتاح حساب الخدمة غير صالح");
  return parsed;
}

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  );
  const assertion = `${header}.${claim}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`فشل مصادقة Google: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export interface PlaySubscriptionState {
  active: boolean;
  state: string;
  expiryTime: string | null;
  basePlanId: string | null;
  linkedPurchaseToken: string | null;
  acknowledged: boolean;
}

/** قراءة حالة الاشتراك من Google Play باستخدام purchaseToken. */
export async function getSubscriptionState(purchaseToken: string): Promise<PlaySubscriptionState> {
  const token = await getAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`فشل التحقق من الشراء: ${res.status} ${await res.text()}`);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = (await res.json()) as any;
  const line = data.lineItems?.[0] ?? {};
  const state: string = data.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED";
  const expiry: string | null = line.expiryTime ?? null;
  const active =
    (state === "SUBSCRIPTION_STATE_ACTIVE" ||
      state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" ||
      state === "SUBSCRIPTION_STATE_CANCELED") &&
    (!expiry || new Date(expiry).getTime() > Date.now());

  return {
    active,
    state,
    expiryTime: expiry,
    basePlanId: line.offerDetails?.basePlanId ?? null,
    linkedPurchaseToken: data.linkedPurchaseToken ?? null,
    acknowledged: data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
  };
}

/** إقرار استلام الشراء (Google Play يلغي الشراء غير المُقَر خلال 3 أيام). */
export async function acknowledgeSubscription(
  productId: string,
  purchaseToken: string,
): Promise<void> {
  const token = await getAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: "{}",
  });
  if (!res.ok && res.status !== 400) {
    throw new Error(`فشل إقرار الشراء: ${res.status} ${await res.text()}`);
  }
}
