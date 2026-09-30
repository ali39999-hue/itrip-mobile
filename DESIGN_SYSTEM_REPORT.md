# iTRIP Mobile — Design System Report (R3 — Navigation + Design System)

**Generated:** 2026-09-30
**Scope:** تسک‌های R3 اجراشده در این قطار + وضعیت بقیه
**Evidence:** 188/188 تست، typecheck/lint سبز، باندل production موفق.

---

## 1. وضعیت تسک‌های R3

| R3 Task | Status | Implementation |
|---|---|---|
| design tokens | ✅ **جدید** | `src/styles/tokens.ts` — spacing (4pt grid) / radius / typography / elevation / semantic colors / motion / touch target |
| typography scale | ✅ **جدید** | 7 نقش (display…caption) با lineHeight صریح برای dynamic text |
| spacing scale | ✅ **جدید** | 8 پله روی گرید 4pt — گیت تست divisible-by-4 |
| radius system | ✅ **جدید** | 5 پله + full |
| elevation/shadow system | ✅ **جدید** | 3 سطح + none، دوتایی iOS shadow + Android elevation |
| semantic colors | ✅ **جدید** | `SemanticPalette` با 13 نقش معنایی |
| **dark mode** | ✅ **جدید (tokens + hook)** | `darkSemantic` کامل + `useTheme()`؛ مهاجرت progressive screenها به `theme.*` |
| high contrast | ⏳ R9 | نیازمند device testing |
| skeleton system | ✅ موجود + R3 | `Skeleton` — حالا با reduced-motion و theme.skeleton |
| loading system | ✅ موجود | Skeleton + ActivityIndicator + TanStack states |
| empty state system | ✅ موجود | `EmptyState` با action |
| error state system | ✅ موجود | `ErrorState` با retry |
| offline state system | ✅ موجود | `OfflineBanner` |
| form/validation system | ✅ موجود | `Input` (label/error/helper) + Zod در domain |
| **toast/banner/snackbar system** | ✅ **جدید** | `Toast.tsx` — emitter سبک + `ToastHost` متصل به root layout |
| CTA hierarchy | ✅ موجود | Button variants (brand/action/outline/ghost) — **حالا با haptic policy** |
| **haptic feedback policy** | ✅ **جدید** | `haptic` prop روی Button (none/light/medium/success/warning/error) با expo-haptics، fail-safe |
| motion system | ✅ **جدید** | `motion` tokens + **reduced-motion** |
| **reduced motion** | ✅ **جدید** | `useReducedMotion()` — Skeleton و Toast رعایت می‌کنند |
| accessibility labels | 🟡 Progressive | Button: `accessibilityState`، Skeleton: `progressbar`، Toast: `liveRegion` — بقیه screenها در R9 |
| **test IDs** | ⏳ R9/R13 | با E2E واقعی |
| inventory/journey map/IA/navigation map | ✅ موجود | ساختار مسیرها + service grid مستند |
| modal/bottom-sheet policy | ⏳ R4 | با جریان booking |
| Storybook/catalogue | ⏳ R4 | |

## 2. گیت دائمی — `src/test/design/designSystem.test.ts` (14 تست)

- گرید 4pt برای spacing؛ رشد یکنواخت radius؛ lineHeight برای همه نقش‌های تایپوگرافی
- completeness پالت تیره/روشن + تفاوت واقعی دو پالت + روشن‌شدگی primary تیره
- **پاریتی 1:1 colors.ts ↔ tailwind.config.js** (تغییر یک‌طرفه بیلد را می‌شکند)
- حداقل touch target 44؛ توالی motion timings؛ دوگانگی shadow/elevation
- source invariants: `min-h-[44px]` در Button، reduced-motion در Skeleton/Toast، `ToastHost` در layout

## 3. Exit Gate — R3

- [x] tokens + semantic palettes + dark mode foundation
- [x] toast/snackbar system متصل به root
- [x] haptic + reduced motion + touch target policy
- [x] هیچ screen جدیدی بدون Design System قابل merge نیست (گیت‌های source-level)
- [ ] accessibility کامل P0 screens (R9) — با screen reader روی دستگاه
- [ ] Storybook (R4)

**وضعیت R3: PASS — Next Allowed Train: R4 — Core Booking Experience**
