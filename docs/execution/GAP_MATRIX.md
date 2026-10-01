# GAP_MATRIX — itrip-mobile Baseline Audit (Train 0)

- **Audit date:** 2026-09-30 · audited commit `daf99eb`
- **Legend:** every gap carries: ID · severity · affected files/modules · root cause · risk · dependency · recommended action · validation method · roadmap task ID.
- **P0 rule:** no advanced UX / AI / growth work until P0 = 0.
- Roadmap task IDs reference `MASTER_ROADMAP.md` train sections (R0–R11) and AGENTS.md invariants.

## Summary

| Severity | Count | Trains primarily affected |
|---|---|---|
| P0 | 10 | R1 Security/Identity, R4 Booking, R6 Wallet, R2 Data |
| P1 | 13 | R2 Data, R7 i18n, R8 Notifications, R10 Observability/QA, R11 Release |
| P2 | 10 | R3 Design System, R5 Vault, R9 Perf/A11y, R0/R11 hygiene |

---

# P0 — Block feature expansion

## GAP-001 · P0 · Vault encryption is fail-open (silent plaintext fallback)
- **Affected:** `src/services/db/driver.ts:40-44,50-89,102-123` (spot-verified), `src/services/db/vault.ts:81-87` (`vaultEngine()` zero callers), `android/gradle.properties:69-72`
- **Root cause:** `tryCreateEncryptedDriver()` catch-alls `return null` on any failure (module missing, `isSQLCipher()` false, key error); `createDriver()` silently degrades to plaintext `expo-sqlite`. Docstring promises "a warning" — none exists. No production gate; diagnostics helper never consumed.
- **Risk:** vouchers (passport data, itineraries, BCBP payloads) and mutation queue at rest unencrypted in production with no way to detect. Violates AGENTS §5.2 fail-closed mandate and MASVS-STORAGE-1.
- **Dependency:** none (foundational). Blocks GAP-016 (wipe/rekey interplay).
- **Action:** in production (`!__DEV__`), refuse the vault (throw) instead of plaintext fallback; keep dev fallback; emit telemetry on fallback in dev; surface engine via `vaultEngine()` into telemetry.
- **Validation:** unit test — production-mode unencrypted driver construction throws; security suite asserts the gate; dev fallback test.
- **Roadmap:** R1 "encrypted local DB"; R2 Exit Gate; AGENTS Phase 3.1.

## GAP-002 · P0 · Release signing: ephemeral CI keystores + committed fallback password
- **Affected:** `.github/workflows/build-and-release-apk.yml:48-50,74-76` (spot-verified: `secrets.ITRIP_RELEASE_KEYSTORE_PASSWORD || 'itrip-release-2026'`), `:52-63` (keystore generation), `.gitignore:12-17` (keystores excluded), `android/gradle.properties:76-79`
- **Root cause:** `secrets.X || 'literal'` fallbacks mean a secrets-less run mints a brand-new keystore each run; no keystore stored as a GitHub secret; no `apksigner verify` step; alias/passwords public in-repo.
- **Risk:** v0.3.0 and v0.4.0 APKs are almost certainly signed with different keys → `INSTALL_FAILED_UPDATE_INCOMPATIBLE` for upgrades; documented v0.3.0 rollback path is broken; anyone can reproduce "same-credential" keystores.
- **Dependency:** none. Blocks R11 staged rollout credibility.
- **Action:** store the real keystore base64 as a GH secret; remove every `|| 'fallback'`; fail the build when secrets absent; add `apksigner verify --print-certs`; record cert fingerprint in release evidence.
- **Validation:** CI run with secrets produces stable fingerprint across two runs; negative test — secrets-less workflow aborts before build.
- **Roadmap:** R1 "release signing"; R11 "release signing"; AGENTS Phase 1/5.

## GAP-003 · P0 · R8/ProGuard keeps nonexistent packages; no keep rule for real op-sqlite namespace
- **Affected:** `android/app/proguard-rules.pro:33-36` (spot-verified: keeps `com.margelo.**`, `cc.callisto.**`, `@NitroModule` — none exist in op-sqlite 11.4.0; **no `com.op.sqlite.**` rule**), `OPSQLiteBridge.kt:9,14` (statically name-bound JNI `external fun`s)
- **Root cause:** rules written for an older op-sqlite layout (nitro/margelo); actual v11.4 package is `com.op.sqlite` and the library ships no `consumerProguardFiles`. AGENTS Phase 3.2 mandates rules that don't match reality (`com.opsqlite.**`, `com.decimaljs.**`, `com.zod.**` — the latter two are pure-JS).
- **Risk:** minified release APK may crash with `UnsatisfiedLinkError` at vault init → offline vault dead in the shipped binary. R8 has already broken the build once (commit `be71cd2`).
- **Dependency:** none. Must land before next signed release.
- **Action:** replace wrong-package rules with `-keep class com.op.sqlite.** { *; }`; correct AGENTS/BUILD.md Phase-3 rule list to reality.
- **Validation:** `assembleRelease` succeeds; `mapping.txt` shows `com.op.sqlite` kept; vault smoke test on emulator with the minified APK.
- **Roadmap:** R1 "R8/ProGuard rules"; AGENTS Phase 3.2.

## GAP-004 · P0 · Pending top-up intent inflates spendable balance
- **Affected:** `src/app/(tabs)/wallet.tsx:96-117` (spot-verified: `credit(..., { status: 'PENDING' })` after `initiateTopUp`), `src/stores/walletStore.ts:120-132` (spot-verified: `credit()` adds full amount regardless of status)
- **Root cause:** wallet credits a payment *intent* into `balances.USD`; the ledger invariant ("a PENDING transaction never counts toward the displayed balance", `src/domains/wallet/ledger.ts:11-13`) is never enforced because `ledger.ts` itself has zero importers.
- **Risk:** user can book against money that never settled; violates R6 Exit Gate ("no financial op shown final without server confirmation").
- **Dependency:** none. Related: GAP-005, GAP-020.
- **Action:** only `SETTLED` mutations move balances; track PENDING as separate `pendingHolds` displayed distinctly; reconcile via `syncWithServer`; add REVERSED pairing when server supports it.
- **Validation:** walletStore unit tests — `credit(PENDING)` leaves balances unchanged; top-up flow test asserting pending row + unchanged balance.
- **Roadmap:** R6 "pending transaction state", "wallet top-up"; R6 Exit Gate.

## GAP-005 · P0 · Hotel checkout classifies network loss as decline → double-charge window
- **Affected:** `src/stores/hotelStore.ts:173-219` (no outcome classification; return type lacks `outcome`), `src/app/booking/hotel-review.tsx:99-103`, `src/services/api/booking.ts:150-160` (every axios error → `success:false`)
- **Root cause:** R4's `classifyPaymentOutcome` (UNKNOWN / REDIRECT_REQUIRED / CAPTURED / DECLINED) was applied to the flight rail only (`bookingStore.ts:239-249`); the hotel path maps any failure — including a network drop mid-capture — to "payment rejected" with the Pay button immediately re-tappable.
- **Risk:** duplicate capture attempts on flaky networks; contradicts the R4 exit gate ("no payment path declares network loss as failure").
- **Dependency:** none (server-side idempotency on the reused key is currently the only mitigation).
- **Action:** mirror the flight outcome classifier in `hotelStore.confirmAuthoritativePayment`; add UNKNOWN recovery UI (single-shot poll → re-entry of success path) as in `hotel-review`'s flight twin.
- **Validation:** hotelStore unit tests for network-error → UNKNOWN (not DECLINED); manual airplane-mode-at-pay scenario.
- **Roadmap:** R4 "payment pending", "payment failed/retry", "partial failure handling".

## GAP-006 · P0 · Idempotency keys not durable across attempts
- **Affected:** `src/stores/bookingStore.ts:162` (generated per call) vs `:189-198` (persisted only after success), `src/stores/hotelStore.ts:128,154-163`, `src/app/(tabs)/wallet.tsx:94` (regenerated every tap), `src/services/api/client.ts:46-68` (no `Idempotency-Key` header — keys travel as body fields)
- **Root cause:** keys are memory-only and persisted post-success; a timeout/retry or app kill generates a fresh key, so the server sees two keys for one logical operation.
- **Risk:** duplicate draft/allotment holds and potential duplicate charges; defeats server-side dedupe exactly when it matters (interrupted requests).
- **Dependency:** none. Prerequisite for GAP-011 (queue replays need durable keys).
- **Action:** persist the idempotency key **before** the first network attempt (draft record or dedicated vault table); reuse per logical operation; send as `Idempotency-Key` HTTP header alongside body.
- **Validation:** unit test — timeout → retry reuses the same key; integration test with fake server asserting one draft for N retries.
- **Roadmap:** R2 "idempotency keys"; R4 "idempotent submit"; R2 Exit Gate.

## GAP-007 · P0 · Fabricated data reachable in production paths (demo-data rule violation)
- **Affected:** `src/services/api/flights.ts:101-106,123` (default price `40`, float `/600000` FX, fabricated flight numbers `IR${100+idx}`, `T10:00:00Z` defaults, `seatsLeft:5`); `src/services/api/hotels.ts:84-110` (fabricated `'Boutique Hotel'`, `'هتل اقامتی'`, templated `addressFa`, `'+98 21 8888 8888'`, stars 4, `roomsLeft:5`, `freeCancellation ?? true`); `src/stores/bookingStore.ts:210` + `src/stores/hotelStore.ts:175` (fabricated `bk_*` payment IDs); `bookingStore.ts:275`, `review.tsx:184` (fabricated PNR); `src/app/(tabs)/wallet.tsx:277-294` (spot-verified fake Shetab card `6037 ···· ···· 8841`, expiry 1406/08); `src/app/(tabs)/account.tsx:103` (`loyaltyPoints || 120`)
- **Root cause:** web-adapter fallbacks invent data when backend fields are missing (their own headers say "No fabricated fallback"); UI fabricates identifiers to force flows through.
- **Risk:** wrong prices enter the Decimal engine; the offline Persian taxi driver card can display a **fabricated address/phone (traveler-safety)**; fake PNR/card/loyalty shown as authoritative. Violates the Production Data Rule.
- **Dependency:** none.
- **Action:** fail-closed adapters — drop/flag records missing required fields instead of defaults; block pay without a real server `bookingId`; remove the fake card UI (or gate behind explicit `__DEV__` demo flag); remove loyalty fallback.
- **Validation:** adapter unit tests asserting rejection of incomplete payloads; security suite grep-gate extended to the fabricated literals; visual check of wallet/account.
- **Roadmap:** R1 (no demo/seed in production paths); R4 "document validation"; R6; AGENTS "Production Data Rule".

## GAP-008 · P0 · Production API base-URL guard bypassed; JS pinning check vacuous
- **Affected:** `src/services/api/index.ts:11` (spot-verified: `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'` builds the real axios client), `src/services/api/config.ts:26-45` (fail-fast guard is dead code — `apiConfig.baseURL` never consumed), `src/services/api/client.ts:55-65` (JS "pinning check" can never fire)
- **Root cause:** duplicated base-URL resolution bypassing the guard.
- **Risk:** a release built without `EXPO_PUBLIC_API_URL` (e.g., local `gradlew assembleRelease`) ships a localhost URL; with NSC `cleartextTrafficPermitted=false` the app loses all API access; placeholder host still ships in the bundle.
- **Dependency:** none.
- **Action:** route `index.ts` through `resolveBaseUrl()`; delete the dead duplicate; treat native NSC as the single pinning authority and correct the JS-layer claim in docs.
- **Validation:** unit test — production env without `EXPO_PUBLIC_API_URL` throws at client construction; export bundle grep shows no `localhost` fallback.
- **Roadmap:** R1 "network security config cleanup", "certificate pinning" (roadmap P0: بازبینی placeholder host / اصلاح ادعای SSL pinning).

## GAP-009 · P0 · Auth session can persist with placeholder identity `pending_profile`
- **Affected:** `src/stores/authStore.ts:112-134` (spot-verified via agent; `bootstrapAuth` sets `authenticated` + `userId:'pending_profile'` then awaits `fetchProfile()`), `:99-110` (profile-fetch failure swallowed), `src/app/(tabs)/account.tsx:76` (placeholder leaks to UI)
- **Root cause:** roadmap P0 item still present — on `/user/profile` failure the session stays authenticated with a placeholder identity forever; no retry, no downgrade, no explicit state.
- **Risk:** identity confusion in UI; violates roadmap P0 "جلوگیری از باقی‌ماندن pending_profile در session معتبر".
- **Dependency:** none.
- **Action:** introduce explicit `AUTHENTICATED_PENDING_PROFILE` status with a retry surface, or downgrade to unauthenticated + non-blocking banner on profile failure; never persist the placeholder as `userId`.
- **Validation:** authStore unit test for profile-failure path asserting no placeholder identity in authenticated state.
- **Roadmap:** R1 (حذف mock user / ایجاد `/me` contract) — roadmap §3 P0 list.

## GAP-010 · P0 · Zero-float law violated at API/storage boundaries
- **Affected:** `src/services/api/flights.ts:104-106`, `src/services/api/hotels.ts:89-90` (float division for IRR→USD, hardcoded rate 600000); `src/services/api/booking.ts:20-21` (`totalAmount: z.number()` for authoritative booking amounts, while wallet correctly uses `z.string()`); `src/services/db/vault.ts:55` (`total_amount REAL` in dead-but-present `server_bookings` DDL); `src/domains/currency/money.ts:40-43` (`convert()` doesn't round to target precision), `pricing.ts:130-141` (`convertBreakdown` never re-rounds → breaks the breakdown invariant)
- **Root cause:** money typed as number at contract/storage seams; FX as float literal.
- **Risk:** rounding drift enters the Decimal engine; converted breakdowns violate `total === round(base)+round(tax)+round(fee)`; reconciliation impossible (no server-breakdown verifier exists at all).
- **Dependency:** none.
- **Action:** money as `z.string()` everywhere; Decimal-only conversion with explicit rounding at target precision; re-round `convertBreakdown` components; add `verifyBreakdown()` reconciler; `server_bookings` column TEXT.
- **Validation:** schema tests rejecting numeric money; conversion/breakdown property tests (invariant holds for random inputs).
- **Roadmap:** R6 "currency precision policy"; AGENTS §5.3.

---

# P1 — Must fix before the trains that depend on them

## GAP-011 · P1 · Offline mutation queue is unwired dead code (offline-first promise unmet)
- **Affected:** `src/services/sync/mutationQueue.ts` (`enqueue` zero production callers), `deadLetterQueue.ts` (no reader/replay UI), `syncState.ts` (FSM zero consumers), `conflictResolver.ts` (never invoked; `syncAll` overwrites unconditionally), `vault.ts:140-165` + `mutationQueue.ts:258-265` (purge never scheduled), `src/app/booking/review.tsx:409` (offline → button disabled)
- **Root cause:** R2 built the machinery and its tests but never connected it to stores/screens.
- **Risk:** a traveler losing connectivity mid-funnel has no queued mutations, no retries, no DLQ; degraded sync indistinguishable from healthy; terminal vouchers persist forever offline.
- **Dependency:** GAP-006 (durable keys), GAP-001 (encryption confidence).
- **Action:** wire enqueue into booking/hotel/wallet mutation paths (or explicitly descope offline *writes* with a documented ADR and honest offline messaging); connect FSM to `syncAll`; surface DLQ entries in My Trips; schedule purges at boot/sync.
- **Validation:** integration test — airplane-mode submit → queue → online drain → single server effect; FSM transition tests on real engine.
- **Roadmap:** R2 (persistent mutation queue, DLQ, sync FSM, conflict policy, TTL, sync error UI).

## GAP-012 · P1 · Push notifications non-functional in production builds
- **Affected:** `src/services/notifications/index.ts` (token fetch fails, swallowed), `deviceToken.ts` (`unregister` never called), missing `google-services.json`/Firebase gradle wiring in `android/`, `deepLink.ts:19-31,52-78,96-110` (`deepLinkFor`/dedupe/`planReminders` zero consumers), `src/app/_layout.tsx:60-79` (tap = Alert + fixed route), no `getInitialNotification` cold-start handling
- **Root cause:** R8 built schema/policy layers; runtime delivery (FCM) and routing (matching routes for `itrip://trip/{ref}`) were never completed; generated deep-link routes don't exist in the router.
- **Risk:** travelers receive no boarding/payment/booking alerts; roadmap R8 Exit Gate unreachable.
- **Dependency:** Train 8 prerequisites; route existence must precede deep-link payload shipping.
- **Action:** add Firebase config (build-gated), wire token registration + unregister at logout, implement real routes for deep links, attach dedupe to the delivery path, cold-start handler.
- **Validation:** device test — push received → deduped → deep-linked to a real screen; cold-start tap test.
- **Roadmap:** R8 (notification categories, deep-link actions, deduplication, reminders); R8 Exit Gate.

## GAP-013 · P1 · Observability engine has zero ignition
- **Affected:** `src/services/telemetry/index.ts` (typed events, PII redaction, buffer, flush — zero production callers), no crash-reporting dependency, `backgroundSync.ts:50-113` (sub-step failures swallowed), `src/services/security/dbKey.ts`/driver (silent catches)
- **Root cause:** R10 wrote the engine, never instrumented callers; crash reporting deferred without an interim story.
- **Risk:** payment failures, refresh failures, and plaintext-vault fallbacks leave no trace; P0 failures are not reproducible/observable (R10 Exit Gate).
- **Dependency:** none — deliberately pulled **forward** into Train 1/2 (ADR-0002) because silent failures currently hide P0 regressions.
- **Action:** record events at: API failures (client), 401-refresh failures, sync sub-steps, driver fallback, wallet ops, booking outcomes; adopt a crash reporter (Sentry RN) behind an ADR; wire flush on background.
- **Validation:** unit test asserting events emitted for each instrumented path; local flush integration test.
- **Roadmap:** R10 (crash reporting, breadcrumbs, network tracing, sync metrics); R10 Exit Gate.

## GAP-014 · P1 · RTL is cosmetic, not functional
- **Affected:** project-wide absence of `I18nManager.forceRTL/allowRTL`; `src/app/(tabs)/account.tsx:24-26` (in-app switch never flips layout, no restart prompt); `src/i18n/index.ts:22` `isRTL()` unused; 28 physical-directional violations in `src/app` (`account.tsx:61,62,169,194`; `index.tsx:166,244,263`; `my-trips.tsx:145,149,168`; `search.tsx:153,180,197,240,280,281`; `wallet.tsx:234,240,324`; `confirmation.tsx:109`; `hotel-review.tsx:254,278,300`; `passengers.tsx:109,110`; `review.tsx:269,293,317,339`)
- **Root cause:** direction flag exists; layout direction never applied; no lint gate for physical classes.
- **Risk:** Persian/Arabic (default locale!) users get LTR layout with RTL text; logical classes only take effect if forceRTL is ever enabled — then the 28 violations actively break.
- **Dependency:** physical-class cleanup must land before enabling forceRTL.
- **Action:** migrate violations to logical equivalents; add `no-restricted-syntax`/custom rule banning `ml-|mr-|pl-|pr-|border-l-|border-r-|rounded-l-|rounded-r-|left-|right-` in src; implement forceRTL flip + restart flow for fa/ar.
- **Validation:** RTL snapshot/walkthrough in fa; lint rule catches seeded violation; i18n:parity remains green.
- **Roadmap:** R7 "RTL"; AGENTS §4.1.

## GAP-015 · P1 · i18n runtime parity gaps (hardcoded strings, safety-adjacent SOS)
- **Affected:** ~100+ hardcoded English strings — worst: `src/app/sos/index.tsx` (~95% English: emergency labels `:43-45,80-90,117-163`), `(tabs)/account.tsx` (13), `(tabs)/wallet.tsx` (14+), `(tabs)/index.tsx` (12+ incl. wrong-key bug `:251` `t('common.back')` on the SOS card), `booking/review.tsx`/`hotel-review.tsx` (payment-method copy), all booking form placeholders, `ErrorState.tsx:18,21` English defaults; localized digits (`domains/i18n/locale.ts`) and missing-key guard unwired; `app.json` has no `locales` block (native dialogs English-only)
- **Root cause:** parity gate checks only JSON keys, not JSX usage; the R7 runtime audit module was never wired.
- **Risk:** fa/ar travelers see English emergency info (safety-adjacent); violates AGENTS §4.4.
- **Dependency:** none.
- **Action:** extract all strings to the 5 locales; fix the `common.back` misuse; wire `auditTranslationTree()` into a dev/telemetry path; add `expo-localization` plugin locales; add lint rule for raw JSX text in src/app.
- **Validation:** i18n:parity green with new keys; grep-gate for hardcoded literals; SOS screen fully fa.
- **Roadmap:** R7 (runtime missing-key guard, Persian/Arabic QA, text expansion); AGENTS §4.4.

## GAP-016 · P1 · Logout wipe incomplete (state residue + DB/key discontinuity)
- **Affected:** `src/services/security/wipe.ts:47-98` (wipes DB rows + SecureStore + key) — gaps: Zustand in-memory state (`vaultStore.vouchers`, `walletStore.balances/transactions`, `bookingStore.draft` with passenger PNR/passport data) not reset; `unregisterBackgroundSync` (`backgroundSync.ts:135-142`) never called; deleting the SQLCipher key while keeping the encrypted DB file bricks the vault on next launch (interacts with GAP-001 fail-open → plaintext attempt against encrypted file)
- **Root cause:** wipe covers storage layers, not live memory or scheduled tasks; no rekey/rename logic.
- **Risk:** next user on same session can observe previous account's cached PII; vault unavailable after logout.
- **Dependency:** GAP-001.
- **Action:** reset all stores in `logout()`; unregister background task; either keep key + drop rows, or delete the DB file along with the key (choose one, document).
- **Validation:** wipe unit tests extended to stores/task; post-logout launch smoke test.
- **Roadmap:** R2 "logout data wipe", "account switch wipe"; EPIC-02.

## GAP-017 · P1 · Wallet biometric gate is fail-open; no PIN/OTP fallback; toggle cosmetic
- **Affected:** `src/app/(tabs)/wallet.tsx:51-58,155` (gate skipped when hardware/enrollment absent — wallet renders ungated), no PIN/OTP fallback anywhere, `src/app/(tabs)/account.tsx:177-189` (`biometricsEnabled` switch never read by the gate)
- **Root cause:** gate treats "no biometrics" as "no gate"; AGENTS §5.4 mandates graceful PIN/OTP fallback.
- **Risk:** wallet balances/transactions/top-up reachable without any user-presence check on biometric-less devices; setting is a lie.
- **Dependency:** none.
- **Action:** enforce gate in all states (fallback to PIN/OTP when biometrics unavailable/unenrolled); honor `biometricsEnabled`.
- **Validation:** hook tests for all four device states; UI test asserting gate on every entry path.
- **Roadmap:** R1 "biometric unlock", "passcode fallback"; R6 "biometric confirmation".

## GAP-018 · P1 · Layering violations with zero enforcement
- **Affected:** `src/services/sync/backgroundSync.ts:91,102` (runtime import of `@/stores/walletStore` — infrastructure → application), `src/services/api/auth.ts:4`, `src/services/sync/conflictResolver.ts:2` (type imports of stores), `src/domains/voucher/voucher.ts:12` (domain → services type import), `eslint.config.mjs` (no boundary rules)
- **Root cause:** convention-only layering.
- **Risk:** dependency direction erodes silently; domain purity regresses.
- **Dependency:** none.
- **Action:** invert the runtime dependency (wallet sync callback injected from application layer); move shared types to a contracts module; add `import/no-restricted-paths` (or boundaries plugin) enforcing: domains ↛ services/stores/components/react-native; services ↛ stores (runtime).
- **Validation:** ESLint fails on seeded violation; typecheck green.
- **Roadmap:** R0 "architecture decision records / freeze public API shapes"; R3; SKILL-01.

## GAP-019 · P1 · Test pyramid has no component layer; transport-critical auth path untested
- **Affected:** `vitest.config.ts:8-16` (node env; `.tsx` excluded from glob); no `@testing-library/react-native`; `src/test/e2e/flows.test.ts` is module-integration with mocks (Flow E fakes the client); `src/services/api/client.ts` 401 single-flight/`_retried`/clear-on-failure **never executed** by tests; `authStore`, `driver.ts`, `backgroundSync.ts`, `useBiometrics`, notification runtime untested; store tests use SQL-substring-matching fakes
- **Root cause:** node-only harness; UI guarded by source-string greps (`designSystem.test.ts:84-112`).
- **Risk:** any render/logic regression in 17 screens invisible; auth refresh regression silently logs users out or loops.
- **Dependency:** none (RNTL adoption needs its own ADR due to RN 0.77/New Arch compat).
- **Action:** add RNTL + jsdom/RN preset for `src/**/*.test.tsx`; real tests for `client.ts` refresh paths; contract-style tests for API services (MSW as reference pattern).
- **Validation:** CI runs new component suite; coverage report shows client.ts paths exercised.
- **Roadmap:** R10 (token expiry tests, app kill/resume tests); SKILL-06.

## GAP-020 · P1 · UNKNOWN payment recovery non-durable; top-up 3DS redirect unhandled
- **Affected:** `src/app/booking/review.tsx:100-143` (single-shot poll, no retry loop, nothing persisted — draft/bookingId memory-only, no persist middleware in any store), no pending-verification entry point in My Trips; `src/app/(tabs)/wallet.tsx` (top-up `redirectUrl` never opened despite `TopUpIntentResponseSchema` supporting it)
- **Root cause:** R4 recovery flow is ephemeral; R6 3DS only on flight checkout.
- **Risk:** app kill during UNKNOWN loses the verification anchor → user can't resolve a pending payment; Shetab top-ups dead-end.
- **Dependency:** GAP-006.
- **Action:** persist draft+bookingId (vault table); pending-verification list in My Trips with resolve/reverify; open top-up redirectUrl and resume on return.
- **Validation:** unit test — app restart mid-UNKNOWN → recovery entry visible; top-up redirect E2E happy path.
- **Roadmap:** R4 "3DS/redirect state", "booking pending"; R6 "payment intents".

## GAP-021 · P1 · Domain coverage theater (Tour/Visa/Rental/Transfer/CIP/eSIM)
- **Affected:** orphan domains with passing tests and zero consumers: `src/domains/tour|visa|rental|escrow|wallet/ledger|trip|i18n|perf`; dead components: `src/components/esim/EsimQrCard.tsx`, `appointment/TurnSlotGrid.tsx`, `shared/PlaceholderScreen.tsx`; `src/app/(tabs)/index.tsx:40-65` — 8 home tiles all routing to the same flight/hotel-only search (`search.tsx:31` tabs: `flights|hotels`); `search.tsx:294` renders raw English tab keys; Transfer modeled in voucher/vault/booking enums but nothing can create one; CIP is an enum value only; trains tile has no code at all
- **Root cause:** verticals stubbed at the domain level for the R-roadmap optics; product surface is flights+hotels only.
- **Risk:** misleading product claims; maintenance burden; roadmap R4 coverage claims false.
- **Dependency:** product decision required per vertical (adopt-or-remove ADR).
- **Action:** either remove orphan modules (preferred for unroadmapped ones) or wire one vertical end-to-end (search → book → voucher) as the template; make home tiles reflect reality.
- **Validation:** each remaining domain has ≥1 production consumer; home tiles route to real surfaces.
- **Roadmap:** R4; R3 Exit Gate ("no new screen without design system"); roadmap §3 P1 list.

## GAP-022 · P1 · NSC pin provenance unverified (potential hard outage)
- **Affected:** `android/app/src/main/res/xml/network_security_config.xml:11-23` (pins for `itrip-platform.vercel.app`, `api.itrip.ir`, expiry 2027-12-31), `src/services/api/config.ts:56-72` (same pins in JS config; one is the canonical RFC 7469 example pin, two appear verbatim in Mozilla StaticHPKPins.h — not verified against the real serving chains; contradictory comments about intermediates/root)
- **Root cause:** pins copied from public examples, never extracted from actual cert chains.
- **Risk:** if the set doesn't match the real chain, NSC fails closed → **total API outage** for those domains; if only root matches, pinning weaker than claimed.
- **Dependency:** production hostnames must be final.
- **Action:** extract SPKI hashes from the live chains; set expiry + rotation plan; align JS config + comments.
- **Validation:** script extracting pins from live endpoints matches NSC; rotation ADR.
- **Roadmap:** R1 "certificate pinning در native layer، با rotation plan".

## GAP-023 · P1 · Version/metadata drift in user-facing artifacts
- **Affected:** `README.md:14-16,22-30` (advertises v0.3.0 APK as official download), `:26` (claims min Android 8.0/API 26 — actual minSdk 24), `:52,74` (stale 154 keys / 110 tests — actual 189 / 259); `package-lock.json:3-4` (`version: 0.2.0`); tracked `iTRIP-Mobile-v0.2.0.apk.sha256` at repo root; `BUILD.md:157` (claims gradle.properties gitignored — false), `:258` ("72 tests"); `AGENTS.md:296-305` (Phase-3 requirements diverge from reality); `src/app/(tabs)/account.tsx:237` (UI version string "0.2.0 · v3.0"); `RELEASE_NOTES_v0.4.0.md` is accurate ✅
- **Root cause:** docs updated per-release inconsistently; no release checklist enforcing doc sync.
- **Risk:** users verify against the wrong checksum; contributors follow wrong build/security guidance.
- **Dependency:** none. Cheap — scheduled first in Train 1.
- **Action:** update README/BUILD/AGENTS to verified reality; bump lockfile version; remove stale sha256 or replace with v0.4.0; fix UI version string; add doc-sync step to the release checklist.
- **Validation:** grep gate for stale version strings in CI (extend config.security.test.ts).
- **Roadmap:** R0 snapshot/version registration; R11 "release notes/store metadata"; roadmap §3 P0 item (docs remainder).

---

# P2 — Scheduled within their owning trains

## GAP-024 · P2 · Manifest permission bloat
- **Affected:** `android/app/src/main/AndroidManifest.xml:4,6,11` — `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (no `maxSdkVersion` cap), `SYSTEM_ALERT_WINDOW` (likely `expo-dev-client` injection); app.json declares only 6 permissions
- **Action:** cap storage permissions (`maxSdkVersion=32` or remove), drop `expo-dev-client` from production deps or verify plugin injection, align manifest to app.json list.
- **Validation:** manifest diff in security gate test. · **Roadmap:** R1 permission audit; MASVS-PLATFORM.

## GAP-025 · P2 · Dark mode broken half-state
- **Affected:** `src/styles/tokens.ts:125-139` (`darkSemantic` unused), `src/hooks/useTheme.ts` (only consumer: Skeleton), `tailwind.config.js` (no `darkMode` key, 0 `dark:` variants), `app.json` `userInterfaceStyle: automatic` + `_layout.tsx:96-98` status bar flips while surfaces stay light
- **Action:** either implement per-screen dark variants or set `userInterfaceStyle: light` until real; ADR required. · **Validation:** dark-mode device walkthrough. · **Roadmap:** R3 "dark mode".

## GAP-026 · P2 · Accessibility near-baseline
- **Affected:** 1 `accessibilityLabel` app-wide (`Skeleton.tsx:57`); `Input.tsx:27-43` label not associated with field, errors not announced; `OfflineBanner.tsx` silent (no liveRegion); `DatePickerModal.tsx:77-92` presets unlabeled, cancel ~20pt; sub-44dp targets: `search.tsx:240,246` (24px steppers), `:162` (32px swap), `account.tsx:120,147` (~36px chips); `login.tsx:52-61` unlabeled inputs
- **Action:** label association, live regions, 44dp minimums, focus order on P0 journeys. · **Validation:** TalkBack walkthrough of search→checkout. · **Roadmap:** R9 accessibility tasks.

## GAP-027 · P2 · No list virtualization; perf budgets unenforced
- **Affected:** all list screens use `ScrollView`+`.map()` (`my-trips.tsx:126`, `wallet.tsx:173`, `results.tsx:74`, `hotel-results.tsx:75`); no keyExtractor/getItemLayout/windowSize anywhere; 0 `React.memo`; `src/domains/perf/budgets.ts` consumers: zero; `performance.test.ts:44-49` bundle gate skips when `dist/` absent and CI runs tests before export; flights-only zod `.max(30)` mislabeled as "virtualization policy"
- **Action:** FlashList ADR for top lists; reorder CI (export before perf gate) or check bundle size in a dedicated step; wire budgets. · **Validation:** CI fails on oversized bundle; scroll profiling on low-end device. · **Roadmap:** R9 performance tasks.

## GAP-028 · P2 · Feedback plumbing unwired (toast/haptics/state adoption)
- **Affected:** `Toast.tsx` mounted with 0 call sites (Alert.alert ×16: `wallet.tsx:85,116,119,124`; `review.tsx:75,87,138,153,159,197,202,213`; `hotel-review.tsx:76,88,101,147,152,163`; `account.tsx:29`); haptics only via `Button` (most CTAs are raw Pressables); Skeleton in 2 screens, EmptyState in 4, ErrorState in 5, OfflineBanner in 2 of 14 screens; `wallet.tsx:256-264` hand-rolls sync status
- **Action:** replace Alerts with toast; consistent state components across screens. · **Validation:** screen sweep checklist. · **Roadmap:** R3 (toast/banner system, loading/empty/error/offline state systems).

## GAP-029 · P2 · Backup rules miss SQLite WAL/SHM sidecars
- **Affected:** `secure_store_backup_rules.xml` / `secure_store_data_extraction_rules.xml` (exclude only `itrip-vault.db`, not `-wal`/`-shm`); `AndroidManifest.xml:19` `allowBackup="true"`
- **Action:** add sidecar paths to both rule files. · **Validation:** extend config.security.test.ts. · **Roadmap:** R1; MASVS-STORAGE-2.

## GAP-030 · P2 · Voucher/BCBP correctness defects
- **Affected:** `src/domains/voucher/voucher.ts:102-103` (flight field invalid for `W5-1082`-style numbers; cabin class fake letter), `:163` (`toFixed(2)` on IRR totals), `vault.ts:150-153` (`purgeExpired` checks `voucher.status` — field doesn't exist on Voucher type), `vault.ts:48-60` (`server_bookings` dead schema)
- **Action:** BCBP field discipline per spec; drop nonexistent-field purge check; remove or use `server_bookings`. · **Validation:** voucher unit tests with real flight numbers. · **Roadmap:** R5 (offline QR, boarding pass); EPIC-09.

## GAP-031 · P2 · No schema migration mechanism
- **Affected:** `src/services/db/vault.ts:21,23-78` (`CREATE TABLE IF NOT EXISTS` + module boolean; no `PRAGMA user_version`, no migrations table, no rollback story)
- **Action:** versioned migration runner (user_version + ordered migrations) before any schema change lands in later trains. · **Validation:** migration test upgrading a v1 fixture DB. · **Roadmap:** R2 "canonical local schema", "schema migrations", "migration rollback strategy".

## GAP-032 · P2 · CI/release pipeline hardening
- **Affected:** `ci.yml` + `build-and-release-apk.yml` (no `timeout-minutes`), `build-and-release-apk.yml:12` (default tag v0.2.0) + `:122` (`gh release upload --clobber`), no SBOM, no secret scanning (gitleaks/trufflehog absent), `testSuiteSeconds` budget unconsumed
- **Action:** timeouts, protected tag input, SBOM step, secret-scan step. · **Validation:** workflow dry run. · **Roadmap:** R0 SBOM; R10; R11 "crash threshold gate", "release train dashboard".

## GAP-033 · P2 · Assorted correctness defects (batch)
- **Affected:** `src/stores/walletStore.ts:159-163` (`formattedUsd` returns fake `'$0.00'`), `:153-157` (`irrEquivalent` unrounded, hardcoded 600000 fallback), `src/domains/currency/money.ts:46-52` (`format()` float via `toNumber()`); `src/stores/hotelStore.ts:132-134` (fabricates `Guest 1..n` with empty last names into drafts); `src/services/api/booking.ts:170-200` (`getBooking` → null on any error, `listUserBookings` → `[]`, `requestCancellation` defaults `success:true`); `AndroidManifest.xml:25-26` (`ENABLED=false` + `CHECK_ON_LAUNCH=ALWAYS` contradiction); `src/app/(tabs)/index.tsx:72-76,109-248` static content; `android/build.gradle:8` targetSdk 34 (Play requires 35 for updates — R11 blocker); PENDING top-up FX display `wallet.tsx:350` IRR with 2 decimals
- **Action:** batch cleanup with per-item unit tests; targetSdk 35 upgrade gets its own task in Train 11 prep. · **Validation:** suite green + targeted tests per item. · **Roadmap:** R6, R4, R11.

---

## Dependency order for remediation (evidence-based)

```
Train 1 (Foundation):  GAP-023, GAP-008, GAP-018, GAP-032   ← unblock honest CI + architecture enforcement
Train 2 (Security):    GAP-001, GAP-002, GAP-003, GAP-009, GAP-022, GAP-017, GAP-029, GAP-024, GAP-013(early wiring)
Train 3 (Data/Sync):   GAP-006, GAP-011, GAP-016, GAP-031, GAP-010, GAP-020(backend)
Train 4/5 (Domains/Booking): GAP-007, GAP-005, GAP-020(UI), GAP-021(decisions), GAP-030
Train 6 (Wallet):      GAP-004, GAP-010(completion), GAP-033(financial items), GAP-017(verification)
Train 7 (UI/UX/i18n):  GAP-014, GAP-015, GAP-025, GAP-026, GAP-028
Train 8 (Notifications): GAP-012
Train 10 (QA/Perf):    GAP-019, GAP-027
Train 11 (Release):    remaining metadata/targetSdk/rollout items
```

Cross-train rule: **GAP-013 (observability) wires incrementally from Train 2 onward** — silent failures must not hide remediation regressions (ADR-0002).
