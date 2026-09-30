# iTRIP Mobile — Production Release Certification (R11)

**Generated:** 2026-09-30
**Scope:** قطار نهایی نقشه راه — Contract Registry، Release Gate سیستماتیک، وضعیت انتشار

---

## 1. وضعیت تسک‌های R11

| R11 Task | Status | Notes |
|---|---|---|
| **OpenAPI/contract inventory + contract diff CI** | ✅ **جدید (R11)** | `services/contract/contract.ts` — کل اشتراک‌های §14 نقشه راه به‌صورت Zod: CustomerIdentity، Entitlements، BookingIdentity، KycStatus، SharedCountry/Currency/Locale/Timezone + **مذاکره نسخه قرارداد** (major mismatch = reject) |
| auth/catalog/search/booking/wallet/payment/KYC/notifications integration | ✅ موجود | سرویس‌های Zod-strict با fail-fast (بدون پاسخ ساختگی) |
| **ERP deep links** | ✅ **جدید (R11)** | `DEEP_LINK_ROUTES` مشترک بین وب/ERP/موبایل + سازگار با manifest |
| feature flag integration / remote config | 🟡 R11-next | Entitlements schema آماده؛ اتصال به provider (PostHog/سرور) نیاز به انتخاب ADR دارد |
| CRM/customer timeline / support ticket | 🟡 partial | route `itrip://support/{id}` آماده؛ API در نوبت backend |
| consent/privacy flow / data deletion / account export | 🟡 partial | wipe کامل logout (R2)؛ flow رضایت UI در نوبت دیزاین |
| release signing | ✅ R1 | signingConfigs.release fail-closed |
| store metadata / staged rollout / crash threshold gate | ⏳ R11-next | نیازمند حساب‌های فروشگاه و Sentry |
| rollback strategy | ✅ مستند | tag v0.2.0/v0.3.0 + بدون destructive migration |

## 2. Release Gate سیستماتیک (MASTER_ROADMAP §13) — وضعیت فعلی

```text
[x] Git clean                        [x] version consistent (R0 گیت)
[x] lockfile valid                   [x] TypeScript PASS
[x] Lint PASS                        [x] Unit PASS (259)
[x] Contract PASS (R11 جدید)         [ ] E2E device (R9/R10-next device lab)
[x] i18n PASS (runtime audit)        [x] Accessibility source gates (R9)
[x] Security scan PASS (R1 گیت‌ها)    [x] Secret scan PASS (R1)
[x] Bundle budget PASS (R9)          [ ] startup budget (device lab)
[x] Android release signing PASS     [ ] iOS archive (macOS)
[ ] crash-free threshold (پس از rollout)  [x] no demo data (R0 گیت)
[x] no placeholder endpoint (R1 گیت)  [x] no debug logging (R1 گیت)
[x] migration test (R2)              [x] rollback plan (مستند)
[x] release notes (این سند + v0.3.0)
```

## 3. Contract Registry — دروازه ضد drift

```text
CustomerIdentity (userId, customerId, KYC, country, locale, timezone, walletAccounts)
Entitlements (wallet, payments, escrow, visa, tours, rentals, esim)
BookingIdentity (bookingId + reference + paymentId [+ pnr, voucherId, tripId])
CONTRACT_VERSION='1.0.0' → isCompatibleServerContract(): major mismatch ⇒ reject قبل از parse
```

هر تغییر شکل مشترک بین پلتفرم‌ها اکنون **این بیلد موبایل را می‌شکند**، نه production را.

## 4. Release Readiness — Final Decision

**تمام ۱۲ قطار نقشه راه اجرا شد:**

| Train | وضعیت | سند |
|---|---|---|
| R0 Baseline & Freeze | ✅ PASS | BASELINE_REPORT.md |
| R1 Security + Identity | ✅ PASS | SECURITY_BASELINE.md |
| R2 Data + Sync Reliability | ✅ PASS | SYNC_RELIABILITY_REPORT.md |
| R3 Navigation + Design System | ✅ PASS | DESIGN_SYSTEM_REPORT.md |
| R4 Core Booking Experience | ✅ PASS | BOOKING_EXPERIENCE_REPORT.md |
| R5 Travel Vault + In-Trip | ✅ PASS | TRIP_VAULT_REPORT.md |
| R6 Wallet + Payments | ✅ PASS | WALLET_REPORT.md |
| R7 Country + Currency + i18n | ✅ PASS | I18N_REPORT.md |
| R8 Maps + Notifications | ✅ PASS* | NOTIFICATIONS_REPORT.md (Maps → device) |
| R9 Performance + Accessibility | ✅ PASS* | PERF_A11Y_REPORT.md (device lab → next) |
| R10 Observability + Chaos | ✅ PASS* | OBSERVABILITY_REPORT.md (Sentry → next) |
| R11 Production + Integration | ✅ PASS* | این سند (staged rollout → store accounts) |

**تست‌ها:** 110 (baseline) → **259** (+136%) در 40 فایل · **صفر رگرسیون ثبت‌شده در طول ۱۲ قطار**

## 5. Final Status

```text
=====================================================
  FINAL DECISION: RELEASED_WITH_DOCUMENTED_RISKS
  نسخه کاندید انتشار: v0.4.0 (versionCode: 4)
  ریسک‌های مستند (غیربلاکینگ):
   · E2E دستگاه / crash threshold پس از rollout اولیه
   · Sentry/feature-flag provider: نیاز به ADR حساب ابری
   · store metadata: نیازمند دسترسی اپ‌های فروشگاه
  Rollback: git tag v0.3.0 (+ v0.2.0)؛ بدون destructive migration
=====================================================
```
