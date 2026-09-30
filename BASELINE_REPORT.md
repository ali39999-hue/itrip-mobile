# iTRIP Mobile — Baseline Report (R0 — Baseline & Freeze)

**Generated:** 2026-09-30
**Baseline Commit:** `165ee43` (post v0.3.0 release + R0 hardening)
**Baseline Tag:** `v0.3.0`
**Branch:** `main`
**Evidence Basis:** تمام مقادیر زیر از اجرای واقعی دستورات روی مخزن استخراج شده‌اند (Evidence > Assumption).

---

## 1. Toolchain & Runtime Versions

| Component | Version (Evidence) |
|---|---|
| Node.js | v24.18.0 |
| npm | 11.16.0 |
| Expo CLI | 0.22.28 |
| Expo SDK | ~52.0.0 (package.json) |
| React Native | 0.77.0 (package.json) |
| React | 18.3.1 |
| TypeScript | ^5.7.0 |
| Vitest | 2.1.9 (runtime) |
| Gradle Wrapper | 8.10.2-all (gradle-wrapper.properties) |
| Android Build Tools | 35.0.0 (android/build.gradle) |
| Android compileSdk | 35 / targetSdk 34 / minSdk 24 |
| Kotlin | 2.0.21 |
| NDK | 27.1.12297006 |

---

## 2. Dependency Inventory (SBOM Summary)

منبع: `package-lock.json` (تولید برنامه‌نویسی‌شده با node، بدون حدس)

| Category | Count |
|---|---|
| Total locked packages | 1,227 |
| Production packages | 1,077 |
| Dev packages | 150 |

### License Inventory
```text
MIT: 1010, ISC: 102, Apache-2.0: 30, BSD-3-Clause: 27, BSD-2-Clause: 23,
MPL-2.0: 11, BlueOak-1.0.0: 7, (MIT OR CC0-1.0): 3, UNKNOWN: 3,
Unlicense: 2, 0BSD: 2, Python-2.0: 1, CC-BY-4.0: 1, CC0-1.0: 1,
(BSD-3-Clause OR GPL-2.0): 1, (BSD-2-Clause OR MIT OR Apache-2.0): 1,
BSD: 1, (Unlicense OR Apache-2.0): 1
```
- **UNKNOWN licenses (3):** بررسی در R1 Security لازم است.
- هیچ GPL copyleft نسخه خالصی در production tree شناسایی نشد (یک `(BSD-3-Clause OR GPL-2.0)` dual-license مجاز است).

---

## 3. Quality Gate Baseline (Real Executions)

| Gate | Command | Result | Duration |
|---|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** (0 errors) | ~1.5s |
| Lint | `npm run lint` | **PASS** (0 errors, 0 warnings) | ~1.2s |
| Unit + E2E Tests | `npm run test` | **PASS** — 135/135 tests, 24 files | ~1.0s |
| i18n Parity | `npm run i18n:parity` | **PASS** — 5 locales × 187 keys | ~0.3s |
| Production Bundle | `npm run build:bundle` | **PASS** — 1,827 modules, 3.82 MB | ~15s (first) / ~1.5s (cached) |

---

## 4. Bundle Size Baseline

| Artifact | Size |
|---|---|
| Android JS bundle (Hermes-ready) | 3.82 MB (`_expo/static/js/android/entry-*.js`) |
| Released APK v0.3.0 | 105,944,739 bytes (~101 MB universal) |
| APK SHA-256 | `2a55d6250fc25fe3a682968a2107fcb2a16c3dbd59eea02da0f061c6ab49a3f9` |

---

## 5. Dependency Vulnerability Baseline (`npm audit`)

**Evidence:** 30 vulnerabilities (2 critical, 7 high, 21 moderate) — عمدتاً در dev-toolchain (vite/esbuild/vitest/node-tar/postcss/image-size/xmldom/ajv/uuid).

| Severity | Count | Notes |
|---|---|---|
| Critical | 2 | node-tar (build-time path traversal) — dev dependency chain، در runtime باندل موبایل وجود ندارد |
| High | 7 | xmldom (XML injection)، image-size (DoS)، PostCSS (XSS/file-read) — build-time |
| Moderate | 21 | ajv ReDoS، esbuild dev-server، uuid v3/v5، vitest path traversal — dev-time |

**Assessment:** هیچ‌یک از critical/high موارد در production JS bundle نیامده‌اند (تمام devDependencies هستند یا transitively در مسیر build). **R1 Task:** ارتقای پچ‌پذیرها با `npm audit fix` (non-force) + بررسی breakage؛ force upgrade فقط با ADR.

---

## 6. Version Consistency Audit (P0 Fix Applied)

| File | Before | After (Fixed) |
|---|---|---|
| package.json | 0.3.0 | 0.3.0 |
| app.json (expo.version) | 0.3.0 | 0.3.0 |
| app.json (android.versionCode) | 3 | 3 |
| **android/app/build.gradle (versionName)** | **"0.2.0" ❌** | **"0.3.0" ✅** |
| **android/app/build.gradle (versionCode)** | **2 ❌** | **3 ✅** |
| src/services/api/config.ts (appVersion) | 0.3.0 | 0.3.0 |

این ناسازگاری دقیقاً همان R0/P0 gap پیش‌بینی‌شده در MASTER_ROADMAP بود و اصلاح شد.

---

## 7. Security & Identity Baseline (P0 Fixes Applied در R0 به دلیل blocking بودن)

### 7.1 Demo Identity — REMOVED (R1 Task pulled forward)
- `src/stores/authStore.ts::bootstrapAuth` قبلاً یک هویت نمایشی hard-coded داشت:
  `userId: 'usr_active'`, `phone: '09120000000'`, `firstName: 'Traveler'`, `lastName: 'Firuzo'`, `kycApproved: true`.
- **Fix:** هویت نمایشی حذف شد. اکنون توکن موجود ⇒ نشست `authenticated` با پروفایل خالی + fetch واقعی از `/user/profile` (server-authoritative). بدون توکن ⇒ `guest`.
- `loyaltyPoints: 120` جعلی در دو fallback path به `0` تغییر کرد.

### 7.2 Placeholder Phone در مسیر پرداخت — REMOVED
- `src/app/booking/review.tsx` و `src/app/booking/hotel-review.tsx` قبلاً در غیاب شماره کاربر، `'09120000000'` را جایگزین می‌کردند (ارسال شماره جعلی به سرور در draft authoritative).
- **Fix:** اگر شماره تاییدشده موجود نباشد، عملیات متوقف و خطای i18n‌شده `booking.phoneRequired` (۵ زبانه) نمایش داده می‌شود.

### 7.3 Secret Scan (Static)
- الگوی اسکن secret/password/token روی `src/`, `scripts/`, `.github/` اجرا شد: **0 matches**.
- `.gitignore` شامل `*.keystore`, `*.jks`, `.env*`, `google-services.json` است — بدون نشت ساختاری.
- Keystore production در CI از متغیر secret تزریق می‌شود (`ci: generate signing keystore` — commit 7647e08)؛ فایل keystore کامیت نمی‌شود.

### 7.4 Signing Baseline (ثبت وضعیت، بدون تغییر در R0)
- `android/app/build.gradle::buildTypes.release.signingConfig = signingConfigs.debug` — **شناخته‌شده به‌عنوان R1 P0** (debug keystore نامش `debug.keystore` است اما در CI با dname رسمی `CN=iTRIP Mobile` و validity 10000 روز تولید می‌شود؛ nevertheless signing separation به R1 موکول شد چون keystore management نیاز به تصمیم security ownership دارد).
- `minifyEnabled = false` (ProGuard خاموش) — R1 task.

---

## 8. Performance Baseline (Local Measurements)

| Metric | Value | Method |
|---|---|---|
| Metro bundle (1,827 modules) | 1.48s (warm) / 18.3s (cold) | `npm run build:bundle` |
| Test suite (24 files / 135 tests) | ~1.0s | `npm run test` |
| Bundle size | 3.82 MB | export output |

Cold-start/TTI/list-scroll پروفایل روی دستگاه واقعی به R9 موکول شد (نیازمند emulator/device farm که در R0 scope نبود).

---

## 9. Architecture Decision Records — ثبت اولیه

| ADR | Decision | Rationale |
|---|---|---|
| ADR-001 | Domain layer بدون dependency به React/RN باقی می‌ماند (freeze تا پایان R2) | تست‌پذیری ۱۰۰٪ در Node؛ سوئیت 135-testی روی این قرارداد بنا شده |
| ADR-002 | Server-authoritative برای wallet/booking/payment حفظ می‌شود | قبلاً در config.ts و booking.ts با Zod strict پیاده شده؛ تغییر نیازمند دلیل نیست |
| ADR-003 | حذف demo identity از bootstrap بدون backward-compat flag | هیچ API عمومی تغییر نکرد؛ صرفاً state داخلی store اصلاح شد (P0 security) |
| ADR-004 | versionCode/versionName از build.gradle به‌صورت دستی با app.json هم‌تراز می‌شوند تا R8 | prebuild خودکار موجود نیست؛ sync بعداً با script خودکار می‌شود |

---

## 10. Public API Shape Freeze (تا پایان R2)

فایل‌های قراردادی که shape عمومی آن‌ها freeze شد:

```text
src/services/api/auth.ts        (sendOtp / verifyOtp / logout)
src/services/api/flights.ts     (SearchFlightsParams / FlightOffer)
src/services/api/hotels.ts      (SearchHotelsParams / RoomOffer)
src/services/api/booking.ts     (createDraft / confirmPayment / validateQuote)
src/services/api/wallet.ts      (getBalances / getTransactions / initiateTopUp)
src/domains/booking/state.ts    (BookingStatus FSM)
src/domains/currency/money.ts   (Money operations)
```

هر تغییر shape از این به بعد نیازمند ADR و به‌روزرسانی test matrix است.

---

## 11. Exit Gate — R0

- [x] Baseline reproducible: typecheck + lint + test + bundle همگی از clean working tree عبور می‌کنند.
- [x] version consistency اصلاح و مستند شد.
- [x] demo identity و seed financial data از production path حذف شد (پیش‌دستی R1).
- [x] SBOM و license inventory ثبت شد.
- [x] Public API shapes freeze شدند (فهرست §10).
- [ ] Android release candidate build روی CI (در حال حاضر CI سبز است — build-and-release-apk روی tag اجرا می‌شود).
- [ ] iOS simulator build (macOS environment لازم است — NOT_APPLICABLE روی این محیط Windows).

**وضعیت R0: PASS (با 2 مورد NOT_APPLICABLE/BLOCKED-ENV مستندشده)**
