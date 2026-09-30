import { describe, it, expect } from 'vitest';
import {
  SyncState,
  SyncEvent,
  canSyncTransition,
  syncTransition,
  isFreshEnough,
} from './syncState';

describe('Sync State Machine (R2)', () => {
  it('allows the happy path idle → syncing → upToDate', () => {
    expect(canSyncTransition(SyncState.IDLE, SyncState.SYNCING)).toBe(true);
    expect(canSyncTransition(SyncState.SYNCING, SyncState.UP_TO_DATE)).toBe(true);
  });

  it('allows syncing to end in degraded or error when sub-steps fail', () => {
    expect(canSyncTransition(SyncState.SYNCING, SyncState.DEGRADED)).toBe(true);
    expect(canSyncTransition(SyncState.SYNCING, SyncState.ERROR)).toBe(true);
  });

  it('rejects terminal jumps like idle → upToDate without syncing (except via RESET path)', () => {
    expect(canSyncTransition(SyncState.IDLE, SyncState.UP_TO_DATE)).toBe(false);
    expect(canSyncTransition(SyncState.UP_TO_DATE, SyncState.DEGRADED)).toBe(false);
    expect(canSyncTransition(SyncState.ERROR, SyncState.UP_TO_DATE)).toBe(false);
  });

  it('offline is reachable from idle/upToDate/degraded/error, and exit is via SYNCING or RESET', () => {
    expect(canSyncTransition(SyncState.UP_TO_DATE, SyncState.OFFLINE)).toBe(true);
    expect(canSyncTransition(SyncState.OFFLINE, SyncState.SYNCING)).toBe(true);
    expect(canSyncTransition(SyncState.OFFLINE, SyncState.UP_TO_DATE)).toBe(false);
  });

  it('reducer drives the full lifecycle deterministically', () => {
    let s: SyncState = SyncState.IDLE;
    s = syncTransition(s, SyncEvent.SYNC_STARTED);
    expect(s).toBe(SyncState.SYNCING);
    s = syncTransition(s, SyncEvent.SYNC_PARTIAL_FAILURE);
    expect(s).toBe(SyncState.DEGRADED);
    s = syncTransition(s, SyncEvent.SYNC_STARTED);
    expect(s).toBe(SyncState.SYNCING);
    s = syncTransition(s, SyncEvent.SYNC_SUCCEEDED);
    expect(s).toBe(SyncState.UP_TO_DATE);
    s = syncTransition(s, SyncEvent.NETWORK_LOST);
    expect(s).toBe(SyncState.OFFLINE);
    s = syncTransition(s, SyncEvent.NETWORK_RESTORED);
    expect(s).toBe(SyncState.SYNCING);
    s = syncTransition(s, SyncEvent.SYNC_FAILED);
    expect(s).toBe(SyncState.ERROR);
  });

  it('reducer throws on an illegal transition instead of silently corrupting state', () => {
    expect(() =>
      syncTransition(SyncState.UP_TO_DATE, SyncEvent.SYNC_PARTIAL_FAILURE),
    ).toThrow(/Illegal sync transition/);
  });

  it('isFreshEnough: up-to-date is always fresh; stale timestamp beyond max age is not', () => {
    expect(isFreshEnough(SyncState.UP_TO_DATE, null)).toBe(true);
    const old = new Date(Date.now() - 60 * 60_000).toISOString();
    expect(isFreshEnough(SyncState.IDLE, old, 15 * 60_000)).toBe(false);
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(isFreshEnough(SyncState.DEGRADED, recent, 15 * 60_000)).toBe(true);
    expect(isFreshEnough(SyncState.IDLE, null)).toBe(false);
  });
});
