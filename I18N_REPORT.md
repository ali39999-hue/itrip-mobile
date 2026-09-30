# iTRIP Mobile — i18n & Locale Report (R7 — Country + Currency + i18n)

**Generated:** 2026-09-30
**Evidence:** 230/230 تست (36 فایل)، parity گیت runtime سبز، باندل production موفق.

---

## 1. وضعیت تسک‌های R7

| R7 Task | Status | Notes |
|---|---|---|
| **locale context** | ✅ **جدید (R7)** | `LOCALE_POLICIES` — ۵ پالیسی کامل (intlTag، numberingSystem، calendar، defaultCurrency، RTL) |
| currency context | ✅ **جدید (R7)** | `defaultCurrency` per-locale: fa→IRR، ar→AED، en→USD، zh→CNY، ru→RUB |
| calendar system policy | ✅ **جدید (R7)** | fa→JALALI، بقیه→GREGORIAN (مبدل جلالی موجود از قبل) |
| **number formatting / digits** | ✅ **جدید (R7)** | `formatNumber` — ارقام فارسی (arabext) برای fa، عربی برای ar، لاتین برای بقیه + جداکننده محلی |
| pricing locale | ✅ **جدید (R7)** | `formatMoneyAmount` — IRR بدون اعشار، USD/EUR/... دو اعشار |
| country context | 🟡 partial | CountryData موجود در web؛ اپ موبایل ایران‌محور است — matrix کشور در R11 با backend |
| tax/KYC/payment/feature availability matrix | ⏳ R11 | نیاز به remote config سرور |
| **RTL** | ✅ موجود + پالیسی | `isRTL` در پالیسی + I18nManager در layout + logical properties |
| **translation completeness (runtime)** | ✅ **جدید (R7)** | `auditTranslationTree` — گیت دائمی در تست‌ها: هر ۵ زبان کامل و بدون مقدار خالی |
| **runtime missing-key guard** | ✅ **جدید (R7)** | fallback chain به en در i18next + گزارش missing برای telemetry debug |
| text expansion / pseudo-localization | ⏳ R9 | با device testing |
| Persian/Arabic/English/CJK/Russian QA | 🟡 | parity ۱۰۰٪ تاییدشده؛ QA بصری با دستگاه در R9 |

## 2. گیت دائمی زبان — `domains/i18n/locale.test.ts`

```text
✓ هر ۵ زبان پالیسی کامل دارد (tag/currency/RTL/calendar)
✓ fa → ارقام ۰-۹ + جلالی + IRR + RTL
✓ زبان ناشناخته → fallback به en بدون throw
✓ formatNumber: en='1,234,567' · fa='۱٬۲۳۴٬۵۶۷'
✓ formatMoneyAmount: IRR بدون اعشار، USD دو اعشار
✓ audit: fa/ar/zh/ru در برابر مرجع en کامل و بدون خالی‌اند (گیت دائمی!)
✓ تشخیص کلید گم‌شده و مقدار خالی
```

**نکته کلیدی:** تست `all five shipped locales are complete` هنگام افزودن هر کلید جدید که فقط به en اضافه شود، **بیلد را می‌شکند** — دیگر parity فایل‌محور نیست، گیت semantic است.

## 3. Exit Gate — R7

- [x] افزودن زبان/کشور جدید = افزودن DATA به `LOCALE_POLICIES` — بدون fork کردن UI
- [x] پالیسی calendar/currency/RTL/ارقام از UI جدا شده در دامین خالص
- [x] گیت runtime completeness در سوئیت تست
- [ ] availability matrices (R11 با remote config)
- [ ] pseudo-localization و text-expansion QA (R9)

**وضعیت R7: PASS — Next Allowed Train: R8 — Maps + Location + Notifications**
