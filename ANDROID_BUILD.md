# دليل تحويل التطبيق إلى APK عبر Android Studio (تفصيلي)

> **تحديث مهم:** مجلد `android/` أصبح مُنشأً ومُهيّأً داخل المشروع، فلا حاجة لـ `cap add android`.
> - اسم التطبيق: **NFC PRO**
> - Package ID: **com.ahmedmadni.nfcpro**
> - Version Name: **0.01** — Version Code: **1**
> - صلاحيات NFC مضافة مسبقاً في `AndroidManifest.xml` مع `nfc_tech_filter.xml`.
> - NFC الأصلي مفعّل عبر plugin `@exxili/capacitor-nfc` (يعمل تلقائياً داخل التطبيق، وWeb NFC داخل المتصفح).
> - التطبيق يعمل من ملفات محلية داخل الحزمة (بدون `server.url`).
>
> **بعد أي تعديل:**
> ```bash
> bun install
> bun run build:mobile      # vite build + cap sync android
> bunx cap open android
> ```
> بناء Debug: `cd android && ./gradlew assembleDebug`
> بناء Release: `cd android && ./gradlew assembleRelease` (بعد ضبط التوقيع)


> هذا الدليل يفترض أنك **لم تستخدم Android Studio من قبل**. كل خطوة مشروحة بالتفصيل.
> النظام: Windows / macOS / Linux — الأوامر متشابهة.

---

## الجزء 0 — تجهيز الجهاز (مرة واحدة فقط)

### 0.1 تثبيت Node.js
1. ادخل https://nodejs.org/ وحمّل **LTS (20 أو أحدث)**.
2. ثبّت بالخيارات الافتراضية.
3. تحقق:
   ```bash
   node -v
   npm -v
   ```
   لازم يطبع رقم إصدار. لو ما طبع، أعد فتح Terminal/CMD.

### 0.2 تثبيت Bun (اختياري لكن مستخدم بالأوامر هنا)
- Windows (PowerShell):
  ```powershell
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```
- macOS / Linux:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- تحقق: `bun -v`
- لو ما تبي Bun، استبدل كل `bun`/`bunx` بـ `npm`/`npx` في كل الأوامر.

### 0.3 تثبيت Git
- https://git-scm.com/downloads → ثبّت الافتراضي.
- تحقق: `git --version`.

### 0.4 تثبيت Android Studio
1. https://developer.android.com/studio → **Download Android Studio**.
2. شغّل المثبّت بالخيارات الافتراضية (يحمّل ~3 جيجا).
3. أول تشغيل: اختر **Standard** → **Next** → يحمّل SDK + Emulator + JDK.
4. بعد ما يخلص، من الشاشة الترحيبية (**Welcome to Android Studio**):
   - اضغط **More Actions** → **SDK Manager**.
   - تبويب **SDK Platforms**: فعّل **Android 14 (UpsideDownCake, API 34)** على الأقل.
   - تبويب **SDK Tools**: تأكد مفعّل:
     - Android SDK Build-Tools
     - Android SDK Platform-Tools
     - Android SDK Command-line Tools (latest)
   - **Apply** → انتظر التحميل.

### 0.5 ضبط متغيرات البيئة (Environment Variables)
Capacitor يحتاج يعرف وين SDK و JDK.

**مسار SDK الافتراضي:**
- Windows: `C:\Users\<اسمك>\AppData\Local\Android\Sdk`
- macOS: `~/Library/Android/sdk`
- Linux: `~/Android/Sdk`

**مسار JDK المرفق مع Android Studio:**
- Windows: `C:\Program Files\Android\Android Studio\jbr`
- macOS: `/Applications/Android Studio.app/Contents/jbr/Contents/Home`
- Linux: `/opt/android-studio/jbr`

**Windows** (System Properties → Environment Variables → New):
- `ANDROID_HOME` = مسار SDK أعلاه
- `JAVA_HOME` = مسار JDK أعلاه
- أضف لـ **Path**:
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\cmdline-tools\latest\bin`
  - `%JAVA_HOME%\bin`

**macOS / Linux** (أضف في `~/.zshrc` أو `~/.bashrc`):
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"   # أو ~/Android/Sdk على Linux
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```
ثم `source ~/.zshrc` (أو أعد فتح Terminal).

**تحقق:**
```bash
adb --version
java -version
```
لازم يطبعوا أرقام إصدارات. لو طلع `command not found`، راجع المسارات أعلاه.

### 0.6 تجهيز الهاتف
1. على الهاتف: **Settings → About phone** → اضغط **Build number** 7 مرات حتى يقول "You are now a developer".
2. **Settings → System → Developer options** → فعّل **USB debugging**.
3. وصّل الهاتف بالكيبل → اقبل **Allow USB debugging** على شاشته.
4. من جهازك: `adb devices` — لازم يطلع جهازك مع `device` بجانبه.
5. تأكد أن **NFC مفعّل** في **Settings → Connected devices → NFC**.
6. حدّث **Android System WebView** من Google Play (مهم جداً، Web NFC يحتاج Chromium 89+).

---

## الجزء 1 — جلب المشروع من Lovable

### 1.1 ربط GitHub
1. في Lovable أعلى يمين: اضغط **GitHub** → **Connect to GitHub**.
2. وافق على الصلاحيات → سيُنشأ repo باسم المشروع.

### 1.2 استنساخ المشروع
في Terminal على جهازك، اختر مجلد:
```bash
cd ~/Projects        # أو أي مجلد
git clone https://github.com/<حسابك>/<اسم-المشروع>.git
cd <اسم-المشروع>
bun install
```

تحقق أن الملفات موجودة:
```bash
ls capacitor.config.ts   # لازم يطلع موجود
```

---

## الجزء 2 — إضافة منصة Android (مرة واحدة)

### 2.1 إضافة Android
```bash
bunx cap add android
```
ينشئ مجلد `android/` فيه مشروع Gradle كامل.

### 2.2 إضافة أذونات NFC
افتح الملف: `android/app/src/main/AndroidManifest.xml`

ابحث عن سطر `<manifest ...>` في الأعلى، وأضف **بعده مباشرة** (قبل `<application>`):
```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 2.3 مزامنة Capacitor
كل مرة تعدّل فيها أي شيء (الـ `capacitor.config.ts` أو السحب من Lovable):
```bash
bunx cap sync android
```

---

## الجزء 3 — فتح المشروع في Android Studio

### 3.1 الفتح
```bash
bunx cap open android
```
أو يدوياً: افتح Android Studio → **Open** → اختر مجلد `android/` داخل مشروعك.

### 3.2 انتظر Gradle Sync
- شريط أسفل يقول **Gradle: Building...** أو **Indexing...**.
- أول مرة قد تأخذ **10-20 دقيقة** (يحمّل dependencies).
- لو ظهر زر **Sync Now** في الأعلى، اضغطه.
- إن طلع خطأ "Install missing platform" — اضغط الرابط واقبل.

### 3.3 شغّل التطبيق على هاتفك
1. تأكد الهاتف موصول و `adb devices` يعرضه.
2. أعلى Android Studio، بجانب زر ▶️ Run، اختر اسم هاتفك من القائمة المنسدلة.
3. اضغط ▶️ **Run 'app'** (أو `Shift+F10`).
4. أول مرة يبني ~2-5 دقائق. APK يثبّت تلقائياً ويفتح على هاتفك.

### 3.4 التحقق من NFC
1. على الهاتف: شاشة الرئيسية يجب أن تعرض الأزرار الأربعة بدون شريط تحذير أحمر.
2. اضغط **قراءة** → قرّب بطاقة NFC → يجب أن يظهر UID والسجلات.
3. لو ظهر "متصفحك لا يدعم Web NFC": حدّث **Android System WebView** من Play.

---

## الجزء 4 — بناء APK للتوزيع

### 4.1 إنشاء Keystore (مرة واحدة، احفظه!)
في Android Studio: **Build → Generate Signed Bundle / APK**:
1. اختر **APK** → **Next**.
2. **Create new...** تحت Key store path:
   - Key store path: اختر مكان آمن (مثلاً `~/keys/nfctools.jks`).
   - Password: ضع كلمة مرور قوية واحفظها.
   - Alias: `nfctools`
   - Validity: `25` سنة.
   - املأ Name/Org/Country.
   - **OK**.
3. **Next** → اختر **release** → اضغط **Finish**.

> ⚠️ **احفظ ملف `.jks` وكلمة المرور في مكان آمن**. لو فقدت، ما تقدر تحدّث APK لاحقاً.

### 4.2 موقع APK الناتج
بعد البناء يظهر إشعار **APK(s) generated successfully**. الموقع:
```
android/app/release/app-release.apk
```
انقله للهاتف عبر USB أو Drive وثبّته (فعّل **Install from unknown sources** في الإعدادات).

### 4.3 للتحديثات المستقبلية (Offline build — المرحلة 4)
كلما عدّلت التطبيق في Lovable:
```bash
git pull
bun install
bun run build:mobile     # يبني SPA static + cap sync android
```
ثم في Android Studio: **Build → Generate Signed Bundle / APK** مرة أخرى (نفس الـ keystore).

> ✅ **الوضع الحالي (Offline كامل + Service Worker)**:
> - `capacitor.config.ts` بدون `server.url` و `webDir: "dist/public"`.
> - `vite.config.ts` يعمل prerender لكل المسارات إلى ملفات HTML ثابتة.
> - `public/sw.js` هو Service Worker مُخصّص يخزّن الـ App Shell عند أول تشغيل،
>   ويقدّم HTML عبر NetworkFirst، والأصول عبر CacheFirst.
> - داخل Capacitor WebView على Android، السكيمة تكون `https://localhost` — وهي
>   من الأصول الآمنة (Secure Origin) لذلك تسجيل الـ Service Worker يعمل بشكل طبيعي،
>   ما يعني أن التطبيق يعمل **بدون إنترنت** حتى بعد إعادة تشغيل الجهاز.
> - التسجيل يتم من `src/lib/pwa/register.ts` مع حماية لمنع تفعيله داخل معاينة Lovable.
> - أي تعديل يتطلب `bun run build:mobile` + إعادة بناء APK.


---

## أخطاء شائعة وحلولها


| الخطأ | الحل |
|------|------|
| `SDK location not found` | تأكد من `ANDROID_HOME` في الجزء 0.5 |
| `JAVA_HOME is not set` | راجع 0.5، استخدم JBR المرفق مع Android Studio |
| `adb: no devices` | كيبل USB سيء، أو USB debugging غير مفعّل، أو ما قبلت RSA prompt |
| `Gradle sync failed` | **File → Invalidate Caches → Invalidate and Restart** |
| `NDEFReader is not defined` داخل التطبيق | حدّث **Android System WebView** من Play |
| `Cleartext HTTP traffic not permitted` | لا تستخدم http://، فقط https:// |
| `Installation blocked` على الهاتف | فعّل تثبيت من مصادر غير معروفة لتطبيق الملفات |
| `dist/public not found` عند `cap sync` | نفّذ `bun run build` أولاً |

---


## المرحلة 3 — تفعيل Native NFC (اختياري)

التطبيق الآن يستخدم طبقة تجريد `src/lib/nfc/adapter.ts` تختار تلقائياً:
- **Web NFC** (NDEFReader) داخل Chrome/WebView — الوضع الافتراضي.
- **Native NFC** عبر Capacitor plugin — عند تثبيته.

### خطوات تفعيل Native NFC

داخل مجلد المشروع (بعد سحبه من GitHub):

```bash
bun add @capawesome-team/capacitor-nfc
bunx cap sync android
```

ثم افتح `android/app/src/main/AndroidManifest.xml` وتأكد من:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

لفتح التطبيق تلقائياً عند مسح بطاقة من خارجه، أضِف داخل `<activity>` الرئيسي:

```xml
<intent-filter>
  <action android:name="android.nfc.action.NDEF_DISCOVERED" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="text/plain" />
</intent-filter>
```

بعد ذلك، الـ adapter سيكتشف الـ plugin ويستخدمه تلقائياً — لا حاجة لتغيير أي كود.

### ملاحظة عن `server.url`

`capacitor.config.ts` حالياً يشير إلى `https://tap-and-write-app.lovable.app`. الـ plugin الأصلي
قد لا يعمل بشكل موثوق مع WebView خارجي المصدر. للاستفادة الكاملة من Native NFC، حوّل التطبيق
لبناء SPA offline:

1. احذف `server.url` من `capacitor.config.ts`.
2. `bun run build` (يبني إلى `dist/public`).
3. `bunx cap sync android`.
4. أعِد بناء APK من Android Studio.
