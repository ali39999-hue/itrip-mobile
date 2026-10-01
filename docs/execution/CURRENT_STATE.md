# CURRENT_STATE — itrip-mobile Baseline Audit (Train 0)

- **Audit date:** 2026-09-30
- **Audited commit:** `daf99eb` (`fix(build): raise Gradle JVM heap to 4GiB`), branch `main`, tree clean, in sync with `origin/main`
- **Source of truth:** `MASTER_ROADMAP.md` (provided 2026-09-30 snapshot, synced into repo by this audit)
- **Method:** 7 parallel read-only audit agents (architecture, security, data/offline/sync, wallet/booking/checkout, i18n/RTL/UI/UX/a11y, release/DevOps, testing/observability/perf) + locally re-executed quality gates + direct spot-verification of every P0 claim. Findings indexed in `GAP_MATRIX.md`; raw evidence in `EVIDENCE.md`.

---

## 1. Verdict

The repository is **NOT production-grade**, despite 12 root-level `*_REPORT.md` files and git history claiming "roadmap R0..R11 complete". The codebase contains a real, partially well-engineered core (server-authoritative API layer, Decimal pricing engine, offline vault read path, real CI gates, fail-closed Gradle signing, native certificate pinning) wrapped in a systematic **"dead code / coverage theater"** pattern: many claimed-complete capabilities exist as tested modules but are **never invoked by any production code path** (mutation queue, sync FSM, conflict resolver, telemetry, notification deep-links/dedupe/reminders, saved travelers, localized digits, dark mode, toast).

**Gate status:** typecheck ✅ · lint ✅ · 259/259 tests ✅ · i18n parity (189 keys × 5 locales) ✅ · Expo Android export ✅ (3.84 MB)
**P0 count:** 10 · **P1 count:** 13 · **P2 count:** 10 — see `GAP_MATRIX.md`.

Several roadmap-P0 items flagged in the 2026-09-30 snapshot are already **fixed** in `main` (verified): no demo identity in `bootstrapAuth`, no seeded wallet balances/transactions, code-level version consistency at 0.4.0 (package.json = app.json = Gradle). The remaining snapshot P0s are **confirmed**: `pending_profile` session residue, fail-open encrypted-DB fallback, SSL-pinning claim vs reality, signing/CI holes, stale v0.3.0 user-facing metadata.

---

## 2. Verified toolchain & environment baseline

| Component | Value | Evidence |
|---|---|---|
| React Native | 0.77.0 (New Architecture enabled, Hermes) | package.json:47, app.json:10 |
| Expo SDK | ~52.0.0, Expo Router ~4.0.0 (typed routes) | package.json:24,37 |
| TypeScript | ^5.7.0 strict, 0 errors | package.json:63, `npm run typecheck` |
| Node (CI) | 20.x | .github/workflows/ci.yml |
| Gradle | 8.10.2-all | android/gradle/wrapper/gradle-wrapper.properties:3 |
| AGP / Kotlin | 8.7.2 (via RN 0.77 gradle plugin) / 2.0.21 | RN libs.versions.toml, android/build.gradle:9 |
| compileSdk / minSdk / targetSdk | 35 / 24 / 34 | android/build.gradle:5-8 |
| NDK | 27.1.12297006 | android/build.gradle:11 |
| op-sqlite | ^11.4.0 with `"op-sqlite": {"sqlcipher": true}` | package.json:19,70-72 |
| State / server cache | Zustand ^5.0.0, TanStack Query ^5.62.0 (Query mounted, only 2 consumers) | package.json, src/app/_layout.tsx:22-29 |
| i18n | i18next ^24.2.0, 5 locales (fa default, ar, en, zh, ru), 189 leaf keys each | src/i18n/locales/*, i18n:parity gate |
| Tests | vitest ^2.1.9, node environment, **40 files / 259 tests, all passing** | audit-verify.log |
| App version | 0.4.0 / versionCode 4 (package.json = app.json = build.gradle ✅; UI string stale ❌) | config.security.test.ts:128-136 |
| Bundle | Android JS bundle 3,840,494 bytes (3.84 MB) vs 4.2 MB budget | dist-audit export, 2026-09-30 |

---

## 3. Architecture as-built

```
Presentation (src/app: 17 real routes — no stub screens)
  (auth): login, otp · (tabs): index, search, my-trips, wallet, account, _layout
  booking: results, hotel-results, passengers, review, hotel-review, confirmation
  sos: index
Components (src/components: 11 ui primitives + 3 dead components)
    ↓
Application/State (src/stores: auth, booking, hotel, wallet, vault — 5 Zustand stores)
    ↓
Domain (src/domains: 14 subdirs; 9 are orphaned — see GAP-021)
  booking, calendar, currency, escrow, hotel, i18n, identity, perf, rental,
  tour, trip, visa, voucher, wallet
    ↓
Infrastructure (src/services: api 12, contract 2, db 3, notifications 6,
  qa 2, secure 1, security 3, sync 9, telemetry 2)
```

**Layering violations found (GAP-018):** `src/services/sync/backgroundSync.ts:91,102` runtime-imports `@/stores/walletStore` (infrastructure → application); `src/services/api/auth.ts:4` and `src/services/sync/conflictResolver.ts:2` type-import stores; `src/domains/voucher/voucher.ts:12` type-imports `@/services/api/flights`. No react/react-native/expo imports exist in `src/domains` (the letter of the Pure Domain Law holds). ESLint has **zero boundary rules** — nothing fails CI on new violations.

---

## 4. What is genuinely working (verified against code)

1. **Real API layer, no mock responses:** Axios client with token attach, correlation headers, single-flight 401 refresh, log redaction (`src/services/api/client.ts`); Zod-strict services for auth/flights/hotels/booking/wallet; `getBalances()` throws rather than fabricating (`src/services/api/wallet.ts:62-65`).
2. **Wallet null-start, server-authoritative:** balances start `null`, transactions `[]`; credit/debit throw if not initialized from server ledger (`src/stores/walletStore.ts:19-23,64-73,122-124`).
3. **Auth:** real OTP flow (`/auth/otp/send`, `/auth/otp/verify`, `/user/profile`), tokens exclusively in expo-secure-store (in-memory fallback only when SecureStore unavailable), no AsyncStorage, no token logging, zero `console.log` in non-test src (enforced by `src/test/security/config.security.test.ts:118-125`).
4. **Flights checkout:** quote validation fail-closed → draft → pay with `classifyPaymentOutcome` (UNKNOWN / REDIRECT_REQUIRED / CAPTURED / DECLINED), single-shot UNKNOWN recovery poll, 3DS redirect via Linking (`review.tsx:66-158`, `bookingStore.ts:239-249`).
5. **Offline vault read path:** vouchers persisted on CONFIRMED (screens call `vaultStore.add*Voucher`), my-trips/home render fully offline, offline QR from local payload.
6. **Background sync engine:** `TaskManager.defineTask('itrip-vault-sync')` registered at boot (min interval 60s), foreground `AppState` resync, NetInfo offline→online resync, single-flight guard (`backgroundSync.ts`, `_layout.tsx:38-54`, `useNetworkStatus.ts`).
7. **Native security config:** NSC pins `itrip-platform.vercel.app` + `api.itrip.ir`, cleartext banned globally, debug-only user-CA override (verified by security gate tests).
8. **Fail-closed Gradle signing:** release binds only `signingConfigs.release`; missing keystore/empty passwords fail the build; never falls back to debug (`android/app/build.gradle:114-139`).
9. **CI:** typecheck + lint + vitest + i18n:parity + expo export on every push/PR (`ci.yml`), plus a static security-config gate suite (13 tests) reading the actual Android manifest/NSC/gradle files.
10. **i18n parity tooling:** 189 keys × 5 locales verified programmatically every run.

---

## 5. Claimed-complete (R0..R11 reports) vs verified reality

| Claimed capability (report) | Code verdict |
|---|---|
| R2 persistent mutation queue | **Dead code** — `mutationQueue.enqueue()` has zero production callers; offline behavior = Pay button disabled (`review.tsx:409`) |
| R2 retry/backoff + DLQ | Backoff engine exists but is unreachable; DLQ has **no reader/replay UI** |
| R2 sync state machine | Full FSM + 7 tests, **zero consumers** |
| R2 conflict resolution | Per-entity policies exist, **never invoked**; `syncAll` overwrites unconditionally; no ETag/revision |
| R2 TTL/eviction | `purgeExpired`/`purgeCompleted` **never scheduled**; purge checks a `status` field the Voucher type doesn't have |
| R6 ledger semantics (pending/reversal pairing/pagination) | `src/domains/wallet/ledger.ts` **zero importers**; API schema cannot express `REVERSED`/`correctsId`; no cursor pagination server-side |
| R6 pending top-up not counted | **False in effect** — PENDING intent credited in full to spendable balance (GAP-004) |
| R4 saved travelers | Schema + tests only, no UI/persistence |
| R4 "no payment path declares network loss as failure" | **False for hotels** (GAP-005) |
| R3 toast system | Built + mounted, **0 call sites** (Alert.alert ×16 instead) |
| R3 dark mode | `darkSemantic` tokens + `useTheme` exist; **0 `dark:` variants, 0 screen consumers** — OS dark mode produces a broken half-state |
| R7 localized digits / locale policies | `formatNumber`/`formatMoneyAmount` dead code; fa/ar users see Latin digits |
| R7 runtime missing-key guard | `auditTranslationTree()` exists, **never wired** into i18next |
| R8 deep links / dedupe / reminders | `deepLinkFor`, `NotificationDeduplicator`, `planReminders` all dead; generated `itrip://trip/{ref}` routes **don't exist** in the router; runtime tap = Alert + fixed `/(tabs)/my-trips` |
| R8 push | **Non-functional in production builds** — no google-services.json / Firebase gradle wiring; token fetch fails silently (GAP-012) |
| R9 bundle budget gate | Test reads `dist/` only if present; CI runs tests **before** export → gate always skips |
| R9 list virtualization policy | No FlatList/FlashList anywhere; it's a flights-only zod `.max(30)` check |
| R10 chaos harness | Simulations run against in-module fakes, not real transport/stores; fault injector never feeds faults into `fn` (`chaos.ts:54-55`) |
| R10 telemetry | Complete engine (typed events, PII redaction, buffer, flush) with **zero production callers**; no crash reporting library installed |
| R11 contract registry gates the build | Imported only by its own test |
| R0/R11 signing | Gradle fail-closed ✅; CI mints **ephemeral keystores** with a committed fallback password (GAP-002) |
| R1 demo identity / seed financial data | **Fixed** (verified) — remaining fabricated data is at adapter/UI seams (GAP-007) |
| R0/R11 version consistency | Code files consistent at 0.4.0 ✅; README/lockfile/UI strings stale (GAP-023) |

---

## 6. Systemic anti-patterns (root causes to treat, not just symptoms)

1. **Dead-code completion:** capabilities written as pure modules + tests but never wired into screens/stores — reports then marked ✅ because "tests pass".
2. **Gate theater:** meta-tests grep their own source (string matching) instead of testing behavior; budget gates skip silently in CI ordering.
3. **Silent failure:** pervasive `catch {}` (driver fallback, device token, syncAll sub-steps, profile fetch) — production failures are unobservable.
4. **Adapter fabrication:** missing backend fields silently replaced with invented prices/identities/contact data instead of failing closed.
5. **No boundary enforcement:** layering, RTL classes, hardcoded strings, and money-float rules are convention-only; nothing fails CI.

---

## 7. Dependency health snapshot

- No SBOM or license inventory exists (`scripts/` has only i18n tooling).
- **Absent but roadmap-required:** Sentry/crash reporting, Firebase (FCM), FlashList, @testing-library/react-native, bottom-sheet primitive.
- **Suspicious in production deps:** `expo-dev-client` ships in production dependencies (plausible source of `SYSTEM_ALERT_WINDOW` permission).
- Known-fragile: CI OOMed once post-`assembleRelease` (fixed by 4GiB heap bump, commit `daf99eb`).
- Lockfile: version field `0.2.0` (stale), lockfileVersion 3.

---

## 8. Baseline artifacts produced by this audit

- `docs/execution/GAP_MATRIX.md` — 33 gaps, full schema, dependency-ordered
- `docs/execution/EVIDENCE.md` — commands, outputs, agent findings index, spot-checks
- `docs/execution/ARCHITECTURE_DECISIONS.md` — ADR-0001/0002/0003
- `docs/execution/REFERENCE_USAGE.md` — reference standards consulted
- `docs/execution/RELEASE_READINESS.md` — release gate status for v0.4.0 (FAIL, itemized)
- `docs/execution/TRAIN_0_REPORT.md` — train report + Train 1 queue
- `MASTER_ROADMAP.md` — synced to the provided 2026-09-30 source-of-truth snapshot
- `audit-verify.log`, `audit-export.log`, `dist-audit/` — untracked local evidence (to be removed after the train; `dist-audit` was used to avoid clobbering the tracked-affecting `dist/` directory)
