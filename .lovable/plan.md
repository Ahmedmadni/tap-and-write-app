# تطبيق NFC Reader/Writer — PWA

تطبيق ويب قابل للتثبيت على الهاتف (Add to Home Screen) لقراءة وكتابة بطاقات NFC باستخدام Web NFC API.

## ⚠️ ملاحظات مهمة قبل البدء

- **يعمل فقط على Chrome / Edge على Android** (Web NFC غير مدعوم على iOS أو على أي متصفح ديسكتوب).
- يدعم **NDEF فقط** (نصوص، روابط، WiFi، vCard، MIME). لا يدعم MIFARE Classic الخام أو محاكاة بطاقات البنوك.
- الجهاز لازم يكون فيه NFC مفعّل، والصفحة لازم تكون **HTTPS** (لينك Lovable يوفّر هذا).
- في وضع المعاينة داخل Lovable (iframe) NFC ما يشتغل — لازم تفتح الرابط مباشرة على متصفح الهاتف.

## الشاشات

1. **الرئيسية** — حالة دعم NFC على الجهاز + 4 أزرار كبيرة: قراءة، كتابة، تهيئة، قفل.
2. **شاشة القراءة** — تنتظر تقريب بطاقة، تعرض:
   - Serial Number (UID)
   - نوع البطاقة وحجم الذاكرة المتاح
   - قائمة السجلات (Records): النوع (text/url/wifi/vcard/mime/external)، اللغة، الحجم، المحتوى المُفكّك.
   - زر "نسخ" لكل سجل + زر "حفظ في السجل المحلي".
3. **شاشة الكتابة** — اختيار نوع المحتوى ثم تعبئة نموذج مخصص لكل نوع:
   - Text (مع تحديد اللغة)
   - URL / URI
   - WiFi (SSID, نوع الحماية, كلمة المرور, hidden)
   - vCard (اسم، هاتف، إيميل، عنوان)
   - Email (mailto مع subject/body)
   - SMS / Phone call
   - Geo location (lat/lng)
   - App launcher (Android package name)
   - Custom MIME / External type (raw bytes أو base64)
   - دعم **سجلات متعددة** على نفس البطاقة في كتابة واحدة.
   - معاينة الحجم المتوقع قبل الكتابة + تحذير لو تجاوز سعة البطاقة الشائعة.
4. **شاشة التهيئة (Erase/Format)** — كتابة سجل NDEF فارغ لمسح المحتوى.
5. **شاشة القفل (Make Read-Only)** — تحذير بأن العملية لا رجعة فيها + تأكيد + تنفيذ `makeReadOnly()`.
6. **السجل (History)** — كل عملية قراءة/كتابة محفوظة محلياً (IndexedDB) مع وقتها ونوعها، وإمكانية إعادة كتابة نفس المحتوى على بطاقة جديدة.
7. **الإعدادات** — اللغة (عربي/إنجليزي افتراضياً عربي RTL)، الوضع الداكن، مسح السجل.

## التفاصيل التقنية

**Stack**: TanStack Start (موجود) + Tailwind + shadcn/ui. كل المنطق client-side، لا حاجة لـ backend.

**Web NFC API**:
- `NDEFReader.scan()` للقراءة، event `reading` يرجع `message.records` + `serialNumber`.
- `NDEFReader.write({ records: [...] })` للكتابة.
- `NDEFReader.write({ records: [{ recordType: "empty" }] })` للتهيئة.
- `NDEFReader.makeReadOnly()` للقفل.
- جميع العمليات داخل `try/catch` مع رسائل خطأ عربية واضحة (NotAllowedError، NotSupportedError، NotReadableError، NetworkError).

**ملفات جديدة**:
```
src/
  routes/
    index.tsx                  (الشاشة الرئيسية — استبدال placeholder)
    read.tsx
    write.tsx
    erase.tsx
    lock.tsx
    history.tsx
    settings.tsx
  lib/nfc/
    support.ts                 (كشف دعم NFC + رسائل توجيهية)
    reader.ts                  (wrapper حول NDEFReader.scan)
    writer.ts                  (بناء records لكل نوع محتوى)
    decoder.ts                 (تفكيك payload حسب recordType)
    record-types.ts            (TypeScript types لكل نوع)
  lib/storage/
    history.ts                 (IndexedDB عبر idb-keyval)
  components/nfc/
    NfcSupportBanner.tsx
    ScanWaitingOverlay.tsx     (انيميشن انتظار البطاقة)
    RecordCard.tsx             (عرض سجل مقروء)
    RecordEditor.tsx           (محرر سجل للكتابة — switch حسب النوع)
public/
  manifest.webmanifest         (PWA — display: standalone)
  icon-192.png, icon-512.png, apple-touch-icon.png
```

**PWA (manifest-only، بدون service worker حسب توجيهات Lovable)**:
- `manifest.webmanifest` مع `display: standalone`، اسم التطبيق، theme color، أيقونات.
- إضافة `<link rel="manifest">` و `<meta name="theme-color">` و `apple-touch-icon` في `__root.tsx`.
- توليد أيقونات التطبيق عبر imagegen.

**الديزاين**:
- عربي RTL افتراضياً مع toggle للإنجليزي.
- ألوان: خلفية داكنة، أزرار كبيرة (touch-friendly)، أيقونات Lucide (Nfc, Radio, Edit3, Trash2, Lock).
- انيميشن "موجة" أثناء انتظار البطاقة.
- شاشات مُحسّنة للموبايل (mobile-first، أزرار full-width، خطوط واضحة).

## ما لن يتم تنفيذه (خارج قدرات Web NFC)

- قراءة/كتابة بطاقات البنوك (EMV) أو الجوازات.
- MIFARE Classic sectors / DESFire authentication / Ultralight pages الخام.
- محاكاة البطاقة (HCE).
- iOS — لا يوجد Web NFC. لو احتجته لاحقاً، نحتاج تحويل المشروع لـ Capacitor وبناء IPA محلياً.

سأخبرك بعد البناء كيف تفتح التطبيق على هاتف Android وتثبّته كأيقونة.
