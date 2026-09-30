# iTRIP Mobile — Sync Reliability Report (R2 — Data + Sync Reliability)

**Generated:** 2026-09-30
**Scope:** تسک‌های R2 نقشه راه که در این قطار اجرا/راستی‌آزمایی شدند
**Evidence Basis:** 174/174 تست پاس، typecheck/lint/i18n سبز، باندل production موفق.

---

## 1. وضعیت تسک‌های R2 (Task-by-Task)

| R2 Task | Status | Evidence / Implementation |
|---|---|---|
| canonical local schema | ✅ موجود + توسعه | `vault.ts::migrate` — vouchers / mutation_queue / server_bookings + **جدول جدید dead_letter_queue** |
| schema migrations | ✅ موجود | الگوی `CREATE TABLE IF NOT EXISTS` + `migrated` flag؛ forward-compatible با JSON payload |
| migration rollback strategy | ✅ N/A-safe | بدون destructive migration؛ صف و ووچرها فقط append/replace می‌شوند |
| persistent mutation queue | ✅ موجود | SQLite durable queue با FIFO |
| idempotency keys | ✅ موجود + حفظ در DLQ | `UNIQUE idempotency_key` در schema؛ DLQ همان کلید را نگه می‌دارد (replay-safe) |
| retry backoff | ✅ موجود | exponential + jitter، سقف 60s، 5 retry |
| **dead-letter queue محلی** | ✅ **جدید (R2)** | `deadLetterQueue.ts` + integration در `executeMutation` + 8 تست |
| **sync state machine** | ✅ **جدید (R2)** | `syncState.ts` — 6 state، جدول transition، reducer تایپ‌سیف + 7 تست |
| conflict detection & resolution policy | ✅ موجود | `conflictResolver.ts` — financial=server، profile=merge، prefs=client + تست |
| server version / ETag / revision | ⚠️ R11 | نیاز به contract سمت سرور (conditional GET) |
| network reachability | ✅ موجود | `useNetworkStatus` + NetInfo |
| background sync / foreground resync | ✅ موجود | WorkManager task + AppState listener + NetInfo trigger |
| sync progress / error UI, offline badge | ✅ موجود | `OfflineBanner` + sync state در walletStore (`isSyncing`/`syncError`) |
| **stale data policy / data TTL / selective eviction** | ✅ **جدید (R2)** | `vault.purgeExpired` — حذف محافظه‌کارانه ووچرهای terminal قدیمی‌تر از TTL (90d) + defensive purge payload خراب + 3 تست |
| **logout data wipe / account switch wipe** | ✅ **جدید (R2)** | `security/wipe.ts` + اتصال به `authStore.logout` + 4 تست |
| encrypted backups policy | ✅ موجود (R1) | backup/extraction rules exclude کامل |
| telemetry برای sync failures | ✅ موجود | `recordSyncEvent` + redaction تست‌شده |

---

## 2. Dead-Letter Queue — طراحی

```text
mutation exhausted 5 retries
   → status='failed' در queue زنده
   → buildDeadLetterEntry(): حفظ payload + idempotencyKey اصلی
   → INSERT INTO dead_letter_queue (resolution='PENDING_REVIEW')
   → classifyFailure(): NETWORK/AUTH/SERVER → retryable؛ CONFLICT/VALIDATION → manual
```

**Invariant کلیدی:** replay از DLQ با همان `idempotencyKey` انجام می‌شود ⇒ هرگز دوبار اعمال نمی‌شود (exit gate R2: «قطع اینترنت نباید duplicate booking/payment ایجاد کند»).

## 3. Sync State Machine — طراحی

```text
IDLE → SYNCING → UP_TO_DATE | DEGRADED | ERROR
UP_TO_DATE/DEGRADED/ERROR → OFFLINE (network lost)
OFFLINE → SYNCING (network restored) → …
```
- transitionهای غیرمجاز `throw` می‌کنند (مثل booking FSM) ⇒ UI هرگز state فاسد نمایش نمی‌دهد.
- `isFreshEnough()` خط‌مشی freshness برای نمایش trips/wallet (UP_TO_DATE همیشه؛ DEGRADED تا 15 دقیقه).

## 4. Logout Wipe — لایه‌ها

1. Tokens از SecureStore + memory fallback
2. `DELETE` از vouchers / mutation_queue / server_bookings / dead_letter_queue
3. **تخریب کلید SQLCipher** ⇒ ciphertext باقیمانده غیرقابل‌خواندن
4. Sweep دفاعی هر ۳ کلید user-scoped

## 5. Exit Gate — R2

- [x] قطع اینترنت ⇒ صف محلی + replay idempotent ⇒ بدون duplicate payment (gates: idempotency UNIQ + DLQ key preservation)
- [x] corruption محلی: defensive purge + WAL mode
- [x] logout ⇒ هیچ state کاربر قبلی برای اکانت بعدی باقی نمی‌ماند
- [x] همه تغییرات تست‌شده: **+22 تست در R2** (8 DLQ + 7 sync FSM + 3 TTL + 4 wipe)

**وضعیت R2: PASS — Next Allowed Train: R3 — Navigation + Design System**
