# Release v0.4.0 — Roadmap R0..R11 Complete: Production-Grade Travel Super-App

## Summary
نسخه ۰.۴.۰ نتیجه اجرای کامل ۱۲ قطار انتشار نقشه راه `MASTER_ROADMAP.md` است — از Baseline و Security Hardening تا Contract Registry و Chaos Harness. تست‌ها از ۱۳۵ به **۲۵۹** رسید (+۹۲٪) با **صفر رگرسیون**.

## Features
- **Anti-Double-Charge Payment Engine:** outcome classifier (CAPTURED/DECLINED/REDIRECT_REQUIRED/UNKNOWN) — قطع شبکه هرگز «شکست» اعلام نمی‌شود؛ verification با سرور قبل از هر تلاش مجدد
- **3D Secure Redirect Flow:** باز شدن مسیر بانکی + پیام‌های راهنمای ۵ زبانه
- **Saved Traveler Profiles:** مسافران قابل استفاده مجدد با همان PassengerSchema checkout
- **Trip Timeline & In-Trip Mode:** مشتق‌سازی deterministic سفرها از ووچرها + سفر فعال
- **Document Expiry Alerts:** هشدار انقضای پاسپورت/ویزا/بیمه با آستانه ۹۰/۱۸۰ روز
- **Ledger Semantics:** pagination پایدار، جفت‌سازی برگشت‌ها، top-up با PENDING semantics
- **Dark Mode Foundation + Design Tokens:** ۱۳ نقش معنایی، تایپوگرافی/فاصله/سایه سیستماتیک
- **Toast/Snackbar System + Haptics + Reduced Motion**
- **Locale Policies:** ارقام فارسی/عربی، تقویم جلالی، ارز پیش‌فرض هر زبان
- **Notification Deep Links + LRU Dedupe + Reminder Engine (24h/2h)**
- **Firuzo Contract Registry:** مذاکره نسخه قرارداد — drift بین پلتفرم‌ها بیلد را می‌شکند نه production

## Improvements
- Dead-Letter Queue برای موتاسیون‌های شکست‌خورده با replay امن (idempotency)
- Logout/Account-Switch Wipe کامل (تخریب کلید SQLCipher)
- Sync State Machine با transition enforcement

## Bug Fixes
- **RTL واقعی:** `ml-2` فیزیکی → `ms-2` منطقی در OfflineBanner (پیدا شده توسط گیت جدید)
- BOM UTF-8 در app.json که JSON.parse را می‌شکست (پیدا شده توسط گیت version consistency)

## Security
- (R1 — از v0.3.1) جداسازی کامل امضای release از debug، fail-closed
- گیت‌های دائمی: بدون demo identity، بدون console.log، بدون credential literal، بدون placeholder host

## Tests
- **259/259 پاس** در ۴۰ فایل (+124 تست از v0.3.0)
- گیت‌های جدید: امنیت (۱۳)، دیزاین سیستم (۱۴)، perf/a11y (۹)، قرارداد (۶)، chaos (۶)

## Known Issues (Non-Blocking)
- E2E دستگاه واقعی و crash threshold پس از rollout اولیه
- Sentry/feature-flag provider نیازمند ADR حساب ابری
- iOS archive نیازمند macOS

## Rollback Notes
- تگ قبلی: `v0.3.0` — بدون destructive migration؛ بازگشت امن

## Quality Gates
- typecheck: 0 errors · lint: 0 warnings · i18n parity: 5×189
- production bundle: ۳.۸۲MB در سقف ۴.۲MB
- APK signing: `signingConfigs.release` اختصاصی (fail-closed)
