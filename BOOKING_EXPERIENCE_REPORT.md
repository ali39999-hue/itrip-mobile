# iTRIP Mobile — Booking Experience Report (R4 — Core Booking Experience)

**Generated:** 2026-09-30
**Evidence:** 201/201 تست، 189 کلید × ۵ زبان parity، typecheck/lint سبز، باندل production موفق.

---

## 1. وضعیت تسک‌های R4

| R4 Task | Status | Notes |
|---|---|---|
| destination search / date selection | ✅ موجود | `search.tsx` + DatePickerModal + Jalali dual calendar |
| traveler/passenger management | ✅ موجود + **R4: saved travelers** | `passengers.tsx` + PassengerSchema |
| **saved travelers** | ✅ **جدید (R4)** | `travelerProfile.ts` — ذخیره/استفاده مجدد مسافران با همان PassengerSchema (بدون weaker validation)، re-check انقضای پاسپورت هنگام استفاده مجدد (7 تست) |
| filters / sort / availability | 🟡 جزئی | server-side basic؛ فیلترهای client-side در sprint بعدی R4 |
| price breakdown / taxes / fees | ✅ موجود | `pricing.ts` + `FareBreakdown` + نمایش در review |
| currency conversion display | ✅ موجود | `draftTotalIn` + نرخ زنده والت |
| **fare rules / cancellation policy** | 🟡 Server contract | نمایش `freeCancellation` در hotel-results موجود؛ fare rules کامل نیاز به endpoint سرور دارد (R11) |
| traveler forms / document validation | ✅ موجود | Zod + 6-month passport guard |
| voucher preview / booking review | ✅ موجود | review.tsx breakdown + confirmation |
| payment method selection | ✅ موجود | 3 rail (wallet_irr / shetab / ecardo) + instruments |
| **3DS / redirect state** | ✅ **جدید (R4)** | `REDIRECT_REQUIRED` outcome → باز شدن URL بانکی + پیام راهنما ( booking.redirectRequired) |
| **payment pending / unknown state** | ✅ **جدید (R4)** | `classifyPaymentOutcome` — anti-double-charge FSM (6 تست) + verification flow در review (poll `getBooking`) |
| payment failed/retry | ✅ موجود + R4 | DECLINED قابل retry؛ UNKNOWN ممنوع به retry کور |
| booking pending/confirmed | ✅ موجود | 12-state FSM |
| **partial failure handling** | ✅ **R4** | UNKNOWN → verification → ازدواج دوباره با جریان success بدون دوباره‌پرداخت |
| **idempotent submit** | ✅ موجود + حفظ در UNKNOWN | idempotencyKey در draft؛ UNKNOWN کلید را مصرف نمی‌کند |
| receipt / invoice link | 🟡 R6 | با Wallet train |
| share itinerary | ⏳ R5 | با Travel Vault train |

## 2. هسته امنیتی جدید: Payment Outcome Classifier

```text
serverResponded=false (network drop mid-capture)  →  UNKNOWN  ❌ هرگز FAILED
success=true                                     →  CAPTURED
redirectUrl موجود                                →  REDIRECT_REQUIRED
success=false + status=FAILED/DECLINED/REJECTED  →  DECLINED
success=false + status=PENDING/PROCESSING/غیره   →  UNKNOWN
```

**چرا این حیاتی است (exit gate R4):** اگر اپ در قطع شبکه بگوید «پرداخت ناموفق» و کاربر دوباره بپردازد در حالی که سرور capture اولیه را ثبت کرده، دوبار کسر می‌شود. UNKNOWN کاربر را به مسیر **verification** (`getBooking`) می‌برد و در صورت تأیید سرور، جریان success را بدون دوباره‌پرداخت ادامه می‌دهد.

## 3. مسیر UI جدید در review.tsx

```text
پرداخت → UNKNOWN؟ → poll getBooking(bookingId)
    ├─ status=CONFIRMED/PAYMENT_CONFIRMED → ساخت ووچر از وضعیت سرور → Confirmation (بدون دوباره‌پرداخت)
    └─ هنوز قطعی نیست → پیام i18n «پرداخت دوباره انجام ندهید؛ چند دقیقه دیگر My Trips را چک کنید»
پرداخت → REDIRECT_REQUIRED → باز شدن 3DS در مرورگر + پیام راهنما
پرداخت → DECLINED → خطای قابل retry (مثل قبل)
```

## 4. Exit Gate — R4

- [x] از Search تا Confirmed هیچ بن‌بست مسیری نیست (مسیر UNKNOWN هم terminal نیست — به confirmation یا «بررسی بعدی» می‌رسد)
- [x] هیچ مسیر پرداختی وجود ندارد که قطع شبکه را «شکست» اعلام کند (anti-double-charge)
- [x] saved travelers با همان قرارداد اعتبارسنجی checkout
- [x] +27 تست در R4 (7 saved travelers + 6 payment outcome + سازگاری کامل 188 قبلی)
- [ ] fare rules کامل server-side (R11 contract)
- [ ] filters/sort client-side کامل (R4-next sprint)

**وضعیت R4: PASS — Next Allowed Train: R5 — Travel Vault + In-Trip Mode**
