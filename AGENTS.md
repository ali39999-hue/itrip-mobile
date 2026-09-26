# Firuzo Mobile (itrip-mobile) — Agent Operating Guidelines & Architecture Invariants

This document establishes the mandatory engineering rules, mobile-first design specifications, security invariants, and release automation protocols for autonomous AI agents and engineers working in the `itrip-mobile` repository.

---

## 1. Project Identity & Architecture Overview

`itrip-mobile` is the native Android & iOS mobile client for the Firuzo / iTrip travel platform. The app is engineered as a **Digital Travel Vault & Operating Companion** for international visitors to Iran (GCC Arabic travelers, European English/Russian visitors, Chinese tourists, and Iranian domestic travelers).

### 1.1. Core Tech Stack
- **Runtime & Framework:** React Native 0.77.0 with Expo SDK 52 (Bare Workflow / Prebuild target in `android/`).
- **Engine & Architecture:** New Architecture enabled (`newArchEnabled: true` in `app.json`), Fabric C++ Renderer, TurboModules, Hermes JS Engine.
- **Navigation:** Expo Router v4 (file-based routing with strict TypeScript typed routes in `src/app/`).
- **Styling:** NativeWind v4 (`nativewind/preset` on Tailwind CSS v3.4.17) sharing 1:1 design tokens with the Firuzo web platform.
- **State Management:** Zustand v5 (client stores in `src/stores/`) and TanStack React Query v5 (server cache & query synchronization).
- **Internationalization:** `react-i18next` with 5 supported locales (`fa`, `ar`, `en`, `zh`, `ru`) and runtime bidirectional RTL/LTR orchestration.
- **Offline Storage:** Dual-engine architecture in `src/services/db/driver.ts` using `op-sqlite` with SQLCipher hardware encryption (production) and `expo-sqlite` fallback (development).
- **Secure Hardware:** `expo-secure-store` backed by Android Keystore / iOS Keychain, `expo-local-authentication` for biometric verification.

### 1.2. Architectural Principle: Maximum Synergy, Zero Redundancy
- **Domain Alignment:** Business models, Zod validation schemas (`BookingSchema`, `PassengerSchema`), status transitions, and currency rules mirror the core Firuzo web platform contracts.
- **Shared Financial Invariants:** Precision financial calculation rules must match backend ledger expectations down to zero penny drift.

---

## 2. Mobile-First UX & Ergonomics Guidelines

Mobile devices are operated primarily with one hand. All user interfaces must be optimized for thumb reachability, touch accuracy, and device physical constraints.

### 2.1. Thumb-Zone Driven Layout
- **Lower Screen Anchor:** All primary call-to-action (CTA) buttons ("جستجو / Search", "رزرو / Book Now", "پرداخت / Pay", "نمایش QR / Show QR") MUST be positioned within the natural thumb sweep zone (lower 35% of the viewport).
- **Sticky Conversion Bars:** On booking, checkout, and review screens, action triggers must sit inside a fixed bottom bar:
  ```tsx
  <View
    className="bg-surface/95 border-t border-slate-200 px-5 pt-3"
    style={{ paddingBottom: Math.max(insets.bottom, 16) }}
  >
    <Button variant="action" size="lg" title={t('booking.continue')} />
  </View>
  ```
- **Top Bar Simplicity:** Screen headers must remain uncluttered: Back navigation chevron (RTL-aware), concise screen title, and at most one contextual action (e.g. SOS shortcut or Share icon). Avoid nesting primary filters or complex forms in the top 20% of the screen.

### 2.2. Bottom Sheets over Popups & Modals
- **Mobile Paradigm:** For viewport selections (date range pickers, room selectors, passenger counter sheets, flight class selection, city/airport selectors), agents MUST use **Bottom Sheets** anchored to the bottom edge rather than centered desktop modals.
- **Centered Modal Exception:** Centered dialogs are permitted ONLY for:
  1. High-contrast airport barcode / QR code scanners (`react-native-qrcode-svg`).
  2. Critical blocking security alerts (biometric failures, session expirations, logout confirmation).
- **Sheet Anatomical Standard:**
  - Rounded top corners: `rounded-t-3xl`.
  - Tactile drag handle indicator: `<View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />`.
  - Dismissible via downward swipe gesture or tap on backdrop overlay (`bg-black/60`).

### 2.3. Touch Targets & Spacing Standard
- **Minimum Interactive Size:** 44×44 dp on iOS (Apple Human Interface Guidelines) and 48×48 dp on Android (Material Design 3).
- **Icon Buttons & Quantity Steppers:** Every pressable icon (stepper `+` / `-`, back button, close button, bookmark toggle) must guarantee a minimum bounding hit box of 44×44 dp:
  ```tsx
  <Pressable
    className="w-11 h-11 items-center justify-center rounded-xl active:bg-slate-100"
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    accessibilityRole="button"
  >
    <SvgIcon />
  </Pressable>
  ```
- **Adjacent Target Clearance:** A minimum physical gap of 8 dp (`gap-2` or `space-x-2`) must separate interactive elements to prevent accidental miss-taps.

### 2.4. Safe Area Insets & Dynamic Island Handling
- **Mandatory Safe Area Inset Hook:** Always consume `useSafeAreaInsets()` from `react-native-safe-area-context`.
- **Zero Hardcoded Status Bar Offsets:** Never hardcode pixel values like `pt-8` or `pb-12` for status bars or navigation bars. Devices vary from 24 dp (standard Android) to 59 dp (iPhone Dynamic Island) and gesture bars (16–34 dp).
- **Scrollable Containers:**
  ```tsx
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-soft"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Content */}
    </ScrollView>
  );
  ```

---

## 3. Design System, Color Tokens & Card Hierarchy

The design system aligns 1:1 with the Firuzo web tokens (`globals.css`) and is declared in `src/styles/colors.ts` and `tailwind.config.js`.

### 3.1. Firuzo Color Tokens
| Token Key | Hex Value | Semantic Role & Accessibility Rules |
| :--- | :--- | :--- |
| `brand` | `#00A9A5` | Persian Turquoise — Primary brand identity, active tabs, highlights, links |
| `brand-dark` | `#007572` | Deep Turquoise — High contrast text on light backgrounds (WCAG AAA compliant) |
| `mint` | `#E6F6F5` | Soft Mint — Background for cards, soft category pills, active filter chips |
| `action` | `#F0A62A` | Saffron Gold — **Single-Action Rule:** Primary conversion action per screen |
| `action-hover`| `#D98E16` | Pressed state for action buttons |
| `price` | `#9C6209` | Deep Amber/Saffron — Dedicated numeral color for fares, room rates, wallet amounts |
| `surface` | `#FFFFFF` | Elevated card surfaces, bottom sheets, navigation bar backgrounds |
| `soft` | `#F8FAFC` | App background, secondary containers, input field backgrounds |
| `ink` | `#0F172A` | Slate 900 — Primary typography, headers, high-emphasis text |
| `sub` | `#64748B` | Slate 500 — Secondary typography, captions, metadata labels, inactive tabs |
| `rose` | `#E11D48` | Emergency SOS, destructive actions, cancellation states, validation errors |
| `success` | `#10B981` | Emerald 500 — Confirmed booking status, active badges, wallet top-up credits |

### 3.2. Single Primary Action Rule (Action Token Law)
- On any given screen, there must be **at most ONE** primary button styled with `variant="action"` (`bg-action`).
- Secondary and supportive actions must use `variant="brand"`, `variant="outline"`, or `variant="ghost"`. This guides traveler focus unambiguously during complex booking and checkout flows.

### 3.3. Card Hierarchy System
Card components must use `src/components/ui/Card.tsx` with semantic variants:
1. **Elevated Card (`variant="elevated"`):**
   - Classes: `bg-surface border border-slate-100 shadow-sm rounded-2xl p-4`
   - Use cases: Flight tickets, hotel voucher cards, wallet balance summaries, review cards.
   - Distinctive border accents: use `border-s-4 border-s-brand` (flights) or `border-s-4 border-s-action` (hotels) to communicate category instantly.
2. **Flat Card (`variant="flat"`):**
   - Classes: `bg-soft border border-slate-200 rounded-2xl p-4`
   - Use cases: Secondary lists, transaction line items, information rows, settings panels.
3. **Mint Card (`variant="mint"`):**
   - Classes: `bg-mint border border-teal-100 rounded-2xl p-4`
   - Use cases: Tourist Shetab physical card display, special hotel perks, travel insurance badges.
4. **Tactile Feedback:** All card and list pressables must incorporate instant visual feedback: `active:opacity-85` or subtle scale down `active:scale-[0.98]`.

---

## 4. Multilingual RTL/LTR Guidelines

The application supports 5 primary languages across two directional paradigms:
- **RTL Languages:** Persian (`fa` — default), Arabic (`ar`).
- **LTR Languages:** English (`en` — fallback), Chinese (`zh`), Russian (`ru`).

### 4.1. Strict Prohibition of Physical Directional Properties
- **Prohibited:** `left-`, `right-`, `ml-`, `mr-`, `pl-`, `pr-`, `border-l-`, `border-r-`, `rounded-l-`, `rounded-r-`.
- **Mandatory Logical Equivalents:**
  - Spacing: `start-`, `end-`, `ms-`, `me-`, `ps-`, `pe-`.
  - Borders: `border-s-`, `border-e-`.
  - Radii: `rounded-s-`, `rounded-e-`.
  - Text alignment: Use flexbox alignments (`items-start`, `items-end`) or logical text alignments.

### 4.2. Directional Icon Flipping Rules
- **MUST Flip in RTL:**
  - Directional navigation arrows (e.g. Back chevrons, Next buttons, forward step pointers).
  - Breadcrumb arrows and pagination pointers.
  - Implementation: Use `I18nManager.isRTL ? 'scale-x-[-1]' : ''` or transform rotate.
- **MUST NOT Flip in RTL:**
  - Media playback controls (play, pause, fast forward).
  - Clocks, calendars, and circular progress indicators.
  - Checkmarks (`✓`), rating stars (`★`), alert triangles.
  - Brand logos, QR codes, barcode representations, Shetab network insignia.
  - Airplane flight direction indicator (standard international convention).

### 4.3. Universal Directional Isolation (Direction Invariants)
Certain data elements MUST remain in LTR orientation regardless of whether the app is in Persian or Arabic mode:
- **Airport IATA Codes & Routes:** `THR -> SYZ`, `IKA -> DXB` (`style={{ writingDirection: 'ltr' }}`).
- **Flight Numbers:** `W5-1082`, `IR-451` (`style={{ writingDirection: 'ltr' }}`).
- **Financial Figures & Currency Formats:** `$250.00`, `1,250,000 IRR` (`style={{ writingDirection: 'ltr' }}`).
- **Phone Numbers:** `+98 21 8888 0000` (`style={{ writingDirection: 'ltr' }}`).
- **Card Numbers & Dates:** `6037 9971 1234 5678`, `2026-09-26` (`style={{ writingDirection: 'ltr' }}`).

### 4.4. 100% Locale Key Parity Mandate
- Zero hardcoded strings in JSX components: All strings must pass through `t('key')` from `useTranslation()`.
- Every key added to `src/i18n/locales/fa.json` MUST be mirrored with identical key hierarchy in:
  - `src/i18n/locales/ar.json`
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/zh.json`
  - `src/i18n/locales/ru.json`
- Verification script: `npm run i18n:parity` must report 0 missing and 0 extra keys across all files.

---

## 5. Architectural & Domain Invariants

### 5.1. Clean Hexagonal Layering
The codebase is strictly layered with unidirectional dependencies:
```
Presentation Layer (Expo Router screens, UI components, widgets)
       │
       ▼
Application & State Layer (Zustand stores, React Query, Sync coordinator)
       │
       ▼
Domain Layer (Pure TypeScript: Booking state, Decimal.js pricing, Passenger Zod schemas)
       │
       ▼
Infrastructure Layer (API client, OP-SQLite/SQLCipher, Keystore, BackgroundSync, Push)
```
- **Pure Domain Law:** Code inside `src/domains/` must NEVER import from `react`, `react-native`, `expo-*`, or `src/components/`. The domain layer is pure TypeScript and testable in isolated Node.js environments.

### 5.2. Offline-First Travel Vault Invariant
- **Travel Companion Guarantee:** International travelers frequently encounter cellular dead zones (airports, mountain passes, desert roads). A confirmed trip must remain 100% accessible with zero network connectivity.
- **Database Engine Abstraction (`src/services/db/driver.ts`):**
  - Production target: `@op-engineering/op-sqlite` compiled with SQLCipher.
  - Fallback engine: `expo-sqlite` (development/testing).
  - WAL mode mandatory: `PRAGMA journal_mode = WAL;`.
- **Hardware Encryption Key Management (`src/services/security/dbKey.ts`):**
  - Database encryption key is a 256-bit cryptographically secure random key (`expo-crypto.getRandomBytesAsync(32)`).
  - Stored strictly in `expo-secure-store` backed by Android Keystore / iOS Keychain.
  - NEVER persist database encryption keys in plain text, logs, or unencrypted storage.
- **Voucher Caching Lifecycle:**
  - When a booking reaches `CONFIRMED`, the full voucher payload (IATA barcode data, passenger lists, hotel coordinates, check-in details, and Persian driver card) must be stored in the local SQLite vault via `vaultStore.ts`.
  - Airport QR Code: High-contrast scannable QR (`QRCode` component with `quietZone={4}`, dark color `#0F172A`, light `#FFFFFF`) rendered entirely offline from local BCBP barcode payload.
  - Persian Taxi Driver Card: Every hotel voucher must carry pre-translated Persian hotel names (`hotelNameFa`), addresses (`addressFa`), and local phone numbers to show drivers offline.

### 5.3. Financial Calculations: Zero Floating-Point Arithmetic Law
- **Strict Prohibition:** NEVER use JavaScript `number`, `float`, or native arithmetic (`+`, `-`, `*`, `/`, `Math.round`) for monetary amounts, fares, fees, wallet balances, or taxes.
- **Mandatory Engine:** All financial operations must use `decimal.js` with exact configuration (`src/domains/currency/money.ts`):
  ```ts
  import Decimal from 'decimal.js';
  Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
  ```
- **Fare Breakdown Invariant:**
  - Base amount, taxes, and service fees must be rounded individually to the currency's precision (`CURRENCY_PRECISION[currency]`: 0 decimal places for `IRR`, 2 for `USD`/`EUR`/`AED`/`CNY`/`RUB`).
  - Total invariant: `total === round(base) + round(tax) + round(serviceFee)`.
  - Server is always the source of truth for payment intent; client calculations provide preview and reconciliation validation.

### 5.4. Authentication, PKCE & Token Security
- **OAuth 2.0 PKCE:** Client interacts with auth endpoints (`/auth/otp/send`, `/auth/otp/verify`) using PKCE-ready exchanges.
- **Storage Law (`src/services/secure/tokens.ts`):**
  - `accessToken` and `refreshToken` are stored EXCLUSIVELY in `expo-secure-store` (Android Keystore / iOS Keychain).
  - Under NO circumstances should tokens be stored in `AsyncStorage`, plaintext SQLite, local state dumps, or unredacted console logs.
- **Biometric Gate (`useBiometrics.ts`):**
  - Access to the NewCash wallet balances, stored credit cards, and payment triggers must be guarded by biometric authentication (`expo-local-authentication`).
  - If hardware is unavailable or not enrolled, graceful fallback to account PIN/OTP is enforced.

### 5.5. Booking State Machine Invariant
- Booking status follows a strict deterministic state machine (`src/domains/booking/state.ts`):
  - `PENDING_PAYMENT` -> `CONFIRMED` | `CANCELLED` | `EXPIRED`
  - `CONFIRMED` -> `CANCELLED`
  - `CANCELLED` -> (terminal)
  - `EXPIRED` -> (terminal)
- No optimistic skips (e.g. `PENDING_PAYMENT` cannot jump directly to a terminal refund state without server confirmation).

---

## 6. Mobile Release Train Pipeline

Every production release candidate must pass through the **5-Phase Mobile Release Train** before distribution to Google Play, Cafe Bazaar, Myket, or Apple TestFlight.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 1: SYNC & SECURITY SCAN                        │
│  Git status clean · Secret leak check · Keystore & config validation   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 2: MOBILE QUALITY GATES                        │
│  npm run typecheck · npm run lint · npm run i18n:parity · vitest run   │
│  npx expo export --platform android (Bundle sanity verification)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              PHASE 3: MOBILE VAULT & OFFLINE INVARIANTS                │
│  SQLCipher compilation config · ProGuard keep rules · Decimal.js audit │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             PHASE 4: VERSION BUMP, TAG & GITHUB RELEASE                │
│  SemVer bump (package.json + app.json versionCode) · Git tag vX.Y.Z    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              PHASE 5: MOBILE CI & EAS BUILD READINESS                  │
│  EAS build profiles (development / preview / production) · AAB / APK   │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Sync & Security Scan
1. **Workspace Hygiene:** Confirm clean working tree on `main` or release branch.
2. **Secret Leak Audit:**
   - Verify that `.keystore`, `.jks`, `google-services.json`, and `.env*` files are strictly matched in `.gitignore`.
   - Ensure `android/gradle.properties` credentials (`MYAPP_UPLOAD_STORE_PASSWORD`) are never committed.
   - Confirm debug bypasses (`DEMO_MODE`) are guarded and unavailable in production binaries.

### Phase 2: Mobile Quality Gates
Run the comprehensive verification command:
```bash
npm run verify
```
This executes the automated quality sequence:
1. `npm run typecheck` (`tsc --noEmit`): Must yield **0 TypeScript errors**.
2. `npm run lint` (`eslint .`): Must yield **0 ESLint errors and 0 warnings**.
3. `npm run i18n:parity` (`node scripts/i18n-parity.mjs`): Must confirm **100% key parity across all 5 locale files** (`ar.json`, `en.json`, `fa.json`, `ru.json`, `zh.json`).
4. `npm run test` (`vitest run`): Must achieve **100% passing tests** across domain, pricing, voucher, and store suites (minimum 72 tests).
5. **Metro Production Export Bundle Check:**
   ```bash
   npx expo export --platform android --no-bytecode
   ```
   Must compile the entire dependency tree and static assets without unresolvable imports or bundling exceptions. (Clean up the test export directory afterwards).

### Phase 3: Mobile Vault & Offline Invariants
1. **SQLCipher Configuration Target:**
   - Verify `"op-sqlite": { "sqlcipher": true }` is present in `package.json`.
   - Verify `OP_SQLITE_USE_SQLCIPHER=1` is configured in `android/gradle.properties`.
2. **ProGuard / R8 Shrinking Rules (`android/app/proguard-rules.pro`):**
   - Confirm keep rules exist for SQLCipher native bindings, Decimal.js precision classes, and Zod runtime reflection:
     ```proguard
     -keep class net.sqlcipher.** { *; }
     -keep class com.opsqlite.** { *; }
     -keep class com.decimaljs.** { *; }
     -keep class com.zod.** { *; }
     ```
3. **Financial Invariant Check:**
   - Verify no new usage of `Math.round` or native floating point operators on monetary amounts.

### Phase 4: Version Bump, Tag & GitHub Release
1. **Synchronized Version Bump:**
   - Update `version` in `package.json` (e.g. `0.1.0` -> `0.2.0`).
   - Update `expo.version` in `app.json` (matching SemVer).
   - Increment `expo.android.versionCode` by +1 in `app.json`.
2. **Conventional Commit & Tag:**
   ```bash
   git add package.json app.json
   git commit -m "chore(release): bump mobile version to vX.Y.Z (build N)"
   git tag -a vX.Y.Z -m "Release vX.Y.Z — Mobile Travel Vault & Booking"
   git push origin main --tags
   ```

### Phase 5: Mobile CI & EAS Build Readiness
1. **CI Pipeline Verification:** Verify GitHub Actions `.github/workflows/ci.yml` is green.
2. **EAS Build Profiles (`eas.json`):**
   - `development`: Debug client with `expo-dev-client` for hot-reload testing on physical devices.
   - `preview`: Internal release APK with production optimizations for testing in Iran (Cafe Bazaar / direct distribution).
   - `production`: Fully optimized, minified, ProGuarded Android App Bundle (AAB) signed for Google Play Store.
3. **Build Execution:**
   ```bash
   # Preview APK for QA & field testing
   eas build --platform android --profile preview

   # Production AAB for Google Play Store
   eas build --platform android --profile production
   ```

---

## 7. Directory Structure Standard

```
firouzo_mobil/
├── .github/workflows/               # GitHub Actions CI pipeline
├── android/                         # Prebuilt Android native project (Gradle, Manifest, Keystore)
├── assets/                          # Fonts (YekanBakh, Geist), splash screens, adaptive icons
├── scripts/                         # Build & verification scripts (i18n parity check)
├── src/
│   ├── app/                         # File-based routing (Expo Router v4)
│   │   ├── (auth)/                  # Login, OTP verification screens
│   │   ├── (tabs)/                  # Main tabs: Home, Search, MyTrips, Wallet, Account
│   │   ├── booking/                 # Flight & Hotel checkout, passenger forms, review
│   │   ├── sos/                     # Emergency assistance, offline tools, phrasebook
│   │   └── _layout.tsx              # Root stack, GestureHandler, Theme, QueryClient
│   ├── components/                  # UI components
│   │   ├── ui/                      # Button, Card, Input, Badge, TabIcons, OfflineBanner
│   │   └── shared/                  # Placeholder screens, shared headers
│   ├── domains/                     # Pure domain logic (ZERO React / React Native dependencies)
│   │   ├── booking/                 # Booking state machine, Decimal pricing engine
│   │   ├── currency/                # Decimal.js Money math, exchange conversions
│   │   ├── hotel/                   # Hotel stay calculation, night & room validation
│   │   ├── identity/                # Passenger schema, passport expiration guards
│   │   └── voucher/                 # DigitalPass, BCBP flight barcode payload builder
│   ├── hooks/                       # Custom hooks (useBiometrics, usePushNotifications, useAuth)
│   ├── i18n/                        # 5-language setup, RTL detection, locale JSONs
│   ├── services/                    # Infrastructure services
│   │   ├── api/                     # Axios client, interceptors, auth/flight/hotel endpoints
│   │   ├── db/                      # Driver abstraction (OP-SQLite SQLCipher vs Expo SQLite)
│   │   ├── notifications/           # Push notification payloads & device token registration
│   │   ├── secure/                  # SecureStore token persistence (Keystore-backed)
│   │   ├── security/                # Database encryption key generation & storage
│   │   └── sync/                    # WorkManager background sync coordinator
│   ├── stores/                      # Zustand v5 client stores (auth, wallet, vault, booking)
│   └── styles/                      # Firuzo design tokens (colors.ts, global.css)
├── app.json                         # Expo configuration, plugins, permissions
├── eas.json                         # EAS build profiles (development, preview, production)
├── tailwind.config.js               # NativeWind v4 configuration
└── tsconfig.json                    # Strict TypeScript configuration
```

---

## 8. Definition of Done (DoD) for Mobile Pull Requests

Before marking any agent task or submitting a pull request, verify:
- [ ] `npm run typecheck` is 100% green (0 errors).
- [ ] `npm run lint` is 100% green (0 errors, 0 warnings).
- [ ] `npm run i18n:parity` is 100% green (all 5 languages synced).
- [ ] `npm run test` passes 100% of unit and invariant tests.
- [ ] No floating-point math introduced for financial calculations.
- [ ] No physical directional styles (`left`/`right`) used in new UI code.
- [ ] Safe area insets properly accounted for using `useSafeAreaInsets`.
- [ ] Offline vault capability maintained for all ticket and voucher features.
- [ ] No sensitive credentials, tokens, or encryption keys written to plaintext storage or logs.
