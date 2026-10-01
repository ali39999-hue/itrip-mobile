# iTRIP Mobile → Firuzo-Grade Master Roadmap

**Target Repository:** https://github.com/ali39999-hue/itrip-mobile  
**Parent Platform:** https://github.com/ali39999-hue/itrip-platform  
**Product Goal:** تبدیل `itrip-mobile` از یک Advanced MVP / Engineering Preview به یک Mobile Super-App واقعی، production-grade، offline-first، secure، multi-country، multi-currency، multi-lingual و همگام با اکوسیستم Firuzo.

> وضعیت مبنا: این سند برای ساخت نسخه هدف طراحی شده است و باید در هر release cycle با وضعیت واقعی repository، backend contract و native build دوباره validate شود.

### Snapshot تأییدشده در 2026-09-30

بررسی دوباره `main` نشان داد repository همچنان عمومی و فعال است و در زمان بررسی 13 commit و ساختار native/Expo کامل دارد. مهم‌ترین نکته جدید این است که `app.json` و Android `build.gradle` روی **0.4.0 / versionCode 4** هستند، در حالی که `package.json` هنوز **0.3.0** است؛ بنابراین version drift فعلی باید به‌عنوان P0 Release Integrity ثبت شود. README و release notes نیز هنوز متن‌های v0.3.0 را حمل می‌کنند. همچنین release signing اکنون در Gradle به `signingConfigs.release` متصل شده و fail-closed طراحی شده است، پس task مربوط به signing از «پیاده‌سازی» به «ممیزی و CI validation» منتقل شده است. Auth نیز mock user قبلی را ندارد و از `/user/profile` استفاده می‌کند، اما در صورت شکست profile fetch، session با `pending_profile` باقی می‌ماند و این حالت باید در R1 صریحاً حل شود. Wallet هم اکنون با `balances: null` و ledger خالی شروع می‌شود و داده مالی synthetic ندارد.

منبع وضعیت فعلی: GitHub `main` و فایل‌های `app.json`، `package.json`، `android/app/build.gradle`، `src/stores/authStore.ts` و `src/stores/walletStore.ts`.

---

## 1. تعریف مقصد نهایی

محصول نهایی نباید صرفاً «نسخه موبایل سایت» باشد. باید یک **Mobile Travel Operating System** باشد که با Firuzo Core Platform کار می‌کند اما منطق تجربه موبایل، offline، device، identity، notifications، biometric، wallet presentation، travel vault و in-trip assistance را خودش مدیریت می‌کند.

### 1.1 اصول معماری نهایی

```text
                    ┌──────────────────────────────┐
                    │       Firuzo Core / ERP      │
                    │ CMS • CRM • Booking • KYC    │
                    │ Wallet • Pricing • Catalog   │
                    └──────────────┬───────────────┘
                                   │
                         Contract / Events / API
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
      ┌───────▼────────┐                       ┌────────▼─────────┐
      │ iTRIP Mobile   │                       │ Firuzo Web       │
      │ React Native   │                       │ Next.js          │
      └───────┬────────┘                       └──────────────────┘
              │
      ┌───────▼─────────────────────────────────────────┐
      │ Mobile Experience Layer                         │
      │                                                 │
      │ Auth • Device • Offline • Vault • Push • Deep   │
      │ Links • Biometrics • Location • Camera • QR     │
      │ Notifications • Mobile UX • Accessibility       │
      └───────┬─────────────────────────────────────────┘
              │
      ┌───────▼─────────────────────────────────────────┐
      │ Local Data Layer                                │
      │ SQLCipher/SQLite • Cache • Mutation Queue       │
      │ Idempotency • Conflict Resolution • Encryption  │
      └─────────────────────────────────────────────────┘
```

### 1.2 قانون طلایی

- **Server is authoritative** برای User, Booking, Wallet, Payment, KYC, Pricing و entitlement.
- **Device is authoritative** برای presentation cache، offline vault cache، queued user intents و device capabilities.
- هیچ داده مالی یا هویتی demo نباید در production bundle قابل فعال‌شدن باشد.
- هیچ fail-open امنیتی برای Vault، Token، Signing یا Release وجود نداشته باشد.
- همه قابلیت‌های حساس باید قابل مشاهده، تست و audit باشند.

---

# 2. معیار سطح هدف

برای رسیدن به سطح موردنظر Firuzo، معیارهای پذیرش این‌ها هستند:

| حوزه | هدف |
|---|---|
| Crash-free sessions | ≥ 99.8% هدف عملیاتی اولیه |
| TypeScript strictness | بدون `any` غیرضروری و بدون `ts-ignore` جدید |
| Test coverage | Domain ≥ 90%، critical flows ≥ 95% |
| E2E | مسیرهای P0 روی Android و iOS |
| Offline | Booking/Vault display بدون شبکه کار کند |
| Sync | idempotent، resumable، observable |
| Security | MASVS-oriented controls + automated scanning |
| Accessibility | P0 screens بدون blocker و با screen reader قابل استفاده |
| i18n | هیچ متن UI خارج از translation system |
| RTL | parity واقعی، نه صرفاً direction flag |
| Release | signed build، reproducible، version-consistent |
| Performance | cold start، TTI و list scrolling دارای budget باشند |
| Observability | crash/error/performance/network/sync telemetry |
| Mobile UX | loading/error/empty/offline states استاندارد و یکپارچه |
| Backend contract | generated/validated contracts، بدون DTO drift |
| Feature delivery | remote config / flags برای featureهای پرریسک |

---

# 3. وضعیت مبنا و مهم‌ترین Gapها

این roadmap از مواردی که در بررسی repository مشخص شده‌اند شروع می‌کند:

### P0 فعلی

- حذف کامل Demo Identity / hard-coded active user از auth bootstrap و جلوگیری از باقی‌ماندن `pending_profile` در session معتبر.
- حذف Seed Financial Data و هر wallet transaction نمایشی از production path.
- رفع version drift فعلی بین `package.json` (0.3.0) و `app.json`/Android Gradle (0.4.0 / versionCode 4) و هم‌تراز کردن README/release notes.
- یکسان‌سازی نسخه package/app/Android Gradle.
- ممیزی release signing و CI enforcement؛ configuration فعلی باید در هر release با keystore واقعی validate شود.
- fail-closed کردن secure storage / encrypted database در production.
- اصلاح ادعای SSL pinning و تفکیک guard از pinning واقعی.
- بازبینی placeholder host و network security configuration.

### P1 فعلی

- هماهنگ‌سازی ProGuard/R8 rules با dependencyهای واقعی.
- ارتقای i18n از key parity به runtime/UI parity.
- افزایش UI coverage برای Domainهای Tour/Visa/Rental/Transfer/CIP/eSIM.
- Android/iOS E2E واقعی.
- Native release verification.
- observability کامل sync و wallet.
- استانداردسازی design system.

---

# 4. Release Train اصلی

نسخه هدف را به 12 قطار انتشار تقسیم کنید. هر قطار می‌تواند چند sprint داشته باشد.

```text
R0  Baseline & Freeze
R1  Security + Identity Hardening
R2  Data + Sync Reliability
R3  Navigation + Design System
R4  Core Booking Experience
R5  Travel Vault + In-Trip Mode
R6  Wallet + Payments + Commerce
R7  Country + Currency + i18n
R8  Maps + Location + Notifications
R9  Performance + Accessibility
R10 Observability + QA + Chaos
R11 Production Release + Firuzo Integration
```

---

# 5. Roadmap کامل با Taskهای اجرایی

## R0 — Baseline & Freeze

### هدف
ساخت baseline قابل اندازه‌گیری قبل از تغییرات بزرگ.

### Tasks

- [ ] snapshot از `main` و tag نسخه فعلی.
- [ ] ثبت Node/PNPM/Yarn/npm/Expo/React Native versions.
- [ ] ثبت Android SDK / Gradle / JDK / Kotlin versions.
- [ ] ثبت iOS deployment target / Xcode requirement.
- [ ] تولید SBOM dependencyها.
- [ ] ثبت critical dependencies و license inventory.
- [ ] اجرای typecheck.
- [ ] اجرای lint.
- [ ] اجرای unit tests.
- [ ] اجرای Expo export.
- [ ] build واقعی Android debug.
- [ ] build واقعی Android release candidate.
- [ ] build iOS simulator.
- [ ] baseline performance profile.
- [ ] baseline bundle size.
- [ ] baseline JS/native crashes.
- [ ] baseline accessibility audit.
- [ ] ثبت architecture decision records.
- [ ] freeze public API shapes تا پایان R2.

### خروجی

`BASELINE_REPORT.md`

### Exit Gate

هیچ تغییر معماری وارد branch اصلی نشود مگر اینکه baseline reproducible باشد.

---

## R1 — Security + Identity Hardening

### هدف
ساخت هسته identity و device security واقعی.

### Tasks

- [ ] حذف mock user از `bootstrapAuth`.
- [ ] ایجاد `/me` یا contract معادل authoritative.
- [ ] token lifecycle استاندارد.
- [ ] access token کوتاه‌عمر.
- [ ] refresh rotation در backend.
- [ ] device/session registry.
- [ ] revoke session.
- [ ] biometric unlock.
- [ ] passcode fallback.
- [ ] secure key storage.
- [ ] encrypted local DB.
- [ ] key rotation strategy.
- [ ] jailbreak/root detection policy.
- [ ] screenshot protection برای صفحات حساس در Android در صورت نیاز.
- [ ] clipboard policy برای token/financial data.
- [ ] certificate pinning در native layer، با rotation plan.
- [ ] network security config cleanup.
- [ ] R8/ProGuard rules.
- [ ] secret scanning.
- [ ] dependency vulnerability scan.
- [ ] threat model برای Auth, Wallet, Vault, Booking.
- [ ] OWASP MASVS checklist.

### خروجی

`SECURITY_BASELINE.md`

### Exit Gate

هیچ credential، token، wallet seed یا mock identity نباید در production artifact باقی بماند.

---

## R2 — Data + Sync Reliability

### هدف
تبدیل offline-first به offline-reliable.

### Tasks

- [ ] canonical local schema.
- [ ] schema migrations.
- [ ] migration rollback strategy.
- [ ] persistent mutation queue.
- [ ] idempotency keys.
- [ ] retry backoff.
- [ ] dead-letter queue محلی.
- [ ] sync state machine.
- [ ] conflict detection.
- [ ] conflict resolution policy برای entityها.
- [ ] server version / ETag / revision strategy.
- [ ] network reachability.
- [ ] background sync.
- [ ] foreground resync.
- [ ] sync progress UI.
- [ ] sync error UI.
- [ ] offline badge.
- [ ] stale data policy.
- [ ] data TTL.
- [ ] selective cache eviction.
- [ ] logout data wipe.
- [ ] account switch wipe.
- [ ] encrypted backups policy.
- [ ] telemetry برای sync failures.

### Exit Gate

قطع اینترنت در هر مرحله نباید باعث duplicate booking/payment یا corruption محلی شود.

---

## R3 — Navigation + Design System

### هدف
یک Mobile Design System واقعی و قابل توسعه.

### Tasks

- [ ] inventory کامل screenها.
- [ ] user journey map.
- [ ] information architecture.
- [ ] navigation map.
- [ ] modal/bottom-sheet policy.
- [ ] design tokens.
- [ ] typography scale.
- [ ] spacing scale.
- [ ] radius system.
- [ ] elevation/shadow system.
- [ ] semantic colors.
- [ ] dark mode.
- [ ] high contrast.
- [ ] skeleton system.
- [ ] loading system.
- [ ] empty state system.
- [ ] error state system.
- [ ] offline state system.
- [ ] form system.
- [ ] validation system.
- [ ] toast/banner/snackbar system.
- [ ] CTA hierarchy.
- [ ] haptic feedback policy.
- [ ] motion system.
- [ ] reduced motion.
- [ ] accessibility labels.
- [ ] test IDs.
- [ ] Storybook/catalogue برای components.

### Exit Gate

هیچ screen جدیدی بدون استفاده از Design System اجازه merge نداشته باشد.

---

## R4 — Core Booking Experience

### هدف
Booking experience هم‌سطح marketplaceهای حرفه‌ای.

### Tasks

- [ ] destination search.
- [ ] date selection.
- [ ] traveler/passenger management.
- [ ] filters.
- [ ] sort.
- [ ] availability state.
- [ ] price breakdown.
- [ ] taxes/fees.
- [ ] currency conversion display.
- [ ] fare rules.
- [ ] cancellation policy.
- [ ] traveler forms.
- [ ] saved travelers.
- [ ] document validation.
- [ ] voucher preview.
- [ ] booking review.
- [ ] payment method selection.
- [ ] 3DS/redirect state.
- [ ] payment pending.
- [ ] payment failed/retry.
- [ ] booking pending.
- [ ] booking confirmed.
- [ ] partial failure handling.
- [ ] idempotent submit.
- [ ] receipt.
- [ ] invoice link.
- [ ] share itinerary.

### Exit Gate

از Search تا Confirmed Booking هیچ route بن‌بستی نداشته باشد.

---

## R5 — Travel Vault + In-Trip Mode

### هدف
یکی از مهم‌ترین differentiatorهای iTRIP.

### Tasks

- [ ] unified trip object.
- [ ] booking aggregation.
- [ ] tickets.
- [ ] boarding pass.
- [ ] hotel voucher.
- [ ] tour voucher.
- [ ] visa documents.
- [ ] insurance documents.
- [ ] transfer details.
- [ ] emergency contacts.
- [ ] offline QR.
- [ ] offline PDF/image cache.
- [ ] document expiry alerts.
- [ ] secure share.
- [ ] revoke shared item.
- [ ] trip timeline.
- [ ] trip map.
- [ ] daily itinerary.
- [ ] in-trip checklist.
- [ ] local emergency information.
- [ ] SOS flow.
- [ ] lost connectivity mode.
- [ ] battery-conscious mode.
- [ ] airport quick mode.

### Exit Gate

مسافر با اینترنت صفر بتواند اطلاعات حیاتی trip را مشاهده کند.

---

## R6 — Wallet + Payments + Commerce

### هدف
Wallet واقعی و قابل اعتماد، بدون seed data.

### Tasks

- [ ] authoritative balance API.
- [ ] transaction pagination.
- [ ] pending transaction state.
- [ ] reversed transaction.
- [ ] refunded transaction.
- [ ] multi-currency wallet presentation.
- [ ] currency precision policy.
- [ ] payment intents.
- [ ] 3DS.
- [ ] wallet top-up.
- [ ] wallet debit.
- [ ] partial refund.
- [ ] full refund.
- [ ] payment retry.
- [ ] receipt.
- [ ] invoice.
- [ ] chargeback state.
- [ ] anti-double-submit.
- [ ] device confirmation.
- [ ] biometric confirmation برای عملیات پرریسک.
- [ ] finance telemetry.
- [ ] transaction audit trail.

### Exit Gate

هیچ عملیات مالی بدون server confirmation نباید در UI به‌عنوان قطعی نمایش داده شود.

---

## R7 — Country + Currency + i18n

### هدف
Mobile app باید country-reactive باشد ولی business rules از UI جدا بمانند.

### Tasks

- [ ] country context.
- [ ] locale context.
- [ ] currency context.
- [ ] timezone context.
- [ ] tax context.
- [ ] payment availability matrix.
- [ ] KYC requirements matrix.
- [ ] feature availability matrix.
- [ ] service availability matrix.
- [ ] pricing locale.
- [ ] number formatting.
- [ ] date formatting.
- [ ] calendar system policy.
- [ ] RTL.
- [ ] text expansion tests.
- [ ] translation completeness check.
- [ ] runtime missing-key guard.
- [ ] Persian/Arabic QA.
- [ ] English QA.
- [ ] CJK QA.
- [ ] Russian QA.
- [ ] pseudo-localization.

### Exit Gate

یک country یا locale جدید بدون تغییر business domain و بدون fork کردن UI قابل اضافه شدن باشد.

---

## R8 — Maps + Location + Notifications

### Tasks

- [ ] location permissions.
- [ ] precise/coarse location handling.
- [ ] map provider abstraction.
- [ ] route preview.
- [ ] airport/hotel/tour pins.
- [ ] geocoding.
- [ ] background location فقط در use-caseهای ضروری.
- [ ] notification permission UX.
- [ ] notification categories.
- [ ] deep-link actions.
- [ ] trip reminders.
- [ ] boarding alerts.
- [ ] payment alerts.
- [ ] booking status alerts.
- [ ] sync alerts.
- [ ] localized push.
- [ ] notification deduplication.
- [ ] server-driven notification preferences.
- [ ] push analytics.

### Exit Gate

تمام notificationها به یک deep-link معتبر ختم شوند و event تکراری تولید نکنند.

---

## R9 — Performance + Accessibility

### Performance Tasks

- [ ] startup budget.
- [ ] JS bundle profiling.
- [ ] screen transition budget.
- [ ] list virtualization.
- [ ] image optimization.
- [ ] cache policy.
- [ ] prefetch strategy.
- [ ] memoization review.
- [ ] unnecessary render detection.
- [ ] low-end Android profiling.
- [ ] battery profiling.
- [ ] memory pressure tests.
- [ ] offline DB performance.

### Accessibility Tasks

- [ ] screen reader navigation.
- [ ] focus order.
- [ ] semantic labels.
- [ ] hit target sizes.
- [ ] contrast.
- [ ] dynamic text.
- [ ] reduced motion.
- [ ] error announcements.
- [ ] form field hints.
- [ ] accessible bottom sheets.
- [ ] accessible QR/document screens.

### Exit Gate

P0 user journey روی low-end device بدون jank بحرانی و با screen reader قابل انجام باشد.

---

## R10 — Observability + QA + Chaos

### Tasks

- [ ] crash reporting.
- [ ] breadcrumbs.
- [ ] session context.
- [ ] network tracing.
- [ ] sync metrics.
- [ ] wallet metrics.
- [ ] booking metrics.
- [ ] performance metrics.
- [ ] release health.
- [ ] feature flag metrics.
- [ ] analytics event schema.
- [ ] PII scrubbing.
- [ ] synthetic journeys.
- [ ] network chaos.
- [ ] airplane mode tests.
- [ ] slow 2G/3G tests.
- [ ] API 500/429 tests.
- [ ] duplicate submit tests.
- [ ] clock skew tests.
- [ ] timezone change tests.
- [ ] app kill/resume tests.
- [ ] DB migration tests.
- [ ] token expiry tests.
- [ ] background task termination tests.

### Exit Gate

هر P0 failure باید قابل reproduce، observe، trace و classify باشد.

---

## R11 — Production Release + Firuzo Integration

### Tasks

- [ ] OpenAPI/contract inventory.
- [ ] contract diff CI.
- [ ] auth contract integration.
- [ ] catalog integration.
- [ ] search integration.
- [ ] booking integration.
- [ ] wallet integration.
- [ ] payment integration.
- [ ] KYC integration.
- [ ] notifications integration.
- [ ] CRM/customer timeline integration.
- [ ] feature flag integration.
- [ ] remote config.
- [ ] ERP deep links.
- [ ] support ticket integration.
- [ ] consent/privacy flow.
- [ ] data deletion flow.
- [ ] account export.
- [ ] release signing.
- [ ] store metadata.
- [ ] staged rollout.
- [ ] rollback strategy.
- [ ] crash threshold gate.
- [ ] release train dashboard.

### Exit Gate

نسخه Production تنها در صورت عبور تمام Quality Gates منتشر شود.

---

# 6. Definition of Done مشترک برای تمام تسک‌ها

هر task فقط زمانی Done است که:

- [ ] کد merge شده باشد.
- [ ] typecheck سبز باشد.
- [ ] lint سبز باشد.
- [ ] test مرتبط نوشته شده باشد.
- [ ] error/loading/empty/offline state مشخص باشد.
- [ ] accessibility بررسی شده باشد.
- [ ] i18n کامل شده باشد.
- [ ] analytics/event در صورت نیاز اضافه شده باشد.
- [ ] security implication بررسی شده باشد.
- [ ] performance implication بررسی شده باشد.
- [ ] documentation/ADR به‌روز باشد.
- [ ] E2E در صورت P0/P1 بودن feature اضافه شده باشد.
- [ ] هیچ mock/seed/debug artifact وارد production path نشده باشد.

---

# 7. ساختار پیشنهادی Agent Skills — 10 Skill

این 10 Skill باید به‌صورت فایل مستقل در پروژه یا Agent runtime نگهداری شوند.

```text
.ai/skills/
├── mobile-architecture/SKILL.md
├── domain-engineering/SKILL.md
├── offline-sync/SKILL.md
├── security-mobile/SKILL.md
├── design-system-ux/SKILL.md
├── testing-e2e/SKILL.md
├── performance-accessibility/SKILL.md
├── observability-release/SKILL.md
├── firuzo-contract-integration/SKILL.md
└── agent-orchestration/SKILL.md
```

## SKILL-01 — Mobile Architecture

**Mission:** حفظ معماری لایه‌ای و جلوگیری از وابستگی Domain به UI/native.

**Must enforce:**
- Domain مستقل از React Native.
- UI فقط orchestration.
- Infrastructure پشت interface.
- Dependency direction یک‌طرفه.
- ADR برای تغییرات معماری.

**Inputs:** task + current architecture + dependency graph.

**Outputs:** implementation plan + changed files + ADR + tests.

**Stop conditions:** circular dependency، domain import از UI/native، bypass کردن service boundary.

---

## SKILL-02 — Domain Engineering

**Mission:** ساخت business logic قابل تست و platform independent.

**Modules:** Booking, Money, Wallet, Voucher, Hotel, Tour, Visa, Rental, Transfer, Identity, KYC.

**Must enforce:**
- invariantها explicit باشند.
- state transitionها deterministic باشند.
- money با decimal semantics.
- idempotency برای mutationهای حساس.
- validation با schema.

---

## SKILL-03 — Offline Sync

**Mission:** offline-first واقعی با consistency قابل توضیح.

**Must enforce:**
- local-first read.
- persistent mutation queue.
- retry with backoff.
- idempotency.
- conflict resolution.
- stale data semantics.
- encrypted cache/vault.
- telemetry.

**Never:** optimistic financial confirmation.

---

## SKILL-04 — Mobile Security

**Mission:** MASVS-oriented security.

**Scope:** auth, token, secure storage, SQLCipher, certificate pinning, permissions, screenshots, clipboard, logs, secrets, root/jailbreak, R8.

**Mandatory checks:**
- secret scan.
- dependency scan.
- static analysis.
- production config scan.
- debug artifact scan.

---

## SKILL-05 — Design System + UX

**Mission:** تبدیل UI به سیستم، نه collection of screens.

**Must enforce:**
- tokens.
- component primitives.
- states.
- navigation consistency.
- RTL.
- motion.
- accessibility.
- mobile ergonomics.
- touch targets.

---

## SKILL-06 — Testing + E2E

**Mission:** confidence در behavior واقعی.

**Pyramid:**

```text
              E2E
           /       \
       Integration  Native
       /                 \
    Domain/Unit          Contract
```

**Must cover:** auth, search, booking, wallet, vault, offline, sync, notifications, deep links, migrations.

---

## SKILL-07 — Performance + Accessibility

**Mission:** تجربه یکسان در high-end و low-end device.

**Must enforce:**
- budgets.
- profiling before optimizing.
- list virtualization.
- image strategy.
- memory discipline.
- screen reader.
- dynamic type.
- contrast.
- reduced motion.

---

## SKILL-08 — Observability + Release

**Mission:** build/release قابل اعتماد.

**Must enforce:**
- version consistency.
- signed artifact.
- changelog.
- Sentry/telemetry.
- rollout gates.
- crash threshold.
- rollback.
- artifact provenance.

---

## SKILL-09 — Firuzo Contract Integration

**Mission:** اتصال iTRIP Mobile به Firuzo بدون duplication و contract drift.

**Must enforce:**
- API contracts.
- generated types.
- versioned endpoints.
- idempotency.
- auth compatibility.
- event compatibility.
- country/currency/locale context.
- customer 360 hooks.
- ERP/CMS integration boundaries.

---

## SKILL-10 — Multi-Agent Orchestration

**Mission:** جلوگیری از تداخل Agentها.

### Rule
هر task دقیقاً یک owner دارد.

```text
Planner
  ↓
Architect
  ↓
Domain / UX / Security / QA specialists
  ↓
Integrator
  ↓
Verifier
  ↓
Release Agent
```

### Agent rules

- هیچ agent بدون reading current state تغییر معماری ندهد.
- هر agent قبل از edit باید changed-surface اعلام کند.
- دو agent همزمان روی یک file مجاز نیستند مگر Integrator هماهنگ کند.
- agent نباید API موجود را بی‌دلیل rename کند.
- migration باید backward-compatible باشد مگر release gate اجازه breaking change بدهد.
- همه تغییرات باید testable باشند.

---

# 8. 100 GitHub Repository Reference Library

> این فهرست برای **reference / pattern mining / architecture study / selective dependency adoption** است. قرار نیست همه repositoryها وارد پروژه شوند. قبل از استفاده مستقیم، compatibility، license، maintenance status، security advisories و version matrix بررسی شود.

> شمارش اصلی این کتابخانه دقیقاً **100 مورد شماره‌گذاری‌شده** است. دو لینک بالای سند (`itrip-mobile` و `itrip-platform`) پروژه‌های خودمان هستند و جزو 100 مرجع حساب نمی‌شوند.

## A. React Native / Expo / Navigation / Native UI

1. [facebook/react-native](https://github.com/facebook/react-native) — React Native core و معماری New Architecture.
2. [expo/expo](https://github.com/expo/expo) — Expo SDK، native modules و tooling.
3. [react-navigation/react-navigation](https://github.com/react-navigation/react-navigation) — navigation patterns.
4. [software-mansion/react-native-reanimated](https://github.com/software-mansion/react-native-reanimated) — animation و UI-thread worklets.
5. [software-mansion/react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler) — gesture architecture.
6. [software-mansion/react-native-screens](https://github.com/software-mansion/react-native-screens) — native screen management.
7. [software-mansion/react-native-safe-area-context](https://github.com/software-mansion/react-native-safe-area-context) — safe areas.
8. [Shopify/flash-list](https://github.com/Shopify/flash-list) — high-performance lists.
9. [callstack/react-native-paper](https://github.com/callstack/react-native-paper) — production-grade component patterns.
10. [callstack/react-native-pager-view](https://github.com/callstack/react-native-pager-view) — native paging.
11. [react-native-community/react-native-maps](https://github.com/react-native-maps/react-native-maps) — map integration patterns.
12. [mrousavy/react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera) — camera/QR/vision.
13. [software-mansion/react-native-svg](https://github.com/software-mansion/react-native-svg) — SVG rendering.
14. [Shopify/react-native-skia](https://github.com/Shopify/react-native-skia) — advanced 2D rendering.
15. [lottie-react/lottie-react-native](https://github.com/lottie-react/lottie-react-native) — motion assets.
16. [nativewind/nativewind](https://github.com/nativewind/nativewind) — utility-first RN styling patterns.
17. [tamagui/tamagui](https://github.com/tamagui/tamagui) — cross-platform design system ideas.
18. [gluestack/gluestack-ui](https://github.com/gluestack/gluestack-ui) — component system patterns.
19. [storybookjs/react-native](https://github.com/storybookjs/react-native) — component-driven development.
20. [oblador/react-native-performance](https://github.com/oblador/react-native-performance) — React Native Performance API, render/network/TTI instrumentation و performance tooling.

## B. State / Data Fetching / Validation / Forms

21. [pmndrs/zustand](https://github.com/pmndrs/zustand) — lightweight client state.
22. [reduxjs/redux-toolkit](https://github.com/reduxjs/redux-toolkit) — structured state architecture.
23. [TanStack/query](https://github.com/TanStack/query) — server state, cache، sync و mutations.
24. [jotai/jotai](https://github.com/pmndrs/jotai) — atomic state patterns.
25. [statelyai/xstate](https://github.com/statelyai/xstate) — state machines برای Auth/Booking/Sync.
26. [react-hook-form/react-hook-form](https://github.com/react-hook-form/react-hook-form) — forms.
27. [colinhacks/zod](https://github.com/colinhacks/zod) — runtime schema validation.
28. [ianstormtaylor/superstruct](https://github.com/ianstormtaylor/superstruct) — schema validation reference.
29. [mswjs/msw](https://github.com/mswjs/msw) — API mocking و contract tests.
30. [axios/axios](https://github.com/axios/axios) — HTTP client patterns.

## C. Offline / Local DB / Sync

31. [Nozbe/WatermelonDB](https://github.com/Nozbe/WatermelonDB) — offline-first database architecture.
32. [mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) — fast local key/value storage patterns.
33. [realm/realm-js](https://github.com/realm/realm-js) — mobile database and sync concepts.
34. [powersync-ja/powersync-js](https://github.com/powersync-ja/powersync-js) — sync engine architecture.
35. [electric-sql/electric](https://github.com/electric-sql/electric) — sync/replication patterns.
36. [pubkey/rxdb](https://github.com/pubkey/rxdb) — reactive local database and replication.
37. [tinyplex/tinybase](https://github.com/tinyplex/tinybase) — local-first reactive data patterns.
38. [pouchdb/pouchdb](https://github.com/pouchdb/pouchdb) — local/offline replication concepts.
39. [rocicorp/mono](https://github.com/rocicorp/mono) — sync/data architecture reference.
40. [OP-TEE/optee_os](https://github.com/OP-TEE/optee_os) — trusted execution / secure-world reference for security architecture; not a direct RN dependency.

## D. Security / Identity / Mobile Hardening

41. [oblador/react-native-keychain](https://github.com/oblador/react-native-keychain) — iOS Keychain / Android Keystore.
42. [invertase/react-native-firebase](https://github.com/invertase/react-native-firebase) — Auth/App Check/Crashlytics/FCM and native Firebase integration.
43. [SelfLender/react-native-biometrics](https://github.com/SelfLender/react-native-biometrics) — biometric auth patterns.
44. [OWASP/owasp-masvs](https://github.com/OWASP/owasp-masvs) — mobile application security verification standard.
45. [OWASP/owasp-mastg](https://github.com/OWASP/owasp-mastg) — mobile application security testing guide.
46. [MobSF/Mobile-Security-Framework-MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) — automated mobile security analysis.
47. [semgrep/semgrep](https://github.com/semgrep/semgrep) — static analysis and custom security rules.
48. [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) — secret scanning.
49. [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) — secret discovery.
50. [ossf/scorecard](https://github.com/ossf/scorecard) — supply-chain security posture.

## E. Testing / E2E / Quality

51. [callstack/react-native-testing-library](https://github.com/callstack/react-native-testing-library) — component behavior testing.
52. [jestjs/jest](https://github.com/jestjs/jest) — unit test ecosystem.
53. [vitest-dev/vitest](https://github.com/vitest-dev/vitest) — fast TS/JS test runner.
54. [wix/Detox](https://github.com/wix/Detox) — React Native E2E testing.
55. [mobile-dev-inc/maestro](https://github.com/mobile-dev-inc/maestro) — mobile UI flows.
56. [appium/appium](https://github.com/appium/appium) — native mobile automation reference.
57. [microsoft/playwright](https://github.com/microsoft/playwright) — web/contract/supporting E2E.
58. [cypress-io/cypress](https://github.com/cypress-io/cypress) — complementary web E2E patterns.
59. [faker-js/faker](https://github.com/faker-js/faker) — deterministic synthetic test data patterns.
60. [kulshekhar/ts-jest](https://github.com/kulshekhar/ts-jest) — TypeScript/Jest integration reference.

## F. Observability / Analytics / Reliability

61. [getsentry/sentry-react-native](https://github.com/getsentry/sentry-react-native) — crashes, errors, performance, release health.
62. [open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js) — telemetry architecture.
63. [grafana/k6](https://github.com/grafana/k6) — load/performance testing.
64. [prometheus/prometheus](https://github.com/prometheus/prometheus) — metrics model.
65. [grafana/grafana](https://github.com/grafana/grafana) — observability dashboards.
66. [jaegertracing/jaeger](https://github.com/jaegertracing/jaeger) — distributed tracing concepts.
67. [posthog/posthog](https://github.com/PostHog/posthog) — product analytics and feature flags reference.
68. [openreplay/openreplay](https://github.com/openreplay/openreplay) — session replay/debugging reference.
69. [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript) — cross-platform observability patterns.
70. [Grafana/loki](https://github.com/grafana/loki) — log aggregation reference.

## G. Payments / Commerce / ERP / CMS

71. [stripe/stripe-react-native](https://github.com/stripe/stripe-react-native) — mobile payment UX/security patterns.
72. [stripe/stripe-js](https://github.com/stripe/stripe-js) — payment web integration reference.
73. [medusajs/medusa](https://github.com/medusajs/medusa) — headless commerce architecture.
74. [saleor/saleor](https://github.com/saleor/saleor) — commerce platform architecture.
75. [vendure-ecommerce/vendure](https://github.com/vendure-ecommerce/vendure) — commerce modularity.
76. [directus/directus](https://github.com/directus/directus) — headless CMS + data platform.
77. [strapi/strapi](https://github.com/strapi/strapi) — CMS patterns.
78. [payloadcms/payload](https://github.com/payloadcms/payload) — code-first headless CMS.
79. [odoo/odoo](https://github.com/odoo/odoo) — ERP modules/workflows.
80. [frappe/erpnext](https://github.com/frappe/erpnext) — ERP/accounting/CRM/workflow reference.

## H. Backend / Contracts / Auth / APIs

81. [nestjs/nest](https://github.com/nestjs/nest) — modular backend architecture.
82. [fastify/fastify](https://github.com/fastify/fastify) — high-performance API architecture.
83. [honojs/hono](https://github.com/honojs/hono) — lightweight edge/backend API patterns.
84. [trpc/trpc](https://github.com/trpc/trpc) — type-safe API contracts.
85. [apollographql/apollo-client](https://github.com/apollographql/apollo-client) — GraphQL client/caching.
86. [apollographql/apollo-server](https://github.com/apollographql/apollo-server) — GraphQL server reference.
87. [graphql/graphql-js](https://github.com/graphql/graphql-js) — GraphQL fundamentals.
88. [prisma/prisma](https://github.com/prisma/prisma) — type-safe database access.
89. [drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm) — SQL-first typed ORM.
90. [ory/kratos](https://github.com/ory/kratos) — identity/user management patterns.

## I. Search / Maps / Location / Media / Release

91. [mapbox/mapbox-maps-ios](https://github.com/mapbox/mapbox-maps-ios) — map SDK architecture reference.
92. [maplibre/maplibre-react-native](https://github.com/maplibre/maplibre-react-native) — open map integration.
93. [transistorsoft/react-native-background-geolocation](https://github.com/transistorsoft/react-native-background-geolocation) — advanced location behavior reference; review licensing before use.
94. [meilisearch/meilisearch](https://github.com/meilisearch/meilisearch) — search architecture.
95. [typesense/typesense](https://github.com/typesense/typesense) — search/autocomplete.
96. [minio/minio](https://github.com/minio/minio) — object storage reference for documents/media.
97. [imgproxy/imgproxy](https://github.com/imgproxy/imgproxy) — image delivery/processing.
98. [fastlane/fastlane](https://github.com/fastlane/fastlane) — mobile release automation.
99. [expo/eas-cli](https://github.com/expo/eas-cli) — Expo build/submit/update automation.
100. [changesets/changesets](https://github.com/changesets/changesets) — release/version/change management.

---

# 9. چگونه از 100 Repo استفاده شود

## دسته 1 — مطالعه مستقیم
برای معماری، tests، naming و failure handling.

## دسته 2 — Pattern Extraction
الگوی مطلوب را استخراج کنید؛ dependency را کورکورانه اضافه نکنید.

## دسته 3 — Selective Adoption
فقط وقتی انتخاب کنید که gap واقعی وجود دارد و هزینه مهاجرت قابل دفاع است.

## دسته 4 — Benchmark
برای performance، security و UX با implementation ما مقایسه کنید.

## قانون ممنوع

```text
"این repo معروف است → پس dependency را نصب کنیم"
```

قانون صحیح:

```text
Gap → Reference repo → Compare architecture → ADR → Prototype → Test → Adopt/Reject
```

---

# 10. Mapping بین Gapهای iTRIP و Repoهای مرجع

| Gap | Repoهای مرجع | خروجی مورد انتظار |
|---|---|---|
| Navigation | react-navigation, react-native-screens | navigation matrix |
| Motion | Reanimated, Gesture Handler | motion system |
| Lists | FlashList | list performance |
| Design System | Paper, Tamagui, gluestack, Storybook | component system |
| State | Zustand, RTK, XState | state boundaries |
| Server State | TanStack Query | cache/query policy |
| Local DB | WatermelonDB, Realm, RxDB | local data patterns |
| Sync | PowerSync, Electric, WatermelonDB | sync architecture |
| Secure Storage | Keychain | secure storage boundary |
| Mobile Security | MASVS, MASTG, MobSF | threat model + gates |
| Testing | RNTL, Jest, Vitest, Detox, Maestro | test pyramid |
| Observability | Sentry, OTel, Grafana | telemetry model |
| Payments | Stripe RN | payment state machine |
| Commerce | Medusa, Saleor, Vendure | commerce patterns |
| CMS | Directus, Strapi, Payload | content contract |
| ERP | Odoo, ERPNext | business workflow ideas |
| APIs | Nest, Fastify, tRPC, GraphQL | contract architecture |
| Search | Meilisearch, Typesense | search/autocomplete |
| Maps | MapLibre, Mapbox | maps abstraction |
| Release | Fastlane, EAS, Changesets | release train |

---

# 11. Backlog پیشنهادی به صورت Epic

## EPIC-01 Foundation
- [ ] Baseline report
- [ ] dependency inventory
- [ ] architecture map
- [ ] ADR system
- [ ] CI baseline

## EPIC-02 Identity
- [ ] real auth bootstrap
- [ ] token refresh
- [ ] session management
- [ ] biometric
- [ ] account switch
- [ ] logout wipe

## EPIC-03 Secure Vault
- [ ] encrypted DB
- [ ] key management
- [ ] QR vault
- [ ] document cache
- [ ] expiry alerts

## EPIC-04 Offline Sync
- [ ] mutation queue
- [ ] retries
- [ ] idempotency
- [ ] conflict resolution
- [ ] observability

## EPIC-05 Design System
- [ ] tokens
- [ ] primitives
- [ ] forms
- [ ] states
- [ ] navigation
- [ ] accessibility

## EPIC-06 Search & Discovery
- [ ] search
- [ ] filters
- [ ] sort
- [ ] destination pages
- [ ] recommendations

## EPIC-07 Booking
- [ ] traveler
- [ ] pricing
- [ ] policies
- [ ] checkout
- [ ] confirmation

## EPIC-08 Wallet
- [ ] balance
- [ ] transactions
- [ ] payment methods
- [ ] refunds
- [ ] invoices

## EPIC-09 Trips
- [ ] trip aggregation
- [ ] timeline
- [ ] vouchers
- [ ] maps
- [ ] in-trip mode

## EPIC-10 Localization
- [ ] locale
- [ ] currency
- [ ] country
- [ ] timezone
- [ ] RTL

## EPIC-11 Notifications
- [ ] push
- [ ] deep links
- [ ] reminder engine
- [ ] preferences

## EPIC-12 Security
- [ ] MASVS
- [ ] secret scan
- [ ] pinning
- [ ] R8
- [ ] permission audit

## EPIC-13 QA
- [ ] unit
- [ ] integration
- [ ] contract
- [ ] E2E
- [ ] device matrix

## EPIC-14 Performance
- [ ] startup
- [ ] list
- [ ] image
- [ ] memory
- [ ] battery

## EPIC-15 Observability
- [ ] crashes
- [ ] traces
- [ ] metrics
- [ ] release health
- [ ] business events

## EPIC-16 Firuzo Integration
- [ ] API contracts
- [ ] Customer 360
- [ ] ERP
- [ ] CMS
- [ ] CRM
- [ ] feature flags

---

# 12. Dependency Order — چیزی که نباید برعکس شود

```text
R0 Baseline
   ↓
R1 Security / Identity
   ↓
R2 Data / Sync
   ↓
R3 Design System / Navigation
   ↓
R4 Booking
   ↓
R5 Vault / In-Trip
   ↓
R6 Wallet / Payments
   ↓
R7 Country / i18n
   ↓
R8 Maps / Notifications
   ↓
R9 Performance / A11y
   ↓
R10 Observability / Chaos
   ↓
R11 Production / Firuzo Integration
```

هرگونه تغییر ترتیب باید با ADR ثبت شود.

---

# 13. Release Gate سیستماتیک

قبل از هر production release:

```text
[ ] Git clean
[ ] version consistent
[ ] lockfile valid
[ ] TypeScript PASS
[ ] Lint PASS
[ ] Unit PASS
[ ] Integration PASS
[ ] Contract PASS
[ ] E2E PASS
[ ] i18n PASS
[ ] Accessibility PASS
[ ] Security scan PASS
[ ] Secret scan PASS
[ ] Bundle budget PASS
[ ] startup budget PASS
[ ] Android release signing PASS
[ ] iOS archive PASS
[ ] crash-free threshold PASS
[ ] no demo data PASS
[ ] no placeholder endpoint PASS
[ ] no debug logging PASS
[ ] migration test PASS
[ ] rollback plan PASS
[ ] release notes PASS
```

---

# 14. Contract بین iTRIP Mobile و Firuzo

## باید مشترک باشند

- User identity
- Customer ID
- Wallet account
- Booking ID
- Trip ID
- Voucher ID
- Payment ID
- Country
- Currency
- Locale
- Timezone
- KYC status
- feature entitlements

## باید mobile-specific بمانند

- Device session
- Offline cache
- Local queue
- Vault storage
- Local biometric state
- Push token
- Deep-link handling
- Mobile-only interaction state

---

# 15. Agent Task Template

هر agent باید task را با این قالب تحویل بگیرد:

```md
## TASK
ID: MOBILE-XXXX
Priority: P0/P1/P2
Owner Skill: SKILL-XX
Dependencies: ...

### Context
...

### Allowed Surface
- ...

### Forbidden Surface
- ...

### Implementation
- [ ] ...
- [ ] ...

### Tests
- [ ] unit
- [ ] integration
- [ ] e2e

### Security
...

### UX/A11y
...

### Exit Criteria
...

### Evidence
- commit
- test output
- screenshots/video if needed
- performance/security report if needed
```

---

# 16. Orchestrator Prompt برای اجرای Roadmap

> این prompt برای Agent Orchestrator پروژه است؛ هر sprint فقط taskهای dependency-safe را آزاد کند.

```text
You are the iTRIP Mobile → Firuzo Grade Orchestrator.

Mission:
Turn the current itrip-mobile repository into a production-grade mobile travel super-app while preserving working domain behavior and avoiding unnecessary rewrites.

Primary constraints:
1. Inspect the repository before modifying it.
2. Never invent existing capabilities; verify code/config/tests.
3. Preserve stable public contracts unless an approved ADR allows a breaking change.
4. Server is authoritative for financial, identity, booking and KYC data.
5. Device is authoritative only for mobile-local state, cached vault data and queued intents.
6. No demo identity, seed wallet, fake transaction or placeholder endpoint may exist in production paths.
7. All P0/P1 features require tests and explicit failure states.
8. All UI must support localization, RTL where applicable and accessibility.
9. All security-sensitive changes require the Mobile Security Skill review.
10. Do not let two agents edit the same file concurrently.
11. Every phase ends with a verification gate.
12. Follow R0 → R11 dependency order unless an ADR explicitly changes it.
13. Use the 100-reference repository library only as a research/pattern source unless dependency adoption is justified by ADR.
14. For each task produce evidence: changed files, tests, risks, and exit-criteria status.
15. Never mark a task complete because code compiles alone.

Execution loop:
DISCOVER → PLAN → LOCK SURFACE → IMPLEMENT → TEST → SECURITY REVIEW → UX/A11Y REVIEW → INTEGRATE → VERIFY → DOCUMENT → RELEASE GATE

Definition of Done:
- implementation complete
- tests pass
- i18n complete
- accessibility checked
- security checked
- performance impact reviewed
- documentation updated
- no debug/demo artifact
- exit criteria satisfied

When a blocker is found:
1. classify P0/P1/P2
2. stop dependent tasks
3. create remediation task
4. preserve current working state
5. never hide the blocker by changing the test

Final output per release:
- completed tasks
- remaining tasks
- architecture changes
- security findings
- performance findings
- UX findings
- test matrix
- release risk
- next allowed tasks
```

---

# 17. نهایی‌ترین معیار موفقیت

محصول زمانی به سطح هدف رسیده است که کاربر بتواند:

```text
Install
  ↓
Sign up / Sign in
  ↓
Country + Language + Currency
  ↓
Discover
  ↓
Search
  ↓
Compare
  ↓
Select
  ↓
Traveler data
  ↓
Pricing
  ↓
Payment
  ↓
Confirmation
  ↓
Travel Vault
  ↓
Offline access
  ↓
Trip execution
  ↓
Notifications
  ↓
Wallet / Refund / Invoice
  ↓
Support / CRM
  ↓
Next Trip
```

و در این مسیر:

- اینترنت قطع شود → محصول نباید در بخش‌های حیاتی از کار بیفتد.
- token منقضی شود → session باید امن recovery شود.
- payment timeout شود → duplicate charge ایجاد نشود.
- booking pending شود → کاربر status واقعی ببیند.
- locale عوض شود → کل UI درست ترجمه شود.
- RTL فعال شود → layout و interaction درست باقی بماند.
- device ضعیف باشد → UX همچنان قابل استفاده باشد.
- اپ crash کند → session/trip state قابل بازیابی باشد.
- release خراب باشد → rollback ممکن باشد.
- backend contract تغییر کند → CI قبل از production آن را تشخیص دهد.

---

# 18. تعریف محصول نهایی

**iTRIP Mobile نباید «کل Firuzo روی موبایل» باشد.**

تعریف صحیح:

> **iTRIP Mobile = Firuzo Travel Experience Engine on Device**

یعنی از Firuzo این‌ها را مصرف می‌کند:

- ERP
- CMS
- CRM
- Catalog
- Pricing
- Booking
- Wallet
- KYC
- Customer 360
- Commerce

و خودش این‌ها را تخصصی می‌کند:

- Offline-first
- Travel Vault
- Device Security
- Mobile UX
- Trip Mode
- Push / Deep Links
- Biometrics
- Native capabilities
- Location
- Camera / QR
- In-trip assistance

این مرزبندی باعث می‌شود iTRIP Mobile هم‌زمان **متصل به Firuzo** و **یک محصول مستقل با منطق مخصوص خودش** باقی بماند.

---

## پایان سند

این فایل باید به عنوان `MASTER_ROADMAP.md` در repository نگهداری شود و هر Release Train نسخه‌گذاری و به‌روز شود. هیچ feature بزرگ جدیدی نباید خارج از این roadmap و بدون ثبت dependency، owner skill، tests و exit criteria وارد main شود.
