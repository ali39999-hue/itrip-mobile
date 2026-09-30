# iTRIP Mobile — Security Baseline (R1 — Security + Identity Hardening)

**Generated:** 2026-09-30
**Scope:** MASTER_ROADMAP R1 tasks executed in this train + status of the rest
**Evidence Basis:** همه ادعاها با اجرای واقعی دستورات، محتوای فایل‌ها و تست‌های گیت امنیتی قابل بازتولید هستند.

---

## 1. Threat Model Snapshot (Auth / Wallet / Vault / Booking)

| Asset | Primary Threats | Controls (existing → R1 additions) |
|---|---|---|
| Access/Refresh Tokens | استخراج از حافظه، باکاپ ابری، MITM | SecureStore (Keystore) ✔، exclusion از backup rules ✔، native NSC pinning (R1 verified) |
| SQLCipher DB Key | استخراج کلید، کلید ضعیف | 256-bit CSPRNG از expo-crypto ✔، ذخیره در Keystore ✔، fail-closed اگر RNG نامتوازن ✔ |
| Vault DB (itrip-vault.db) | خواندن آفلاین روی device روت‌شده | SQLCipher AES-256 (op-sqlite)، fallback plaintext فقط در dev + telemetry flag |
| Booking/Payment Flow | placeholder identity، double-submit | حذف شماره جعلی (R0)، idempotencyKey در draft/payment ✔، server quote validation ✔ |
| Telemetry | نشت PII/credential در لاگ | SENSITIVE_KEYS redaction ✔ + **7 تست جدید گیت (R1)** |
| Release APK | debug-signing، reverse engineering | **جدا‌سازی کامل signing (R1)**، **R8 rules کامل (R1)**، keep line numbers برای stack قابل‌دیباگ |

---

## 2. R1 Deliverables — Executed (with evidence)

### 2.1 Release Signing Separation (P0) — ✅ DONE
**قبل:** `buildTypes.release.signingConfig = signingConfigs.debug` — امضای release با کلید debug.
**بعد:**
- `android/app/build.gradle`: `signingConfigs.release` اختصاصی با دو مسیر resolution:
  1. `MYAPP_UPLOAD_*` از gradle.properties (محل مهندس؛ فایل commit نمی‌شود — BUILD.md §4)
  2. `ITRIP_RELEASE_*` از environment variables (CI)
- مسیر keystore پیش‌فرض `release.keystore`؛ اگر موجود نباشد `file()` خطا می‌دهد ⇒ **fail-closed** (هیچ‌وقت به debug سقوط نمی‌کند).
- `.github/workflows/build-and-release-apk.yml`: مرحله تولید keystore اختصاصی release با dname رسمی `CN=iTRIP Mobile Release` و alias `itrip-release`؛ پاس دادن env vars به gradlew.
- `.gitignore`: `android/app/release.keystore` اضافه شد.
- **گیت دائمی:** تست `config.security.test.ts > release buildType uses signingConfigs.release, never debug`.

### 2.2 ProGuard/R8 Rules کامل (P1) — ✅ DONE
`android/app/proguard-rules.pro` از ۲ قانون به رول‌ست کامل متناسب با وابستگی‌های واقعی ارتقا یافت:
- New Architecture: turbomodule/fabric/uimanager/bridge + `@DoNotStrip`
- Hermes + JNI
- Expo modules (reflection providers)
- op-sqlite (JSI/Nitro: `com.margelo`, `cc.callisto`) + SQLCipher (`net.sqlcipher`, `net.zetetic`)
- gesture-handler / rnscreens / svg view managers
- `keepattributes SourceFile,LineNumberTable` ⇒ stack trace قابل تحلیل برای telemetry (compromise آگاهانه: obfuscation کلاس‌ها بدون کوری استک‌تریس)
- حذف `Log.v/Log.d` در release (`assumenosideeffects`)
- قبلاً در gradle.properties فعال بود: `enableProguardInReleaseBuilds=true` + `enableShrinkResourcesInReleaseBuilds=true`

### 2.3 Placeholder Host از Native Pinning حذف شد (P0) — ✅ DONE
- `res/xml/network_security_config.xml`: `<domain>itrip.example.com</domain>` **حذف** شد؛ دامنه‌های واقعی `itrip-platform.vercel.app` و `api.itrip.ir` با pin-set دارای expiration `2027-12-31` و ۳ pin (primary + 2 backup) باقی‌اند.
- `debug-overrides` فقط در buildهای debug قابل اعمال است (سمن Android) — زنجیره تحویل production از user CA عبور نمی‌کند.

### 2.4 شفاف‌سازی «JS Pinning vs Native Pinning» (P0 ادعای غلط) — ✅ DONE
- در `src/services/api/config.ts` مستند شد: چک JS فقط **اعتبارسنجی کانفیگ پین** است و نه TLS handshake؛ pinning واقعی transport در Android NSC است که از JS قابل bypass نیست. این ادعا حالا با کد یکسان است.

### 2.5 Secret Scan & Debug-Artifact Scan — ✅ DONE (دائمی)
- اسکن static: **۰ secret** در src/scripts/.github
- **۰ `console.log`** در کل `src/` تولیدی (تست گیت دائمی شد)
- **۰ شماره تلفن نمایشی `09120000000`** (تست گیت دائمی شد)
- الگوی credential-like literal: **۰ مورد**

### 2.6 Security Gate Test Suite جدید — `src/test/security/config.security.test.ts`
۱۳ تست که فایل‌های بومی/کانفیگ را در هر build می‌سنجند (regression-proof):
| # | Invariant |
|---|---|
| 1 | Manifest به NSC ارجاع می‌دهد |
| 2 | Backup/extraction rules در manifest حاضرند |
| 3 | SecureStore prefs + vault DB از cloud backup و device transfer مستثنی‌اند |
| 4 | cleartext به‌طور کلی ممنوع |
| 5 | هیچ `example.com` در NSC نیست |
| 6 | پین دو دامنه production + pin-set دارای expiration + ≥3 pin |
| 7 | release buildType فقط `signingConfigs.release` |
| 8 | signing از env/gradle.properties (fail-closed) |
| 9 | release.keystore در .gitignore |
| 10 | بدون demo phone در src |
| 11 | بدون credential literal در src |
| 12 | بدون console.log در src |
| 13 | هم‌ترازی نسخه package.json / app.json / build.gradle |

+ ۷ تست sanitiszation جدید در `telemetry/index.test.ts` (redaction توکن/OTP/CVV/passport/nationalId، recursive، buffer cap).

---

## 3. Identity Hardening — وضعیت

| R1 Task | Status | Notes |
|---|---|---|
| حذف mock user از bootstrapAuth | ✅ DONE (R0, پیش‌دستی) | جلسه از `/user/profile` پر می‌شود |
| `/me` contract معادل | ✅ موجود | `/user/profile` با Zod در `authStore.fetchProfile` |
| access token کوتاه‌عمر / refresh rotation | ⚠️ Backend-side | کلاینت single-flight refresh mutex دارد؛ TTL سرور در R11 contract review |
| device/session registry، revoke session | ⚠️ Backend-side | کلاینت side آماده: `clearTokens` در 401/refresh-fail |
| biometric unlock | ✅ موجود | `expo-local-authentication` + gate در wallet |
| passcode fallback | ⚠️ R3 (Design System فرم‌ها) | |
| key rotation strategy | ⚠️ Partial | pin rotation با backup pin؛ DB key rotation به R2 (schema migrations) |
| jailbreak/root detection | ⏳ Not in this train | نیاز به native module جدید — مستلزم ADR + dependency review (R1-next) |
| screenshot protection (FLAG_SECURE) | ⏳ R1-next | نیاز MainActivity tweak — مستقل از JS |
| clipboard policy | ⏳ R1-next | فقط eSIM activation code کپی می‌شود؛ token هرگز |
| dependency vulnerability scan | ✅ Baseline ثبت شد | 30 مورد همه dev-chain؛ `npm audit fix` غیرشکستنی به‌صورت تیکت R1-next |

---

## 4. MASVS Checklist (خلاصه وضعیت بر اساس MASTG v1)

| Domain | کنترل‌های اعمال‌شده | وضعیت |
|---|---|---|
| MASVS-STORAGE | SQLCipher، Keystore key، backup exclusion، fail-closed RNG | ✅ |
| MASVS-CRYPTO | 256-bit CSPRNG، keine سخت‌کد کلید | ✅ |
| MASVS-AUTH | SecureStore tokens، single-flight refresh، revoke on 401 | ✅ |
| MASVS-NETWORK | NSC cleartext=false، native pin + expiration + backup pins، debug-overrides فقط debug | ✅ |
| MASVS-PLATFORM | backup rules، minSdk 24، permissions حداقلی (بدون MANAGE_EXTERNAL_STORAGE) | ✅ |
| MASVS-CODE | R8 minify+shrink، rules کامل، log stripping | ✅ |
| MASVS-RESILIENCE (anti-tamper) | — | ⏳ R1-next (root/emulator detection، Play Integrity) |
| MASVS-PRIVACY | telemetry redaction (تست‌شده)، بدون console.log | ✅ |

---

## 5. Exit Gate — R1 (این تیراژ)

- [x] هیچ credential، token، wallet seed یا mock identity در production artifact نیست (گیت دائمی #10-#12)
- [x] release build fail-closed بدون keystore اختصاصی (گیت دائمی #7-#9)
- [x] native pinning بدون placeholder host (گیت دائمی #5-#6)
- [x] security gate suite در CI اجرا می‌شود (Vitest در `npm run verify`)
- [ ] root/jailbreak detection + Play Integrity (R1-next، نیازمند ADR + native dep)
- [ ] npm audit fix پچ‌های dev-chain (R1-next)

**وضعیت R1: PASS (با 2 مورد تسک به R1-next موکول‌شده — غیربلاکینگ، مستند)**
