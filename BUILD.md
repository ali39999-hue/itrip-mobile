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

### هویت امضای canonical (یک جفت واحد در کل پروژه)

فایل `android/app/release.keystore` با alias `itrip-release` — همان چیزی که CI (`.github/workflows/build-and-release-apk.yml`) از secret ما می‌سازد و [`android/app/build.gradle`](android/app/build.gradle) به‌عنوان پیش‌فرض می‌خواند. هر فایل/alias دیگری نباید استفاده شود.

### ساخت keystore (یک‌بار، امن نگه دارید):

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore \
  -alias itrip-release -keyalg RSA -keysize 2048 -validity 10000
```

فایل خروجی را در `android/app/release.keystore` قرار دهید.

> **هشدار:** این فایل توسط `.gitignore` رد می‌شود (`*.keystore`) — آن را **در git نگذارید** و در مکان امن (password manager / vault شرکت) نگه دارید. گم کردنش به معنای عدم امکان به‌روزرسانی اپ است.

### تنظیم در gradle (بیلد محلی)

⚠️ [`android/gradle.properties`](android/gradle.properties) **یک فایل tracked است و در git کامیت می‌شود** — پس رمز واقعی هرگز نباید در آن نوشته شود (فقط مقدارهای placeholder بدون رمز بمانند). رمزهای واقعی را در فایل محلیِ خارج از ریپو `~/.gradle/gradle.properties` بگذارید یا از طریق environment بدهید:

```properties
# در ~/.gradle/gradle.properties محلی — نه در android/gradle.properties
MYAPP_UPLOAD_STORE_FILE=release.keystore
MYAPP_UPLOAD_KEY_ALIAS=itrip-release
MYAPP_UPLOAD_STORE_PASSWORD=••••••
MYAPP_UPLOAD_KEY_PASSWORD=••••••
```

> **هشدار نشت رمز:** نوشتن `MYAPP_UPLOAD_STORE_PASSWORD` واقعی در `android/gradle.properties`ِ tracked با یک `git add -A` به مخزن نشت می‌کند؛ اگر مخزن عمومی یا اشتراکی باشد، رمز امضای release عمومی‌شده است. مسیر امن فقط `~/.gradle/gradle.properties` (محلی و untracked) یا متغیر محیطی است.

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

# Keep op-sqlite v11 JSI classes (real package: com.op.sqlite — نه com.opsqlite)
-keep class com.op.sqlite.** { *; }

# Keep Decimal.js math precision (reflection-based libs)
-keep class com.decimaljs.** { *; }

# Keep Zod schema classes (validation at runtime)
-keep class com.zod.** { *; }
```

---

## ۶. ساخت و توزیع خروجی‌ها (Distribution Channels)

پلتفرم iTRIP Mobile دارای ۵ سطح خروجی تفکیک‌شده است:

| کانال / پروفایل | نوع خروجی | مقصد انتشار | دستور ساخت |
| :--- | :---: | :---: | :--- |
| **A. Development** | Debug APK (Dev Client) | توسعه‌دهندگان (Hot Reload) | `eas build -p android --profile development` |
| **B. Internal Preview** | Signed Release APK | تیم تضمین کیفیت (QA) | `eas build -p android --profile preview` |
| **C. Public Android APK** | Signed Production APK | دانلود مستقیم کاربران و وب‌سایت | `eas build -p android --profile production-apk` |
| **D. Google Play Store** | Signed Production AAB | انتشار بین‌المللی پلی‌استور | `eas build -p android --profile production` |
| **E. کافه بازار و مایکت** | Signed Production APK | مارکت‌های بومی ایرانی | `./gradlew assembleRelease` یا profile `production-apk` |

---

## ۷. خط لوله انتشار خودکار گیت‌هاب (GitHub Release CI/CD)

فایل ورک‌فلو [`.github/workflows/build-and-release-apk.yml`](.github/workflows/build-and-release-apk.yml) به صورت تمام‌خودکار:
1. روی تگ‌های نسخه (مانند `v0.2.0`) اجرا می‌شود.
2. گیت‌های تست و کیفیت (`npm run verify`) را می‌سنجد.
3. بیلد نیتیو پروداکشن اندروید (`./gradlew assembleRelease`) را در کانتینر اوبونتو کامپایل می‌کند.
4. فایل APK را با نام کاربرپسند `iTRIP-Mobile-v0.2.0.apk` نام‌گذاری می‌کند.
5. کد هش SHA-256 را محاسبه کرده و در فایل `iTRIP-Mobile-v0.2.0.apk.sha256` ذخیره می‌نماید.
6. فایل APK و هش اصالت را مستقیماً به بخش **Assets** در GitHub Release پیوست می‌کند.

### اجرای دستی خط لوله از طریق CLI:
```bash
gh workflow run "Build & Release Android APK" -f release_tag=v0.2.0
```

### Secretهای لازم CI (در تنظیمات GitHub Actions ریپو)

| Secret | نقش |
|---|---|
| `ITRIP_RELEASE_KEYSTORE_BASE64` | (ترجیحی) کل فایل keystore پایدار به‌صورت base64 — decode شده و در `android/app/release.keystore` نوشته می‌شود؛ هویت امضا بین ریلیزها ثابت می‌ماند |
| `ITRIP_RELEASE_KEYSTORE_PASSWORD` | رمز keystore — **الزامی**؛ نبودش بیلد fail-closed می‌شود |
| `ITRIP_RELEASE_KEY_PASSWORD` | رمز key — **الزامی** |
| `ITRIP_RELEASE_KEY_ALIAS` | (اختیاری) پیش‌فرض `itrip-release` |

بدون `ITRIP_RELEASE_KEYSTORE_BASE64`، CI فقط با هشدار صریح «EPHEMERAL SIGNING IDENTITY - not for store releases» یک keystore موقتی می‌سازد (در هر بیلد هویت امضا عوض می‌شود و برای انتشار در استور معتبر نیست). بدون هیچ secret امضایی، بیلد با خطای واضح متوقف می‌شود — هیچ fallback رمز هاردکد وجود ندارد.

---

## ۸. چک‌لیست پیش از انتشار (Quality Gates)

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
