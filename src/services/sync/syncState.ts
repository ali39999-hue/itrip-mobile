/**
 * Sync State Machine (R2 — Data + Sync Reliability).
 *
 * A deterministic, testable model of the app-level sync lifecycle.
 * The engine (backgroundSync.ts) reports transitions; this module owns
 * the valid-transition table so UI can render progress/errors/badges
 * from a single source of truth.
 *
 * States:
 *  idle        — nothing running, data possibly stale
 *  syncing     — a full sync cycle is executing
 *  upToDate    — last sync completed successfully
 *  degraded    — sync completed but some sub-steps failed (best-effort parts)
 *  offline     — network unreachable; mutations may be queued locally
 *  error       — sync failed hard (e.g. auth/refresh failed)
 */

export const SyncState = {
  IDLE: 'IDLE',
  SYNCING: 'SYNCING',
  UP_TO_DATE: 'UP_TO_DATE',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE',
  ERROR: 'ERROR',
} as const;

export type SyncState = (typeof SyncState)[keyof typeof SyncState];

export const SyncEvent = {
  SYNC_STARTED: 'SYNC_STARTED',
  SYNC_SUCCEEDED: 'SYNC_SUCCEEDED',
  SYNC_PARTIAL_FAILURE: 'SYNC_PARTIAL_FAILURE',
  SYNC_FAILED: 'SYNC_FAILED',
  NETWORK_LOST: 'NETWORK_LOST',
  NETWORK_RESTORED: 'NETWORK_RESTORED',
  RESET: 'RESET',
} as const;

export type SyncEvent = (typeof SyncEvent)[keyof typeof SyncEvent];

export const allowedSyncTransitions: Record<SyncState, readonly SyncState[]> = {
  IDLE: [SyncState.SYNCING, SyncState.OFFLINE],
  SYNCING: [SyncState.UP_TO_DATE, SyncState.DEGRADED, SyncState.ERROR, SyncState.OFFLINE],
  UP_TO_DATE: [SyncState.SYNCING, SyncState.OFFLINE],
  DEGRADED: [SyncState.SYNCING, SyncState.OFFLINE],
  OFFLINE: [SyncState.SYNCING, SyncState.IDLE],
  ERROR: [SyncState.SYNCING, SyncState.OFFLINE, SyncState.IDLE],
};

export function canSyncTransition(from: SyncState, to: SyncState): boolean {
  return allowedSyncTransitions[from]?.includes(to) ?? false;
}

/** Pure reducer: transitions state on an event, throwing on illegal moves. */
export function syncTransition(current: SyncState, event: SyncEvent): SyncState {
  let next: SyncState;
  switch (event) {
    case SyncEvent.SYNC_STARTED:
    case SyncEvent.NETWORK_RESTORED:
      next = SyncState.SYNCING;
      break;
    case SyncEvent.SYNC_SUCCEEDED:
      next = SyncState.UP_TO_DATE;
      break;
    case SyncEvent.SYNC_PARTIAL_FAILURE:
      next = SyncState.DEGRADED;
      break;
    case SyncEvent.SYNC_FAILED:
      next = SyncState.ERROR;
      break;
    case SyncEvent.NETWORK_LOST:
      next = SyncState.OFFLINE;
      break;
    case SyncEvent.RESET:
      next = SyncState.IDLE;
      break;
  }
  if (!canSyncTransition(current, next)) {
    throw new Error(`Illegal sync transition: ${current} → ${next} (event: ${event})`);
  }
  return next;
}

/** UI hint: is data freshness acceptable for displaying trips/wallet? */
export function isFreshEnough(state: SyncState, lastSyncedAt: string | null, maxAgeMs = 15 * 60_000): boolean {
  if (state === SyncState.UP_TO_DATE) return true;
  if (!lastSyncedAt) return false;
  return Date.now() - new Date(lastSyncedAt).getTime() < maxAgeMs;
}
