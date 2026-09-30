# Graph Report - firouzo_mobil  (2026-09-30)

## Corpus Check
- 150 files · ~130,351 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 27 file(s) not represented in the graph (top: .xml 13, .ttf 4, (none) 3)

## Summary
- 1071 nodes · 2084 edges · 68 communities (56 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `039bc5e4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- notifications/index.ts
- money
- react
- api/index.ts
- dependencies
- Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants
- iTrip Mobile — Production Build & Hardening Guide
- expo
- booking.ts
- MainApplication.kt
- compilerOptions
- سند جامع معماری، نیازمندی‌ها و نقشه راه تولید اپلیکیشن اندروید پلتفرم iTrip (Firuzo)
- stay.ts
- Toast.tsx
- سند جامع معماری فنی اپلیکیشن موبایل iTrip (Firuzo Mobile)
- scripts
- iTrip Mobile (Firuzo) · گاوصندوق دیجیتال و همراه هوشمند سفر
- passenger.ts
- client.ts
- devDependencies
- ۸. پایپ‌لاین انتشار و کنترل کیفیت موبایل (Mobile Release Train Pipeline)
- metro.config.js
- ۵. امنیت، رمزنگاری و یکپارچگی مالی (Security & Financial Invariants)
- ۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics)
- ۷. سیستم پشتیبانی ۵ زبانه و مدیریت جهت چیدمان (RTL / LTR)
- jalali.ts
- gradlew
- ۲. تصمیمات بنیادین معمارانه و استک فناوری (Architectural Decision Records)
- ۴. گاوصندوق آفلاین سفر (Offline-First Travel Vault)
- expo-secure-store.ts
- package.json
- wallet.ts
- zod
- (tabs)/_layout.tsx
- iTRIP Mobile — Booking Experience Report (R4 — Core Booking Experience)
- tour.ts
- eslint.config.mjs
- 5. Roadmap کامل با Taskهای اجرایی
- rental.ts
- i18n/index.ts
- telemetry/index.ts
- engines
- serviceIcons.ts
- iTRIP Mobile — Baseline Report (R0 — Baseline & Freeze)
- 11. Backlog پیشنهادی به صورت Epic
- authStore.ts
- 7. ساختار پیشنهادی Agent Skills — 10 Skill
- 2. R1 Deliverables — Executed (with evidence)
- MASTER_ROADMAP.md
- 8. 100 GitHub Repository Reference Library
- 9. چگونه از 100 Repo استفاده شود
- 1. تعریف مقصد نهایی
- Release v0.3.0 — Comprehensive Travel & Fintech Domain Expansion
- 14. Contract بین iTRIP Mobile و Firuzo
- 3. وضعیت مبنا و مهم‌ترین Gapها
- wipe.ts
- voucher.ts
- op-sqlite
- visa.ts
- syncState.ts
- backgroundSync.ts
- expo-crypto.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 38 edges
2. `money` - 38 edges
3. `react-native` - 34 edges
4. `vitest` - 33 edges
5. `useAuthStore` - 24 edges
6. `colors` - 23 edges
7. `react-i18next` - 20 edges
8. `react-native-safe-area-context` - 19 edges
9. `expo-router` - 18 edges
10. `Button()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `3.1. Firuzo Color Tokens` --references--> `sub()`  [INFERRED]
  AGENTS.md → src/domains/currency/money.ts
- `۶.۴. سیستم سلسله‌مراتب کارت‌ها و توکن‌های بصری فیروزو` --references--> `sub()`  [INFERRED]
  ARCHITECTURE.fa.md → src/domains/currency/money.ts
- `3. Identity Hardening — وضعیت` --references--> `clearTokens()`  [INFERRED]
  SECURITY_BASELINE.md → src/services/secure/tokens.ts
- `1. وضعیت تسک‌های R3` --references--> `EmptyState()`  [INFERRED]
  DESIGN_SYSTEM_REPORT.md → src/components/ui/EmptyState.tsx
- `1. وضعیت تسک‌های R3` --references--> `ErrorState()`  [INFERRED]
  DESIGN_SYSTEM_REPORT.md → src/components/ui/ErrorState.tsx

## Import Cycles
- None detected.

## Communities (68 total, 12 thin omitted)

### Community 0 - "notifications/index.ts"
Cohesion: 0.24
Nodes (12): expo-device, expo-notifications, usePushNotifications(), createDeviceTokenService(), DeviceTokenService, configureNotificationHandler(), ensureAndroidChannel(), registerForPushNotifications() (+4 more)

### Community 1 - "money"
Cohesion: 0.05
Nodes (79): 1. وضعیت تسک‌های R4, decimal.js, vitest, zustand, HotelResultsScreen(), PassengersScreen(), FlightResultsScreen(), SosScreen() (+71 more)

### Community 2 - "react"
Cohesion: 0.07
Nodes (65): expo-font, expo-router, expo-status-bar, nativewind, react, react-i18next, react-native, react-native-gesture-handler (+57 more)

### Community 3 - "api/index.ts"
Cohesion: 0.18
Nodes (11): axios, AirportSchema, createFlightService(), FlightOfferSchema, FlightSegment, FlightSegmentSchema, FlightService, SearchFlightsParamsSchema (+3 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, axios, decimal.js, expo, expo-asset, expo-background-task, expo-constants, expo-crypto (+32 more)

### Community 5 - "Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants"
Cohesion: 0.06
Nodes (32): 1.1. Core Tech Stack, 1.2. Architectural Principle: Maximum Synergy, Zero Redundancy, 1. Project Identity & Architecture Overview, 2.1. Thumb-Zone Driven Layout, 2.2. Bottom Sheets over Popups & Modals, 2.3. Touch Targets & Spacing Standard, 2.4. Safe Area Insets & Dynamic Island Handling, 2. Mobile-First UX & Ergonomics Guidelines (+24 more)

### Community 6 - "iTrip Mobile — Production Build & Hardening Guide"
Cohesion: 0.07
Nodes (28): MainActivity, DefaultReactActivityDelegate, iTrip Mobile — Production Build & Hardening Guide, اجرای دستی خط لوله از طریق CLI:, تأیید در runtime, تنظیم در gradle, راه‌اندازی در کد (آماده است), راهنمای رفتار (+20 more)

### Community 7 - "expo"
Cohesion: 0.07
Nodes (26): backgroundColor, foregroundImage, adaptiveIcon, package, permissions, versionCode, typedRoutes, expo (+18 more)

### Community 8 - "booking.ts"
Cohesion: 0.12
Nodes (16): BookingService, ConfirmPaymentParams, ConfirmPaymentParamsSchema, ConfirmPaymentResponse, ConfirmPaymentResponseSchema, createBookingService(), CreateDraftParams, CreateDraftParamsSchema (+8 more)

### Community 9 - "MainApplication.kt"
Cohesion: 0.15
Nodes (14): MainApplication, Application, applicationlifecycledispatcher, Configuration, defaultreactnativehost, load, opensourcemergedsomapping, packagelist (+6 more)

### Community 10 - "compilerOptions"
Cohesion: 0.13
Nodes (14): expo/tsconfig.base, compilerOptions, baseUrl, forceConsistentCasingInFileNames, module, moduleResolution, noFallthroughCasesInSwitch, noImplicitOverride (+6 more)

### Community 11 - "سند جامع معماری، نیازمندی‌ها و نقشه راه تولید اپلیکیشن اندروید پلتفرم iTrip (Firuzo)"
Cohesion: 0.17
Nodes (12): تصمیم نهایی معمارانه (Architectural Decision Record):, دلایل این انتخاب برای پلتفرم فیروزو:, سند جامع معماری، نیازمندی‌ها و نقشه راه تولید اپلیکیشن اندروید پلتفرم iTrip (Firuzo), چالش‌های اختصاصی محیطی و میدانی در ایران:, ۱. تحلیل استراتژیک و نیازمندی‌های بنیادین محصول (Strategic Domain Context), ۲. ارزیابی و انتخاب استک فناوری (Technology Stack Evaluation & Decision), ۳. معماری لایه‌بندی نرم‌افزار (Clean Architecture & Layering), ۴. موتور همگام‌سازی آفلاین و گاوصندوق سفر (Offline-First Vault) (+4 more)

### Community 12 - "stay.ts"
Cohesion: 0.21
Nodes (13): addDays(), calculateTotalHotelGuests(), dayNumber(), HotelStayDetails, HotelStayDetailsSchema, nightsBetween(), RoomGuest, RoomGuestSchema (+5 more)

### Community 13 - "Toast.tsx"
Cohesion: 0.06
Nodes (40): 1. وضعیت تسک‌های R3, 2. گیت دائمی — `src/test/design/designSystem.test.ts` (14 تست), 3. Exit Gate — R3, iTRIP Mobile — Design System Report (R3 — Navigation + Design System), ref_node_fs, ref_node_path, ref_vitest_config, booking (+32 more)

### Community 14 - "سند جامع معماری فنی اپلیکیشن موبایل iTrip (Firuzo Mobile)"
Cohesion: 0.22
Nodes (7): سند جامع معماری فنی اپلیکیشن موبایل iTrip (Firuzo Mobile), قانون بنیادین لایه دامنه (Pure Domain Law):, ۱. تحلیل راهبردی و مأموریت محصول (Strategic Domain Context), ۱.۱. جامعه مخاطبان هدف, ۱.۲. چالش‌های میدانی و پاسخ‌های معمارانه, ۳. معماری شش‌ضلعی و جریان داده‌ها (Clean Hexagonal Architecture & Data Flow), ۹. جمع‌بندی و تعهدات مهندسی

### Community 15 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, android, build:bundle, i18n:parity, ios, lint, start, test (+2 more)

### Community 16 - "iTrip Mobile (Firuzo) · گاوصندوق دیجیتال و همراه هوشمند سفر"
Cohesion: 0.17
Nodes (11): iTrip Mobile (Firuzo) · گاوصندوق دیجیتال و همراه هوشمند سفر, 🛠 استک فناوری (Technology Stack), 📥 دانلود و نصب مستقیم (Download Android APK), دستورات توسعه و تضمین کیفیت (Quality Gates), 🚀 راه‌اندازی و توسعه (Getting Started), 📁 ساختار پوشه‌بندی (Directory Structure), 🌟 ستون‌های اصلی محصول (Key Pillars), 📄 مجوز و مالکیت (License) (+3 more)

### Community 17 - "passenger.ts"
Cohesion: 0.24
Nodes (11): isPassportValidForTravel(), PassengerSchema, Passport, PassportSchema, cryptoRandomUuid(), isSavedTravelerBookable(), savedFromPassenger(), SavedTraveler (+3 more)

### Community 18 - "client.ts"
Cohesion: 0.16
Nodes (19): useAuthBootstrap(), useRequireAuth(), AuthService, createAuthService(), SendOtpResponse, VerifyOtpResponse, ApiConfig, createApiClient() (+11 more)

### Community 19 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @babel/core, eslint, @types/react, typescript, typescript-eslint, vitest

### Community 20 - "۸. پایپ‌لاین انتشار و کنترل کیفیت موبایل (Mobile Release Train Pipeline)"
Cohesion: 0.33
Nodes (6): فاز ۱: اسکن هماهنگی و امنیت (Sync & Security Scan), فاز ۲: گیت‌های کیفیت چندگانه (Automated Quality Gates), فاز ۳: اعتبارسنجی الزامات آفلاین و SQLCipher, فاز ۴: افزایش هماهنگ نسخه و تگ‌گذاری سمانتیک, فاز ۵: استقرار ابری و ساخت خروجی‌های امضاشده (EAS Build), ۸. پایپ‌لاین انتشار و کنترل کیفیت موبایل (Mobile Release Train Pipeline)

### Community 21 - "metro.config.js"
Cohesion: 0.33
Nodes (5): config, { getDefaultConfig }, { withNativeWind }, ref_expo_metro_config, ref_nativewind_metro

### Community 22 - "۵. امنیت، رمزنگاری و یکپارچگی مالی (Security & Financial Invariants)"
Cohesion: 0.40
Nodes (5): ۵. امنیت، رمزنگاری و یکپارچگی مالی (Security & Financial Invariants), ۵.۱. قانون منع محاسبات ممیز شناور (Decimal.js Financial Law), ۵.۲. احراز هویت، OAuth 2.0 PKCE و مدیریت توکن, ۵.۳. محافظت بیومتریک از کیف پول NewCash (`src/hooks/useBiometrics.ts`), ۵.۴. سخت‌سازی شبکه و محیط اجرا

### Community 23 - "۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics)"
Cohesion: 0.40
Nodes (5): ۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics), ۶.۱. ناحیه دسترسی شست (Thumb-Zone), ۶.۲. برتری باتم‌شیت‌ها بر پاپ‌آپ‌های دسکتاپ, ۶.۳. اهداف لمسی و فاصله‌گذاری استاندارد, ۶.۴. سیستم سلسله‌مراتب کارت‌ها و توکن‌های بصری فیروزو

### Community 24 - "۷. سیستم پشتیبانی ۵ زبانه و مدیریت جهت چیدمان (RTL / LTR)"
Cohesion: 0.40
Nodes (5): ۷. سیستم پشتیبانی ۵ زبانه و مدیریت جهت چیدمان (RTL / LTR), ۷.۱. الزام استفاده از مشخصه‌های منطقی (Logical CSS Properties), ۷.۲. قوانین برگرداندن آیکون‌ها (Icon Flipping Rules), ۷.۳. حفظ جهت نگارش برای داده‌های فنی و مالی, ۷.۴. برابری کامل کلیدهای ترجمه (100% Locale Key Parity)

### Community 25 - "jalali.ts"
Cohesion: 0.33
Nodes (7): formatDualDate(), GregorianDate, gregorianToJalali(), JalaliDate, jalaliToGregorian(), PERSIAN_MONTH_NAMES, PERSIAN_MONTH_NAMES_LATIN

### Community 26 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 27 - "۲. تصمیمات بنیادین معمارانه و استک فناوری (Architectural Decision Records)"
Cohesion: 0.50
Nodes (4): ۲. تصمیمات بنیادین معمارانه و استک فناوری (Architectural Decision Records), ۲.۱. انتخاب پلتفرم: React Native 0.77 + Expo SDK 52 (New Architecture), ۲.۲. مسیریابی و ناوبری: Expo Router v4, ۲.۳. سیستم استایل‌دهی: NativeWind v4

### Community 28 - "۴. گاوصندوق آفلاین سفر (Offline-First Travel Vault)"
Cohesion: 0.50
Nodes (4): ۴. گاوصندوق آفلاین سفر (Offline-First Travel Vault), ۴.۱. معماری لایه ذخیره‌سازی دو موتوره (`src/services/db/driver.ts`), ۴.۲. مدیریت سخت‌افزاری کلید دیتابیس (`src/services/security/dbKey.ts`), ۴.۳. چرخه کش و دسترسی به ووچرها (`src/stores/vaultStore.ts`)

### Community 30 - "package.json"
Cohesion: 0.08
Nodes (23): description, main, name, private, version, @babel/core, eslint, expo (+15 more)

### Community 31 - "wallet.ts"
Cohesion: 0.18
Nodes (10): createWalletService(), ServerTransaction, ServerTransactionSchema, TopUpIntentParams, TopUpIntentParamsSchema, TopUpIntentResponse, TopUpIntentResponseSchema, WalletBalances (+2 more)

### Community 38 - "zod"
Cohesion: 0.22
Nodes (8): zod, createHotelService(), Hotel, HotelSchema, HotelService, RoomOfferSchema, SearchHotelsParamsSchema, SearchHotelsResponseSchema

### Community 39 - "(tabs)/_layout.tsx"
Cohesion: 0.36
Nodes (6): AccountIcon(), HomeIcon(), SearchIcon(), TabIconProps, TripsIcon(), WalletIcon()

### Community 40 - "iTRIP Mobile — Booking Experience Report (R4 — Core Booking Experience)"
Cohesion: 0.40
Nodes (4): 2. هسته امنیتی جدید: Payment Outcome Classifier, 3. مسیر UI جدید در review.tsx, 4. Exit Gate — R4, iTRIP Mobile — Booking Experience Report (R4 — Core Booking Experience)

### Community 41 - "tour.ts"
Cohesion: 0.13
Nodes (19): calculateTourDeposit(), calculateTourTotal(), formatTourDuration(), HOTEL_TIER_MULTIPLIERS, isTourDepartureAvailable(), PRIVATE_EXECUTION_MULTIPLIER, mockTour, TourBookingDraft (+11 more)

### Community 43 - "5. Roadmap کامل با Taskهای اجرایی"
Cohesion: 0.04
Nodes (48): 5. Roadmap کامل با Taskهای اجرایی, Accessibility Tasks, Exit Gate, Exit Gate, Exit Gate, Exit Gate, Exit Gate, Exit Gate (+40 more)

### Community 44 - "rental.ts"
Cohesion: 0.17
Nodes (15): calculateRentalDays(), calculateRentalPricing(), CarModel, CarModelSchema, INSURANCE_MULTIPLIERS, InsuranceTier, InsuranceTierSchema, isDriverEligible() (+7 more)

### Community 45 - "i18n/index.ts"
Cohesion: 0.17
Nodes (10): i18next, AppLanguage, LANGUAGE_NAMES, RTL_LANGUAGES, SUPPORTED_LANGUAGES, src_i18n_locales_ar, src_i18n_locales_en, src_i18n_locales_fa (+2 more)

### Community 46 - "telemetry/index.ts"
Cohesion: 0.17
Nodes (12): RFC-7469, apiConfig, DomainPinningPolicy, Environment, resolveBaseUrl(), resolveEnvironment(), api, eventBuffer (+4 more)

### Community 49 - "iTRIP Mobile — Baseline Report (R0 — Baseline & Freeze)"
Cohesion: 0.11
Nodes (17): 10. Public API Shape Freeze (تا پایان R2), 11. Exit Gate — R0, 1. Toolchain & Runtime Versions, 2. Dependency Inventory (SBOM Summary), 3. Quality Gate Baseline (Real Executions), 4. Bundle Size Baseline, 5. Dependency Vulnerability Baseline (`npm audit`), 6. Version Consistency Audit (P0 Fix Applied) (+9 more)

### Community 50 - "11. Backlog پیشنهادی به صورت Epic"
Cohesion: 0.12
Nodes (17): 11. Backlog پیشنهادی به صورت Epic, EPIC-01 Foundation, EPIC-02 Identity, EPIC-03 Secure Vault, EPIC-04 Offline Sync, EPIC-05 Design System, EPIC-06 Search & Discovery, EPIC-07 Booking (+9 more)

### Community 51 - "authStore.ts"
Cohesion: 0.33
Nodes (6): ConflictResolutionPolicy, resolveBookingConflict(), resolvePreferenceConflict(), resolveProfileConflict(), AuthState, UserProfile

### Community 52 - "7. ساختار پیشنهادی Agent Skills — 10 Skill"
Cohesion: 0.15
Nodes (13): 7. ساختار پیشنهادی Agent Skills — 10 Skill, Agent rules, Rule, SKILL-01 — Mobile Architecture, SKILL-02 — Domain Engineering, SKILL-03 — Offline Sync, SKILL-04 — Mobile Security, SKILL-05 — Design System + UX (+5 more)

### Community 53 - "2. R1 Deliverables — Executed (with evidence)"
Cohesion: 0.15
Nodes (12): 1. Threat Model Snapshot (Auth / Wallet / Vault / Booking), 2.1 Release Signing Separation (P0) — ✅ DONE, 2.2 ProGuard/R8 Rules کامل (P1) — ✅ DONE, 2.3 Placeholder Host از Native Pinning حذف شد (P0) — ✅ DONE, 2.4 شفاف‌سازی «JS Pinning vs Native Pinning» (P0 ادعای غلط) — ✅ DONE, 2.5 Secret Scan & Debug-Artifact Scan — ✅ DONE (دائمی), 2.6 Security Gate Test Suite جدید — `src/test/security/config.security.test.ts`, 2. R1 Deliverables — Executed (with evidence) (+4 more)

### Community 54 - "MASTER_ROADMAP.md"
Cohesion: 0.17
Nodes (11): 10. Mapping بین Gapهای iTRIP و Repoهای مرجع, 12. Dependency Order — چیزی که نباید برعکس شود, 13. Release Gate سیستماتیک, 15. Agent Task Template, 16. Orchestrator Prompt برای اجرای Roadmap, 17. نهایی‌ترین معیار موفقیت, 18. تعریف محصول نهایی, 2. معیار سطح هدف (+3 more)

### Community 55 - "8. 100 GitHub Repository Reference Library"
Cohesion: 0.20
Nodes (10): 8. 100 GitHub Repository Reference Library, A. React Native / Expo / Navigation / Native UI, B. State / Data Fetching / Validation / Forms, C. Offline / Local DB / Sync, D. Security / Identity / Mobile Hardening, E. Testing / E2E / Quality, F. Observability / Analytics / Reliability, G. Payments / Commerce / ERP / CMS (+2 more)

### Community 56 - "9. چگونه از 100 Repo استفاده شود"
Cohesion: 0.33
Nodes (6): 9. چگونه از 100 Repo استفاده شود, دسته 1 — مطالعه مستقیم, دسته 2 — Pattern Extraction, دسته 3 — Selective Adoption, دسته 4 — Benchmark, قانون ممنوع

### Community 57 - "1. تعریف مقصد نهایی"
Cohesion: 0.50
Nodes (4): 1.1 اصول معماری نهایی, 1.2 قانون طلایی, 1. تعریف مقصد نهایی, iTRIP Mobile → Firuzo-Grade Master Roadmap

### Community 58 - "Release v0.3.0 — Comprehensive Travel & Fintech Domain Expansion"
Cohesion: 0.50
Nodes (3): New Domain Capabilities:, Quality & Verification Evidence:, Release v0.3.0 — Comprehensive Travel & Fintech Domain Expansion

### Community 59 - "14. Contract بین iTRIP Mobile و Firuzo"
Cohesion: 0.67
Nodes (3): 14. Contract بین iTRIP Mobile و Firuzo, باید mobile-specific بمانند, باید مشترک باشند

### Community 60 - "3. وضعیت مبنا و مهم‌ترین Gapها"
Cohesion: 0.67
Nodes (3): 3. وضعیت مبنا و مهم‌ترین Gapها, P0 فعلی, P1 فعلی

### Community 61 - "wipe.ts"
Cohesion: 0.05
Nodes (35): expo-crypto, expo-secure-store, expo-sqlite, @op-engineering/op-sqlite, createDriver(), createExpoSqliteDriver(), getVaultDriver(), OpSqliteDb (+27 more)

### Community 62 - "voucher.ts"
Cohesion: 0.14
Nodes (22): buildFlightBarcodePayload(), buildHotelBarcodePayload(), buildTourBarcodePayload(), buildTransferBarcodePayload(), FlightVoucher, flightVoucherFromDraft(), getVoucherScheduleTime(), HotelVoucher (+14 more)

### Community 65 - "visa.ts"
Cohesion: 0.17
Nodes (14): calculateVisaTotal(), formatVisaProcessingTime(), mockVisa, validateVisaDocuments(), VisaApplicationDraft, VisaApplicationDraftSchema, VisaCatalogItem, VisaCatalogItemSchema (+6 more)

### Community 69 - "syncState.ts"
Cohesion: 0.21
Nodes (11): allowedSyncTransitions, canSyncTransition(), isFreshEnough(), SyncEvent, SyncState, syncTransition(), 2. Dead-Letter Queue — طراحی, 3. Sync State Machine — طراحی (+3 more)

### Community 70 - "backgroundSync.ts"
Cohesion: 0.20
Nodes (8): expo-background-task, expo-task-manager, flightService, registerBackgroundSync(), SyncResult, syncVaultOnce(), VAULT_SYNC_TASK, mutationQueue

## Knowledge Gaps
- **483 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+478 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 563 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sub()` connect `money` to `Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants`, `۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics)`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `vitest` connect `money` to `notifications/index.ts`, `visa.ts`, `api/index.ts`, `syncState.ts`, `zod`, `booking.ts`, `tour.ts`, `stay.ts`, `rental.ts`, `telemetry/index.ts`, `Toast.tsx`, `passenger.ts`, `authStore.ts`, `voucher.ts`, `jalali.ts`, `wipe.ts`, `package.json`, `wallet.ts`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `3.1. Firuzo Color Tokens` connect `Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants` to `money`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _483 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `money` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.07271062271062272 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._