# Graph Report - firouzo_mobil  (2026-09-26)

## Corpus Check
- 108 files · ~48,241 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .xml 10, .ttf 4, (none) 2)

## Summary
- 707 nodes · 1466 edges · 37 communities (30 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b0805477`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- bookingStore.ts
- hotel-results.tsx
- money
- dependencies
- Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants
- iTrip Mobile — Production Build & Hardening Guide
- expo
- booking.ts
- MainApplication.kt
- compilerOptions
- سند جامع معماری، نیازمندی‌ها و نقشه راه تولید اپلیکیشن اندروید پلتفرم iTrip (Firuzo)
- i18n/index.ts
- i18n-parity.mjs
- سند جامع معماری فنی اپلیکیشن موبایل iTrip (Firuzo Mobile)
- scripts
- iTrip Mobile (Firuzo) · گاوصندوق دیجیتال و همراه هوشمند سفر
- (tabs)/_layout.tsx
- api/index.ts
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
- backgroundSync.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `react-native` - 27 edges
3. `money` - 27 edges
4. `useAuthStore` - 22 edges
5. `react-i18next` - 20 edges
6. `colors` - 20 edges
7. `expo-router` - 18 edges
8. `react-native-safe-area-context` - 18 edges
9. `vitest` - 15 edges
10. `Button()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `3.1. Firuzo Color Tokens` --references--> `sub()`  [INFERRED]
  AGENTS.md → src/domains/currency/money.ts
- `۶.۴. سیستم سلسله‌مراتب کارت‌ها و توکن‌های بصری فیروزو` --references--> `sub()`  [INFERRED]
  ARCHITECTURE.fa.md → src/domains/currency/money.ts
- `تأیید در runtime` --references--> `vaultEngine()`  [INFERRED]
  BUILD.md → src/services/db/vault.ts
- `OtpScreen()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/(auth)/otp.tsx → src/stores/authStore.ts
- `AccountScreen()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/(tabs)/account.tsx → src/stores/authStore.ts

## Import Cycles
- None detected.

## Communities (37 total, 7 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (51): description, engines, node, main, name, op-sqlite, sqlcipher, private (+43 more)

### Community 1 - "bookingStore.ts"
Cohesion: 0.08
Nodes (39): ReviewScreen(), isPassportValidForTravel(), Passenger, PassengerSchema, Passport, PassportSchema, buildFlightBarcodePayload(), buildHotelBarcodePayload() (+31 more)

### Community 2 - "hotel-results.tsx"
Cohesion: 0.11
Nodes (44): expo-local-authentication, expo-router, react, react-i18next, react-native, react-native-qrcode-svg, react-native-safe-area-context, react-native-svg (+36 more)

### Community 3 - "money"
Cohesion: 0.08
Nodes (50): decimal.js, vitest, zustand, HotelResultsScreen(), PassengersScreen(), FlightResultsScreen(), SosScreen(), WalletScreen() (+42 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, axios, decimal.js, expo, expo-asset, expo-background-task, expo-constants, expo-crypto (+32 more)

### Community 5 - "Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants"
Cohesion: 0.06
Nodes (32): 1.1. Core Tech Stack, 1.2. Architectural Principle: Maximum Synergy, Zero Redundancy, 1. Project Identity & Architecture Overview, 2.1. Thumb-Zone Driven Layout, 2.2. Bottom Sheets over Popups & Modals, 2.3. Touch Targets & Spacing Standard, 2.4. Safe Area Insets & Dynamic Island Handling, 2. Mobile-First UX & Ergonomics Guidelines (+24 more)

### Community 6 - "iTrip Mobile — Production Build & Hardening Guide"
Cohesion: 0.07
Nodes (27): MainActivity, DefaultReactActivityDelegate, iTrip Mobile — Production Build & Hardening Guide, تأیید در runtime, تنظیم در gradle, راه‌اندازی در کد (آماده است), راهنمای رفتار, ساخت keystore (یک‌بار، امن نگه دارید): (+19 more)

### Community 7 - "expo"
Cohesion: 0.07
Nodes (26): backgroundColor, foregroundImage, adaptiveIcon, package, permissions, versionCode, typedRoutes, expo (+18 more)

### Community 8 - "booking.ts"
Cohesion: 0.09
Nodes (25): allowedTransitions, BookingStatus, canTransition(), FulfillmentStatus, isBookingActive(), isBookingPending(), isBookingTerminal(), PaymentStatus (+17 more)

### Community 9 - "MainApplication.kt"
Cohesion: 0.15
Nodes (14): MainApplication, Application, applicationlifecycledispatcher, Configuration, defaultreactnativehost, load, opensourcemergedsomapping, packagelist (+6 more)

### Community 10 - "compilerOptions"
Cohesion: 0.13
Nodes (14): expo/tsconfig.base, compilerOptions, baseUrl, forceConsistentCasingInFileNames, module, moduleResolution, noFallthroughCasesInSwitch, noImplicitOverride (+6 more)

### Community 11 - "سند جامع معماری، نیازمندی‌ها و نقشه راه تولید اپلیکیشن اندروید پلتفرم iTrip (Firuzo)"
Cohesion: 0.17
Nodes (12): تصمیم نهایی معمارانه (Architectural Decision Record):, دلایل این انتخاب برای پلتفرم فیروزو:, سند جامع معماری، نیازمندی‌ها و نقشه راه تولید اپلیکیشن اندروید پلتفرم iTrip (Firuzo), چالش‌های اختصاصی محیطی و میدانی در ایران:, ۱. تحلیل استراتژیک و نیازمندی‌های بنیادین محصول (Strategic Domain Context), ۲. ارزیابی و انتخاب استک فناوری (Technology Stack Evaluation & Decision), ۳. معماری لایه‌بندی نرم‌افزار (Clean Architecture & Layering), ۴. موتور همگام‌سازی آفلاین و گاوصندوق سفر (Offline-First Vault) (+4 more)

### Community 12 - "i18n/index.ts"
Cohesion: 0.17
Nodes (10): i18next, AppLanguage, LANGUAGE_NAMES, RTL_LANGUAGES, SUPPORTED_LANGUAGES, src_i18n_locales_ar, src_i18n_locales_en, src_i18n_locales_fa (+2 more)

### Community 13 - "i18n-parity.mjs"
Cohesion: 0.17
Nodes (9): ref_node_fs, ref_node_path, ref_vitest_config, booking, baseKeys, files, flatten(), localesDir (+1 more)

### Community 14 - "سند جامع معماری فنی اپلیکیشن موبایل iTrip (Firuzo Mobile)"
Cohesion: 0.22
Nodes (7): سند جامع معماری فنی اپلیکیشن موبایل iTrip (Firuzo Mobile), قانون بنیادین لایه دامنه (Pure Domain Law):, ۱. تحلیل راهبردی و مأموریت محصول (Strategic Domain Context), ۱.۱. جامعه مخاطبان هدف, ۱.۲. چالش‌های میدانی و پاسخ‌های معمارانه, ۳. معماری شش‌ضلعی و جریان داده‌ها (Clean Hexagonal Architecture & Data Flow), ۹. جمع‌بندی و تعهدات مهندسی

### Community 15 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, android, build:bundle, i18n:parity, ios, lint, start, test (+2 more)

### Community 16 - "iTrip Mobile (Firuzo) · گاوصندوق دیجیتال و همراه هوشمند سفر"
Cohesion: 0.22
Nodes (8): iTrip Mobile (Firuzo) · گاوصندوق دیجیتال و همراه هوشمند سفر, 🛠 استک فناوری (Technology Stack), 🚀 راه‌اندازی و توسعه (Getting Started), 📁 ساختار پوشه‌بندی (Directory Structure), 📄 مجوز و مالکیت (License), نصب و اجرای پروژه, 🌟 ویژگی‌های کلیدی (Key Pillars), پیش‌نیازها

### Community 17 - "(tabs)/_layout.tsx"
Cohesion: 0.36
Nodes (6): AccountIcon(), HomeIcon(), SearchIcon(), TabIconProps, TripsIcon(), WalletIcon()

### Community 18 - "api/index.ts"
Cohesion: 0.06
Nodes (50): RFC-7469, axios, OtpScreen(), useAuthBootstrap(), useRequireAuth(), AuthService, createAuthService(), SendOtpResponse (+42 more)

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
Cohesion: 0.26
Nodes (10): extractIata(), SearchScreen(), formatDualDate(), formatIsoToJalali(), GregorianDate, gregorianToJalali(), JalaliDate, jalaliToGregorian() (+2 more)

### Community 26 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 27 - "۲. تصمیمات بنیادین معمارانه و استک فناوری (Architectural Decision Records)"
Cohesion: 0.50
Nodes (4): ۲. تصمیمات بنیادین معمارانه و استک فناوری (Architectural Decision Records), ۲.۱. انتخاب پلتفرم: React Native 0.77 + Expo SDK 52 (New Architecture), ۲.۲. مسیریابی و ناوبری: Expo Router v4, ۲.۳. سیستم استایل‌دهی: NativeWind v4

### Community 28 - "۴. گاوصندوق آفلاین سفر (Offline-First Travel Vault)"
Cohesion: 0.50
Nodes (4): ۴. گاوصندوق آفلاین سفر (Offline-First Travel Vault), ۴.۱. معماری لایه ذخیره‌سازی دو موتوره (`src/services/db/driver.ts`), ۴.۲. مدیریت سخت‌افزاری کلید دیتابیس (`src/services/security/dbKey.ts`), ۴.۳. چرخه کش و دسترسی به ووچرها (`src/stores/vaultStore.ts`)

### Community 38 - "backgroundSync.ts"
Cohesion: 0.05
Nodes (34): expo-background-task, expo-crypto, expo-secure-store, expo-sqlite, expo-task-manager, @op-engineering/op-sqlite, bookingService, flightService (+26 more)

## Knowledge Gaps
- **298 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+293 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 360 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sub()` connect `money` to `Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants`, `۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics)`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Why does `۶.۴. سیستم سلسله‌مراتب کارت‌ها و توکن‌های بصری فیروزو` connect `۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics)` to `money`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics)` connect `۶. طراحی ارگونومیک موبایل و تجربه کاربری (Mobile-First UX & Ergonomics)` to `سند جامع معماری فنی اپلیکیشن موبایل iTrip (Firuzo Mobile)`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _298 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05028248587570622 - nodes in this community are weakly interconnected._
- **Should `bookingStore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07653061224489796 - nodes in this community are weakly interconnected._
- **Should `hotel-results.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10656010656010656 - nodes in this community are weakly interconnected._