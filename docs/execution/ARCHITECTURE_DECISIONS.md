# ARCHITECTURE_DECISIONS — itrip-mobile

ADR log for orchestrator-level decisions. Format: Status / Context / Decision / Consequences.

---

## ADR-0001 · Adopt the provided MASTER_ROADMAP.md (2026-09-30 snapshot) as the single source of truth · ACCEPTED (2026-09-30, Train 0)

**Context:** The repository contained a divergent local `MASTER_ROADMAP.md` (different SHA-256 from the orchestrator-provided document) plus 12 per-train reports and git history claiming "R0..R11 complete". The provided snapshot (dated 2026-09-30) disagrees with those claims and lists open P0s.

**Decision:**
1. The provided document is the sole source of truth for target state; it has been synced verbatim into the repo root by this train.
2. All prior `*_REPORT.md` / `RELEASE_CERTIFICATION_*.md` claims are demoted to *claims*; each was re-verified against code during Train 0 and adjudicated in `CURRENT_STATE.md` §5. No roadmap task is considered complete without a code-backed verification entry in `EVIDENCE.md`.
3. Historical claims that proved **fixed** in `main` (demo identity, seed wallet data, code-level version drift) are recorded as verified-refuted gaps — they will not be re-implemented.

**Consequences:** Report files remain for history but no longer gate anything; the executable truth is `docs/execution/` + code. Any future "task complete" requires: implementation + tests + wired production consumer + evidence entry.

---

## ADR-0002 · Train order confirmed with one deviation: observability wiring pulled forward · ACCEPTED (2026-09-30, Train 0)

**Context:** Orchestrator execution order is Train 0..11 (≈ roadmap R0..R11). The audit found that **every remediation task currently fails silently if it regresses**: the telemetry engine exists (`src/services/telemetry/index.ts`) but has zero callers, there is no crash reporter, and production code has pervasive silent catches. Training 10 (where R10 observability sits) is too late — P0 fixes in Trains 1–6 would be unverifiable in the field until then.

**Decision:**
1. Keep the mandated train order (no reordering of Trains 1–11 scopes).
2. **Deviation (documented per roadmap §12):** minimal telemetry wiring (`recordError`, `recordSyncEvent`, driver-fallback event, payment outcomes) is pulled forward into Train 2 and increments with each subsequent train; full R10 scope (crash reporter adoption, chaos on real transport, release health) remains in Train 10.
3. GAP-023 (metadata sync) and GAP-032 (CI hardening) are pulled forward into Train 1 because later trains depend on honest CI.

**Consequences:** Each train adds ≥1 instrumented failure path; Train 10 then upgrades plumbing → crash reporting + dashboards rather than starting from zero.

---

## ADR-0003 · Fail-closed policy for encryption, pinning, and money · PROPOSED (Train 2 ratification)

**Context:** AGENTS.md mandates fail-closed security, but code is fail-open in three places: DB driver plaintext fallback (GAP-001), adapter fabrication of missing financial fields (GAP-007), and the wallet biometric gate skipping on absent hardware (GAP-017). The JS "pinning check" is vacuous (GAP-008).

**Decision (proposed):**
1. **Vault:** in production builds, an unencrypted driver is a hard error (no plaintext fallback); dev keeps the fallback.
2. **Data adapters:** records missing server-required fields are dropped/flagged, never defaulted — a missing price/address/phone must never become fabricated data.
3. **Identity gate:** wallet access always requires user presence (biometric or PIN/OTP fallback).
4. **Pinning:** native NSC is the single authority; JS-layer pinning claims are removed from code and docs.
5. **Money:** `z.string()` at every contract boundary; Decimal-only arithmetic; breakdown reconciliation verifier added.

**Consequences:** Some flows become strictly less permissive (e.g., hotels with incomplete backend data will render fewer results rather than invented ones). This is intentional and required by the Production Data Rule.

---

## ADR-0004 · Orphan verticals: adopt-or-remove, decided per vertical · PROPOSED (Train 4)

**Context:** Nine domain modules and three components have passing tests and zero production consumers (GAP-021). Tour/Visa/Rental have pure domain logic only; Transfer is half-modeled; CIP/eSIM/trains are enum/tile-level.

**Decision (proposed):** Each vertical gets one of: (a) remove until product signals exist, (b) wire end-to-end using flights as the template (search → book → pay → voucher), or (c) explicit descope ADR. Default is (a) for anything not on the active roadmap. Home tiles must reflect reality.

**Consequences:** Coverage claims shrink to what ships; the search screen tab/tile set becomes the contract for new verticals.
