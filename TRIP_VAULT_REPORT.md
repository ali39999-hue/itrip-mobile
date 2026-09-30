# iTRIP Mobile — Travel Vault Report (R5 — Travel Vault + In-Trip Mode)

**Generated:** 2026-09-30
**Evidence:** 216/216 تست (34 فایل)، typecheck/lint سبز، parity ۵×۱۸۹، باندل production موفق.

---

## 1. وضعیت تسک‌های R5

| R5 Task | Status | Notes |
|---|---|---|
| unified trip object | ✅ **جدید (R5)** | `domains/trip/trip.ts` — `Trip` از خوشه‌بندی زمانی ووچرها (پنجره ۲ روزه) **مشتق** می‌شود؛ بدون تکرار state (pure function) |
| booking aggregation / trip timeline | ✅ **جدید (R5)** | `deriveTrips()` — مرتب‌سازی زمانی، خوشه‌بندی قطار/هتل/ترانسفر یک سفر در یک خط زمانی (8 تست) |
| **in-trip mode (active trip finder)** | ✅ **جدید (R5)** | `findActiveTrip()` — سفر در جریان یا سفر بعدی؛ ورودی هوای «امروز کجای سفرم هستم» |
| tickets / boarding pass / hotel voucher / tour voucher / transfer details | ✅ موجود | ۴ نوع ووچر + بارکد آفلاین (R0) |
| offline QR | ✅ موجود | QRCode + بارکدهای IATA/هتل/تور/ترانسفر |
| **document expiry alerts** | ✅ **جدید (R5)** | `domains/trip/expiry.ts` — طبقه‌بندی EXPIRED/CRITICAL/WARNING/OK با آستانه ۹۰/۱۸۰ روز + ترتیب بدترین اول (7 تست) |
| emergency contacts / SOS flow | ✅ موجود | `sos/index.tsx` — dialer ۱۱۰/۱۱۵/۱۲۵ + مبدل آفلاین + phrasebook |
| lost connectivity mode | ✅ موجود | ووچر/QR/آدرس فارسی/مبدل/phrasebook همگی بدون شبکه |
| secure share / revoke | ⏳ R5-next | طراحی نیاز به تصمیم رمزنگاری share-link (با R11) |
| visa/insurance documents در vault | 🟡 partial | مدل ویزا آماده (R0)؛ اتصال vault در sprint بعدی |
| trip map / daily itinerary / in-trip checklist / airport quick mode / battery-conscious | ⏳ R8/R9 | نیاز به Maps SDK و device testing |

## 2. طراحی Trip Derivation (چرا مشتق، نه ذخیره‌شده؟)

```text
Vault (vouchers پراکنده)  ──deriveTrips()──►  Trip[] (timeline خوانا)
                                     └──findActiveTrip()──►  «سفر فعال»
```

- **بدون تکرار state:** ووچرها source of truth هستند؛ Trip هر بار به‌صورت deterministic مشتق می‌شود ⇒ هیچ sync داخلی برای «سفر» لازم نیست و corruption غیرممکن است.
- خوشه‌بندی greedy زمانی: ووچرهایی که فاصله زمانی‌شان ≤ ۲ روز است یک سفرند (پرواز صبح + هتل چار+ ترانسفر).
- پایان سفر per-kind: هتل→checkout، پرواز→arrival، تور→آخرین روز، ترانسفر→+2h.

## 3. Exit Gate — R5

- [x] مسافر با اینترنت صفر می‌تواند اطلاعات حیاتی سفر را ببیند (ووچر/QR/آدرس/تلفن/مبدل/phrasebook)
- [x] خط زمانی سفر و سفر فعال از ووچرهای موجود مشتق می‌شود (+15 تست)
- [x] هشدار انقضای مدارک با پالیسی قابل تست و مرتب‌سازی بدترین‌اول
- [ ] secure share/revoke (R5-next با R11)
- [ ] trip map و battery-conscious mode (R8/R9 با دستگاه)

**وضعیت R5: PASS — Next Allowed Train: R6 — Wallet + Payments + Commerce**
