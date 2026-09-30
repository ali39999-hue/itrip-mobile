# iTRIP Mobile — Performance & Accessibility Report (R9)

**Generated:** 2026-09-30
**Evidence:** 247/247 تست (38 فایل)، lint صفر، parity ۵×۱۸۹، باندل production موفق.

---

## 1. وضعیت تسک‌های R9 (Policy + Gate این قطار؛ Device Lab به R9-next)

| R9 Task | Status | Notes |
|---|---|---|
| startup / screen-transition / battery budgets | ⏳ device lab | نیاز به دستگاه واقعی — پروفایل در R9-next |
| **bundle budget** | ✅ **جدید (R9)** | `PERF_BUDGETS.androidBundleBytes = 4.2MB` — گیت اندازه‌گیری باندل export‌شده (۳.۸۲MB فعلی با ~۹٪ حاشیه) |
| **list virtualization policy** | ✅ **جدید (R9)** | گیت: سقف dataset هر آرایه API باید ≤ `unvirtualizedListMaxItems` (۳۰) باشد |
| image/cache/prefetch strategy | 🟡 موجود جزئی | TanStack staleTime؛ بهینه‌سازی تصویر با supplier URLs در R11 |
| **reduced motion** | ✅ R3 (پین شد) | گیت source-level: Skeleton/Toast باید useReducedMotion مصرف کنند |
| **touch targets** | ✅ R3 (پین شد) | گیت: min-h-[44px] در Button |
| **semantic roles** | ✅ گیت جدید | accessibilityRole در Button/ interactive |
| **RTL logical properties** | ✅ **فیکس واقعی (R9)** | `OfflineBanner` از `ml-2` (فیزیکی) به `ms-2` (منطقی) اصلاح شد — گیت دائمی جلوگیری از رگرسیون |
| screen reader flow / focus order | ⏳ device lab | TalkBack/VoiceOver pass در R9-next |

## 2. گیت دائمی — `src/test/perf/performance.test.ts` (۹ تست)

- باندل export‌شده (وقتی موجود) زیر سقف ۴.۲MB است
- `checkBundleBudget` هم پاس و هم fail را درست محاسبه می‌کند (headroom)
- سقف آرایه‌های API (zod max) ≤ آستانه مجازی‌سازی — نتایج جستجو هرگز لیست غیرمجازی‌شده بزرگ نمی‌سازند
- reduced-motion + touch target + accessibility roles در سورس پین شده‌اند
- RTL منطقی در کامپوننت app-wide banner

**یافته واقعی این قطار:** گیت RTL یک رگرسیون موجود را پیدا و فیکس کرد (`ml-2` → `ms-2` در OfflineBanner) — دقیقاً همان چیزی که parity RTL نقشه راه می‌خواست نه فقط direction flag.

## 3. Exit Gate — R9

- [x] بودجه‌های قابل‌اندازه‌گیری پین شدند + یک فیکس a11y واقعی
- [x] گیت‌ها دائمی در `npm run verify` (بیلد با باندل بزرگ/رگرسیون a11y می‌شکند)
- [ ] profiling روی دستگاه low-end و screen-reader flow کامل (R9-next — device lab)

**وضعیت R9: PASS (policy کامل؛ device lab مستند) — Next: R10 — Observability + QA + Chaos**
