# iTRIP Mobile — Notifications & Deep Links Report (R8)

**Generated:** 2026-09-30
**Evidence:** 238/238 تست (37 فایل)، typecheck/lint سبز، parity ۵×۱۸۹.

---

## 1. وضعیت تسک‌های R8

| R8 Task | Status | Notes |
|---|---|---|
| location permissions / maps / geocoding / pins | ⏳ R8-next | نیاز به Maps SDK (MapLibre) + ADR انتخاب provider — مستلزم device testing |
| **deep-link actions** | ✅ **جدید (R8)** | `deepLinkFor()` — هر نوع payload به یک route canonical (itrip://trip/{ref}، itrip://booking/{ref}) + گیت Zod روی scheme |
| **notification deduplication** | ✅ **جدید (R8)** | `NotificationDeduplicator` — LRU باندار ۱۲۸؛ کلید dedupe per type+ref+modifier (تأخیر جدید=رویداد جدید، گیت جدید=رویداد جدید) |
| **trip reminders** | ✅ **جدید (R8)** | `planReminders()` — ۲۴ ساعت و ۲ ساعت قبل، حذف past، خروجی برای scheduler (8 تست) |
| notification permission UX | ✅ موجود | `registerForPushNotifications` با graceful null |
| notification categories | ✅ موجود | channel `travel-alerts` با MAX importance |
| booking/payment/sync alerts | ✅ موجود | payload contract با Zod (FLIGHT_DELAY/GATE_CHANGE/CHECKIN_REMINDER/BOOKING_CONFIRMED) |
| localized push | 🟡 R11 | متن سمت سرور با locale کاربر |
| push analytics | ⏳ R10 | با observability train |

## 2. Exit Gate R8 — برقرار شد

> «تمام notificationها به یک deep-link معتبر ختم شوند و event تکراری تولید نکنند.»

- `deepLinkFor` **exhaustive** است (switch روی union تایپ‌شده) — payload بدون route وجود ندارد.
- `DeepLinkSchema` ساختار لینک را اعتبارسنجی می‌کند (سه scheme مجاز manifest).
- `NotificationDeduplicator` تکرار سرور/دوکاناله را فیلتر می‌کند و رویداد جدید واقعی (زمان جدید/گیت جدید) را از تکرار تفکیک می‌کند.

## 3. Exit Gate — R8

- [x] deep links + dedupe + reminder engine (+8 تست)
- [x] Maps/Location به R8-next موکول شد (نیازمند انتخاب Map provider با ADR و device farm)
**وضعیت R8: PASS (با ۱ مورد موکول‌شده مستند) — Next: R9 — Performance + Accessibility**
