# EVIDENCE — Train 0 (Baseline Audit)

- **Date:** 2026-09-30 · **Commit audited:** `daf99eb` (main, clean, synced with origin)

## 1. Quality gates re-executed locally (2026-09-30, 21:09 local)

Command: `npm run verify > audit-verify.log 2>&1` + `npx expo export --platform android --no-bytecode --output-dir dist-audit > audit-export.log 2>&1`

| Gate | Result | Evidence |
|---|---|---|
| `tsc --noEmit` | **PASS** (0 errors) | audit-verify.log |
| `eslint .` | **PASS** (0 errors/warnings) | audit-verify.log |
| `vitest run` | **PASS — 40 files / 259 tests, 0 failures** (1.5s) | audit-verify.log |
| `i18n:parity` | **PASS — 189 keys × fa/ar/en/zh/ru, parity OK** | audit-verify.log |
| `expo export --platform android --no-bytecode` | **PASS — 1836 modules, Android bundle 3,840,494 bytes (3.84 MB), 24 assets** | audit-export.log |

Logs are untracked working-tree artifacts of this train; export used `dist-audit/` to avoid touching `dist/`. Both to be removed post-train.

## 2. Direct spot-verification of P0 claims (Orchestrator, not delegated)

Every P0 in GAP_MATRIX was re-verified by direct file reads/greps in addition to agent reports:

| Claim | Direct evidence |
|---|---|
| SQLCipher fail-open | Read `src/services/db/driver.ts` — `tryCreateEncryptedDriver()` `catch { return null; }` (:86-88) → plaintext `createExpoSqliteDriver()`; docstring claims "a warning", none emitted |
| API guard bypass | Read `src/services/api/index.ts:11` — `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'` |
| Pending top-up inflates balance | Read `src/stores/walletStore.ts:120-132` (`credit()` adds full amount, no status check) + `src/app/(tabs)/wallet.tsx:112-115` (`credit(..., { status: 'PENDING' })` after `initiateTopUp`) |
| CI fallback password | `grep 'itrip-release-2026' .github/workflows/build-and-release-apk.yml` → lines 48, 50, 74, 76 |
| ProGuard wrong packages | `proguard-rules.pro:33-36` — keeps `com.margelo.**`/`cc.callisto.**`; no `com.op.sqlite.**` rule |
| Version consistency | `package.json` 0.4.0 · `app.json` 0.4.0/versionCode 4 · `build.gradle:94-95` versionCode 4 / versionName "0.4.0" · README still v0.3.0 (grep) |
| Roadmap file provenance | Local `MASTER_ROADMAP.md` SHA-256 differed from provided source of truth; provided version synced into repo (ADR-0001) |

## 3. Audit agent reports (7 parallel read-only explorations)

1. **Architecture** — layering violations (runtime infra→app import at `backgroundSync.ts:91,102`); orphan domains/components; 0 stub screens; API layer real; graphify-out cross-check (1,210 nodes) consistent with direct reads.
2. **Security** — demo identity REFUTED (fixed); seed financial data REFUTED in stores (fixed); `pending_profile` CONFIRMED; fail-open storage CONFIRMED; SSL pinning PARTIAL (NSC real, JS vacuous, pin provenance dubious); signing PARTIAL (Gradle fail-closed ✅, CI holes); `itrip-release-2026` the only committed credential-class literal; `.gitignore` keystore/`.env` coverage good.
3. **Data/Offline/Sync** — EXISTS/PARTIAL/MISSING matrix: mutation queue PARTIAL (unwired), backoff unreachable, DLQ write-only, FSM unwired, conflicts unwired, TTL unscheduled, wipe genuinely wired but incomplete, background sync EXISTS, telemetry dead.
4. **Wallet/Booking/Checkout** — zero-float NON-COMPLIANT at boundaries (core Decimal engine compliant); FSM compliant-with-caveats (payment paths bypass `canTransition`; CANCELLED simultaneously terminal and non-terminal in table); wallet NOT production-ready (PENDING credit, fake card, no pagination, ledger dead); hotel rail lacks R4 outcome classification; identity: passport 6-month guard zero call sites; saved travelers dead code.
5. **i18n/RTL/UI/UX/A11y** — RTL never enabled (no forceRTL anywhere; 28 physical-class violations enumerated); parity 189×5 PASS; ~100+ hardcoded strings (SOS ~95% English); 1 accessibilityLabel app-wide; dark mode not real; toast 0 call sites; safe-area usage GOOD (14/14 screens).
6. **Release/DevOps/Android** — CI gate matrix vs AGENTS Phase 2 (all 5 gates present; no version-standalone step, covered by vitest gate); signing: Gradle fail-closed VERIFIED, CI ephemeral-keystore + fallback passwords CONFIRMED; ProGuard: real gap `com.op.sqlite.**`, inert rules for nonexistent packages; Gradle 8.10.2 / AGP 8.7.2 / Kotlin 2.0.21 / SDK 35-24-34 / NDK 27.1.12297006; manifest permission bloat; stale metadata inventory.
7. **Testing/Observability/Notifications/Perf** — 259 tests: 18 domain + 15 service + 3 store + 4 meta; no component layer (`.tsx` excluded from vitest glob; no RNTL); chaos harness = policy tests over fakes; FCM impossible (no google-services.json/Firebase gradle); telemetry zero callers; no virtualization; bundle 3.84 MB under 4.2 MB budget but budget gate skips in CI.

## 4. Verification of prior completion claims

The repo carries 12 `*_REPORT.md` files + `RELEASE_CERTIFICATION_v0.4.0.md` claiming R0..R11 "PASS" and "RELEASED_WITH_DOCUMENTED_RISKS". Adjudication (full table in `CURRENT_STATE.md` §5): test counts and gate claims are accurate; **at least 15 claimed-complete capabilities are dead code or false as shipped** (queue, FSM, conflicts, DLQ read path, TTL, telemetry, ledger, deep links, dedupe, reminders, saved travelers, dark mode, toast adoption, localized digits, FCM delivery). Per orchestrator rule 15 ("never mark complete because code compiles"), these are recorded as gaps, not completions.

## 5. Constraints honored

- No implementation changes were made in this train (docs + roadmap sync only).
- `main` untouched: all artifacts committed on branch `roadmap/train-0-baseline`.
- Read-only agents; no domain or file modified by audit tooling.
