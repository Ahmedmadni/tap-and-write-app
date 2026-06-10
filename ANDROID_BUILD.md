# تحويل التطبيق إلى APK عبر Android Studio

تم تجهيز المشروع باستخدام **Capacitor 8**. الخطوات التالية تتم على جهازك المحلي (ليس داخل Lovable).

## المتطلبات

- [Node.js 20+](https://nodejs.org/) و [Bun](https://bun.sh) (أو npm).
- [Android Studio](https://developer.android.com/studio) (أحدث إصدار).
- JDK 21 (يأتي مع Android Studio).
- جهاز Android حقيقي يدعم NFC + كيبل USB، أو محاكي (المحاكي لا يدعم NFC).

## الخطوات

### 1) صدّر المشروع من Lovable إلى GitHub
من زر **GitHub → Connect to GitHub** أعلى يمين Lovable، ثم استنسخ على جهازك:

```bash
git clone <repo-url>
cd <repo-folder>
bun install
```

### 2) أضف منصة Android لأول مرة فقط
```bash
bunx cap add android
```
سينشئ مجلد `android/` يحتوي مشروع Gradle جاهز.

### 3) زامن الإعدادات
كل مرة تعدّل فيها `capacitor.config.ts` أو تحدّث التطبيق:
```bash
bunx cap sync android
```

### 4) افتح في Android Studio
```bash
bunx cap open android
```
- انتظر Gradle Sync.
- وصّل هاتف Android (Developer mode + USB debugging مفعّلين).
- اضغط ▶️ **Run** أو **Build → Generate Signed Bundle/APK**.

### 5) إذن NFC
أضف هذا السطر داخل `android/app/src/main/AndroidManifest.xml` بين عناصر `<manifest>`:
```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

## ملاحظات مهمة

- **وضع التشغيل الحالي**: `capacitor.config.ts` يستخدم `server.url` يشير إلى
  `https://tap-and-write-app.lovable.app`. يعني التطبيق المثبّت سيحمّل الواجهة
  من الموقع المنشور مباشرة (مثل WebView). أي تحديث تنشره من Lovable سيظهر فوراً
  داخل APK بدون إعادة بناء.

- **Web NFC في WebView**: يعمل على Android 10+ مع System WebView محدّث (Chromium 89+).
  إذا واجهتك مشكلة `NDEFReader is not defined`، حدّث **Android System WebView** من
  متجر Play.

- **بناء offline كامل**: إذا أردت APK يعمل بدون إنترنت، نحتاج تحويل المشروع إلى
  SPA static (إزالة SSR من TanStack Start) ثم استبدال `server.url` بـ `webDir`.
  أخبرني إذا أردت ذلك.

- **توقيع APK**: للنشر على Play Store، أنشئ Keystore من Android Studio
  (**Build → Generate Signed Bundle/APK → Create new keystore**) واحفظه بأمان.

## التحقق من NFC
بعد التثبيت:
1. افتح التطبيق.
2. شاشة الرئيسية يجب أن تعرض "NFC مدعوم" (بدون شريط تحذير).
3. اضغط "قراءة" وقرّب بطاقة — يجب أن يظهر UID والسجلات.
