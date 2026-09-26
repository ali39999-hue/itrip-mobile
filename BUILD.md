# iTrip Mobile — Production Build & Hardening Guide

این سند مسیر کامل تبدیل اپ فعلی (که با `expo-sqlite` و بدون توکن FCM اجرا می‌شود) به نسخه production با رمزنگاری SQLCipher، push notification واقعی و خروجی امضاشده است.

---

## ۰. وضعیت فعلی (قبلاً انجام شده)

| مورد | وضعیت |
|---|---|
| `expo prebuild` | ✅ انجام شد — پروژه نیتیو در [`android/`](android/) |
| AndroidManifest با FCM + permissions | ✅ خودکار توسط config plugins |
| Backup rules امنیتی (secure-store) | ✅ `@xml/secure_store_backup_rules` |
| New Architecture (Fabric + Hermes) | ✅ `newArchEnabled: true` |
| Quality gates (typecheck/tests/i18n) | ✅ `npm run verify` |

---

## ۱. پیش‌نیازهای toolchain (یک‌بار)

اپ **بدون** Android SDK هم کامپایل می‌شود (داخل Expo Go یا dev-client ابری)، اما برای خروجی AAB/APK واقعی لازم است:

```bash
# JDK 17 (پیش‌نیاز Gradle 8)
# Android SDK + NDK (از Android Studio یا command-line tools)
# سپس:
setx ANDROID_HOME "C:\Users\Lenovo\AppData\Local\Android\Sdk"
# adb را به PATH اضافه کنید
```

سپس تأیید نصب:

```bash
java --version    # باید 17.x باشد
adb --version     # باید کار کند
npx expo doctor   # گزارش کامل سلامت محیط
```

> **توجه:** در این سیستم `java` و `adb` فعلاً نصب نیستند، بنابراین خروجی native build در همین ماشین ممکن نیست. می‌توان از **EAS Build** (ابری) استفاده کرد که SDK نمی‌خواهد.

---

## ۲. فعال‌سازی SQLCipher (رمزنگاری Vault)

### چرا؟
Vault فعلی از `expo-sqlite` (plaintext) استفاده می‌کند. در production باید `op-sqlite` با SQLCipher به‌جای آن قرار گیرد تا ووچرها (بلیت‌ها، پاسپورتها، پرداخت‌ها) روی دیسک رمزنگاری شوند.

### راه‌اندازی در کد (آماده است)
[`src/services/db/driver.ts`](src/services/db/driver.ts) به‌صورت خودکار انتخاب می‌کند:

```
op-sqlite (SQLCipher کامپایل شده)  →  engine = 'op-sqlite-encrypted'
expo-sqlite (پیش‌فرض)              →  engine = 'expo-sqlite' + warning
```

کلید ۲۵۶-بیتی در Android Keystore ذخیره می‌شود ([`dbKey.ts`](src/services/security/dbKey.ts)) و با بیومتریک باز می‌شود. **هیچ کدی را تغییر نمی‌دهید** — فقط SQLCipher را کامپایل کنید.

### فعال‌سازی compilation target

**گزینه ۱ — کلید `op-sqlite` در package.json (تنها راه رسمی):**
op-sqlite هیچ expo config plugin ندارد — build.gradle مستقیم از package.json می‌خواند
(دیده شد در [`node_modules/@op-engineering/op-sqlite/android/build.gradle`](node_modules/@op-engineering/op-sqlite/android/build.gradle)):

```jsonc
{
  "op-sqlite": { "sqlcipher": true }
}
```

✅ این کلید از قبل در `package.json` این پروژه ثبت شده است.

سپس دوباره prebuild:

```bash
npx expo prebuild --platform android --clean
```

**گزینه ۲ — Gradle flag دستی:**

در [`android/gradle.properties`](android/gradle.properties):

```properties
OP_SQLITE_USE_SQLCIPHER=1
```

### تأیید در runtime

پس از build، این را در debug console اجرا کنید:

```ts
import { isSQLCipher } from '@op-engineering/op-sqlite';
console.log('SQLCipher enabled:', isSQLCipher()); // باید true باشد
```

همچنین در UI می‌توان `vaultEngine()` از [`vault.ts`](src/services/db/vault.ts) را نشان داد:

```ts
const { engine, encrypted } = await vaultEngine();
// engine: 'op-sqlite-encrypted', encrypted: true
```

---

## ۳. فعال‌سازی FCM (Push Notification)

کد [`src/services/notifications/`](src/services/notifications/) کامل است؛ فقط پروژه Firebase کم است.

### مراحل:

1. در [Firebase Console](https://console.firebase.google.com) یک پروژه بسازید و app اندروید با package name `com.firuzo.itrip` را ثبت کنید.
2. `google-services.json` را دانلود کنید و در **دو مکان** قرار دهید:
   - `android/app/google-services.json`
   - (اختیاری) ریشه پروژه برای EAS: `google-services.json`
3. در `app.json` مرجع را اضافه کنید:

```jsonc
{
  "expo": {
    "android": {
      "package": "com.firuzo.itrip",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

4. دوباره prebuild کنید تا `AndroidManifest` با متادیتای FCM به‌روز شود.

> **نکته امنیتی:** `google-services.json` عمومی است (در APK قرار می‌گیرد). راز واقعی همان کلید FCM سرور شماست که در بک‌اند می‌ماند — کلاینت فقط توکن دستگاه را می‌گیرد و به بک‌اند می‌دهد.

### راهنمای رفتار

| حالت | نتیجه |
|---|---|
| FCM پیکربندی نشده | `getDevicePushTokenAsync` → catch → `null` → اپ کرش نمی‌کند، فقط push دریافت نمی‌شود |
| FCM پیکربندی شده | توکن دستگاه با `POST /devices/push-token` به سرور می‌رود |
| کاربر permission را رد کند | همان رفتار بالا (graceful) |

---

## ۴. امضای خروجی (Signing)

برای انتشار در Google Play / کافه بازار / مایکت باید AAB را با keystore خودتان امضا کنید (نه debug keystore).

### ساخت keystore (یک‌بار، امن نگه دارید):

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore itrip-release.keystore \
  -alias itrip -keyalg RSA -keysize 2048 -validity 10000
```

> **هشدار:** این فایل را **در git نگذارید** و در مکان امن (password manager / vault شرکت) نگه دارید. گم کردنش به معنای عدم امکان به‌روزرسانی اپ است.

### تنظیم در gradle

در [`android/gradle.properties`](android/gradle.properties) (این فایل در `.gitignore` است):

```properties
MYAPP_UPLOAD_STORE_FILE=itrip-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=itrip
MYAPP_UPLOAD_STORE_PASSWORD=••••••
MYAPP_UPLOAD_KEY_PASSWORD=••••••
```

در [`android/app/build.gradle`](android/app/build.gradle)، بخش `signingConfigs` را تکمیل کنید:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release   // ← به‌جای debug
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
}
```

---

## ۵. ProGuard / R8

در [`android/gradle.properties`](android/gradle.properties):

```properties
android.enableProguardInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
```

قوانین سفارشی در [`android/app/proguard-rules.pro`](android/app/proguard-rules.pro). این‌ها را برای op-sqlite / decimal / zod اضافه کنید:

```proguard
# Keep SQLCipher native methods
-keep class net.sqlcipher.** { *; }
-keep class com.opsqlite.** { *; }

# Keep Decimal.js math precision (reflection-based libs)
-keep class com.decimaljs.** { *; }

# Keep Zod schema classes (validation at runtime)
-keep class com.zod.** { *; }
```

---

## ۶. ساخت خروجی

### گزینه ۱ — EAS Build (ابری، بدون SDK محلی) ⭐ پیشنهادی

فایل [`eas.json`](eas.json) از قبل آماده است. کافی است:

```bash
npm install -g eas-cli
eas login

# اتصال پروژه به EAS (یک‌بار)
eas build:configure

# ساخت production (AAB امضاشده، با versionCode خودافزا)
eas build --platform android --profile production
```

**سه پروفایل آماده در [`eas.json`](eas.json):**

| پروفایل | خروجی | کاربرد |
|---|---|---|
| `development` | APK (dev-client) | تست روی دستگاه با hot-reload |
| `preview` | APK release | تست داخلی / کافه بازار |
| `production` | AAB | Google Play / انتشار نهایی |

```bash
# تست داخلی سریع (APK release)
eas build --platform android --profile preview

# مشاهده buildهای قبلی
eas build:list
```

> **نکته:** آدرس‌های `EXPO_PUBLIC_API_URL` در eas.json فعلاً placeholder هستند
> (`api.itrip.example.com`)؛ پیش از build واقعی آن‌ها را با دامنه تولید فیروزو جایگزین کنید.

### گزینه ۲ — Gradle محلی (با Android SDK نصب‌شده)

```bash
cd android

# AAB (Google Play) 
.\gradlew.bat bundleRelease

# APK (کافه بازار / دانلود مستقیم)
.\gradlew.bat assembleRelease
```

خروجی‌ها:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## ۷. چک‌لیست پیش از انتشار (Quality Gates)

قبل از هر build production این‌ها را اجرا کنید:

```bash
npm run verify          # typecheck + 72 tests + i18n parity
```

سپس در دستگاه واقعی:

| تست | معیار پذیرش |
|---|---|
| Airplane Mode → باز کردن My Trips | ووچر + QR بدون اینترنت رندر شود |
| Kill app → باز کردن مجدد | auth بدون login مجدد (SecureStore) برگردد |
| Biometric lock روی Wallet | پس از رد بیومتریک، موجودی نمایش داده نشود |
| SQLCipher | `vaultEngine().encrypted === true` |
| Push (FCM واقعی) | نوتیفیکیشن `FLIGHT_DELAY` روی دستگاه ظاهر شود |

---

## ۸. نکات انتشار در ایران

- **کافه بازار / مایکت:** APK امضاشده را مستقیم آپلود کنید (نه AAB).
- **دسترسی FCM:** در شبکه‌های تحت محدودیت ایران، FCM ممکن است ناپایدار باشد — سیستم fallback به pull-sync در WorkManager دارد ([`backgroundSync.ts`](src/services/sync/backgroundSync.ts)).
- **حجم اپ:** با Hermes + shrinkResources انتظار حدود **۳۰–۴۵ MB** APK می‌رود.
