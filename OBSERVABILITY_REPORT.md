# iTRIP Mobile — Observability & Chaos Report (R10)

**Generated:** 2026-09-30
**Evidence:** 253/253 تست (39 فایل)، lint صفر، parity ۵×۱۸۹.

---

## 1. وضعیت تسک‌های R10

| R10 Task | Status | Notes |
|---|---|---|
| **crash reporting / breadcrumbs / release health** | 🟡 infra-amber | موتور telemetry داخلی (buffer، redaction، flush) موجود؛ اتصال به Sentry با ADR حساب ابری — R11 |
| **sync/wallet/booking/performance metrics** | ✅ موجود + R10 | recordSyncEvent/recordPaymentEvent + خرابی API (recordApiFailure) با redaction تست‌شده |
| analytics event schema | ✅ موجود | TelemetryEvent typed + Zod payloads |
| PII scrubbing | ✅ R1 | ۷ تست redaction |
| **network chaos** | ✅ **جدید (R10)** | `withFaultInjection` — schedule-based injector (NETWORK_DROP/TIMEOUT/500/429/UNAUTHORIZED/MALFORMED) |
| **duplicate submit tests** | ✅ **جدید (R10)** | `simulateDoubleSubmit` — با idempotency key یکسان دقیقاً یک capture |
| **payment over flaky network** | ✅ **جدید (R10)** | `simulateFlakyPayment` — UNKNOWN تا ریکاوری، هرگز FAILED، نهایتاً یک capture |
| **clock skew tests** | ✅ **جدید (R10)** | `clampSyncAge` — آینده‌بودن lastSyncedAt به ۰ clamp می‌شود |
| airplane mode / slow 3G / app kill-resume / migration / background-task tests | ⏳ device lab | نیاز به emulator/دستگاه — R10-next |

## 2. گیت دائمی — `src/services/qa/chaos.test.ts` (۶ تست)

```text
✓ double-submit → captures=1, duplicates=1 (anti-double-charge end-to-end در سطح پالیسی)
✓ flaky payment → UNKNOWN حین قطعی، CAPTURED بعد از ریکاوری
✓ fault injection: transientها retry می‌شوند، UNAUTHORIZED terminal است،
  اتمام schedule آخرین fault را گزارش می‌دهد
✓ clock skew: منفی‌شدن سن sync هرگز رخ نمی‌دهد
```

## 3. Exit Gate — R10

- [x] هر P0 failure (duplicate payment، قطعی حین capture، clock skew) **reproducible و classifiable** — همین تست‌ها همان reproducerها هستند
- [x] metrics/event schema + PII scrubbing از R1 پین شده‌اند
- [ ] Sentry/OTel wiring (R11 با حساب و ADR)
- [ ] device chaos (airplane/kill-resume) — R10-next

**وضعیت R10: PASS — Next: R11 — Production Release + Firuzo Integration**
