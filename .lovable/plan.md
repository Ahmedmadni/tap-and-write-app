# خطة تطوير تطبيق NFC Tools

## تم إنجازه ✓
- المرحلة 1: تحسين كتابة/قراءة + معاينة حجم + معاجلات WiFi/vCard/إلخ.
- المرحلة 2: سجل مع بحث/فلترة/تصدير/استيراد + إعادة كتابة.
- المرحلة 3: طبقة تجريد `adapter.ts` تدعم Web NFC + Capacitor Native NFC (dynamic).

## الوضع الحالي
- التطبيق يعمل كـ PWA على Chrome Android عبر Web NFC.
- Capacitor مُهيّأ بوضع `server.url` يشير إلى الرابط المنشور — أي APK يبنيه المستخدم يعرض التطبيق من Lovable مباشرة.
- الشاشات الأساسية موجودة: قراءة، كتابة، تهيئة، قفل، سجل، إعدادات.
- دليل بناء APK تفصيلي جاهز في `ANDROID_BUILD.md`.

## أهداف التطوير المقترحة (مقسّمة لمراحل)

### المرحلة 1 — تحسين تجربة الكتابة والقراءة
- **سجلات متعددة في كتابة واحدة**: إضافة/حذف/ترتيب عدة records قبل الكتابة (الشاشة الحالية تكتب record واحد).
- **معاينة الحجم المتوقع**: عرض bytes قبل الكتابة + تحذير عند تجاوز سعات شائعة (NTAG213: 144B, NTAG215: 504B, NTAG216: 888B).
- **تحسين شاشة القراءة**: عرض نوع الشريحة المخمّن (NTAG21x) من حجم الـ UID، زر نسخ لكل حقل، عرض hex الخام.
- **تفكيك أفضل**: دعم قراءة WiFi credentials (application/vnd.wfa.wsc) و vCard و mailto/tel/sms/geo وعرضها بشكل منظم بدل النص الخام.

### المرحلة 2 — ميزات السجل (History)
- تصفية حسب النوع (قراءة/كتابة) والتاريخ.
- **إعادة كتابة** من عنصر سجل سابق على بطاقة جديدة بضغطة واحدة.
- **تصدير/استيراد** السجل كـ JSON.
- بحث نصي داخل محتوى السجلات.

### المرحلة 3 — Capacitor Native NFC (اختياري لكن قوي)
> يفتح إمكانيات تتجاوز Web NFC.

- تثبيت plugin مثل `@capgo/capacitor-nfc` أو `capacitor-nfc-plus`.
- طبقة تجريد: `lib/nfc/adapter.ts` تختار Web NFC أو Native NFC حسب البيئة (`Capacitor.isNativePlatform()`).
- إمكانيات إضافية على Native:
  - قراءة UID لبطاقات غير-NDEF (MIFARE Classic/Ultralight/DESFire — UID فقط).
  - قراءة/كتابة MIFARE Ultralight/NTAG على مستوى الصفحات (raw pages).
  - دعم iOS (Core NFC — قراءة NDEF فقط، الكتابة محدودة).
- **ملاحظة**: يتطلب إزالة `server.url` من `capacitor.config.ts` والانتقال لبناء SPA static حتى يعمل الـ plugin داخل WebView المحلي.

### المرحلة 4 — تجهيز APK مستقل (offline build)
- تحويل من TanStack Start SSR → SPA static export (`prerender: true` لكل المسارات، أو التحويل لـ Vite SPA عادي).
- تحديث `capacitor.config.ts`: حذف `server.url`، الإبقاء على `webDir: "dist/public"`.
- سكربت `bun run build && bunx cap sync android`.
- تحديث `ANDROID_BUILD.md` بخطوات البناء offline.

### المرحلة 5 — تلميع وتوزيع
- **أيقونة تطبيق احترافية**: توليد `ic_launcher` بأحجام Android (mdpi→xxxhdpi) عبر imagegen + نسخها لـ `android/app/src/main/res/mipmap-*`.
- **Splash screen** عبر `@capacitor/splash-screen`.
- **Deep linking**: فتح التطبيق تلقائياً عند مسح بطاقة NFC من خارج التطبيق (intent-filter لـ `NDEF_DISCOVERED`).
- ترجمة كاملة عربي/إنجليزي (i18n خفيف).
- Dark mode toggle في الإعدادات.

---

## قبل ما أبدأ، احتاج قرارك على 3 نقاط

**1. أولوية المراحل**: أبدأ بالمرحلة 1 (تحسين UX الحالي) أم المرحلة 3 (Native NFC لفتح ميزات جديدة)؟

**2. Native NFC**: هل تريد الانتقال لـ Capacitor NFC plugin؟ (يعني إعادة هيكلة + بناء offline لكن يفتح iOS + بطاقات غير-NDEF).

**3. نطاق iOS**: هل يهمك دعم iPhone لاحقاً؟ لو نعم → المرحلة 3 ضرورية. لو لا → نبقى على Android/Web NFC ونركّز على المراحل 1، 2، 5.

أخبرني اختيارك أو قل "نفّذ الكل بالترتيب" وأبدأ من المرحلة 1.
