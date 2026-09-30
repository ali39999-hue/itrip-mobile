# iTRIP Mobile — Wallet Report (R6 — Wallet + Payments + Commerce)

**Generated:** 2026-09-30
**Evidence:** 222/222 تست (35 فایل)، typecheck/lint سبز، parity ۵×۱۸۹، باندل production موفق.

---

## 1. وضعیت تسک‌های R6

| R6 Task | Status | Notes |
|---|---|---|
| authoritative balance API | ✅ موجود | `walletService.getBalances` — Zod-strict، throw روی failure (بدون synthetic) |
| **transaction pagination** | ✅ **جدید (R6)** | `paginateLedger()` — cursor پایدار بر اساس id؛ ورود ردیف جدید وسط scroll باعث skip/duplicate نمی‌شود (6 تست) |
| **pending transaction state** | ✅ **جدید (R6)** | Top-up حالا `PENDING` ثبت می‌شود نه SETTLED — intent پرداخت پول در والت نیست تا لجر سرور تأیید کند |
| reversed / refunded transaction | ✅ **جدید (R6)** | `pairReversals()` — جفت‌کردن برگشت با اصل + مدیریت orphan |
| multi-currency wallet presentation | ✅ موجود | ۶ ارز + numpad معادل IRR |
| currency precision policy | ✅ موجود | Decimal.js فقط (ROUND_HALF_UP) |
| payment intents / top-up | ✅ موجود + R6 | **anti-double-submit:** گارد state در `handleTopUpSubmit` + دکمه disabled |
| 3DS | ✅ R4 | REDIRECT_REQUIRED flow |
| wallet top-up / debit | ✅ موجود | `credit/debit` با سد insufficient funds |
| partial / full refund | 🟡 Server-side | مدل مشتق client آماده؛ اجرای سرور R11 |
| payment retry | ✅ موجود | DECLINED قابل retry؛ UNKNOWN → verification (R4) |
| receipt / invoice | ⏳ R6-next | نیاز به endpoint سرور (R11) |
| chargeback state | ⏳ R11 | قرارداد سرور |
| biometric confirmation عملیات پرریسک | ✅ موجود | gate بیومتریک والت |
| finance telemetry / audit trail | ✅ موجود | `recordPaymentEvent` + redaction تست‌شده |

## 2. قواعد امنیتی جدید Ledger

```text
isSettled    = SETTLED | REFUNDED | REVERSED     (بعدِ پست شدن)
isPending    = PENDING                            (ممکن است برگردد)
settledNet   = فقط settled ها — PENDING/FAILED هرگز در خلاصه حساب نمی‌شوند
cursor       = "آخرین id دیده‌شده" — پایدار در برابر ورود ردیف جدید
```

**Exit gate R6:** «هیچ عملیات مالی بدون server confirmation نباید در UI قطعی نمایش داده شود» — تغییر کلیدی: intent top-up حالا با status=PENDING نمایش داده می‌شود و بعد از sync با لجر سرور SETTLED می‌شود.

## 3. Exit Gate — R6

- [x] بدون seed data و بدون synthetic balance (تست‌های موجود)
- [x] pagination پایدار + reversal pairing (+6 تست)
- [x] anti-double-submit + PENDING semantics
- [ ] receipt/invoice و chargeback (R11 contract)

**وضعیت R6: PASS — Next Allowed Train: R7 — Country + Currency + i18n**
