import type { Voucher } from '@/domains/voucher/voucher';
import { getVoucherScheduleTime } from '@/domains/voucher/voucher';

/**
 * Trip Domain (R5 — Travel Vault + In-Trip Mode).
 *
 * A "trip" is a logical grouping of vouchers by schedule proximity:
 * a flight, its hotel, the transfer, the tour — all part of one journey.
 * The vault stores independent vouchers; this module derives the
 * traveler-facing timeline WITHOUT duplicating state (pure functions).
 *
 * Invariants:
 * - Derivation is pure: same input vouchers ⇒ same trips, deterministic.
 * - No mutation of input.
 */

/** Vouchers within this many days of each other join the same trip. */
export const TRIP_CLUSTER_WINDOW_DAYS = 2;

export interface TripTimelineEntry {
  voucher: Voucher;
  /** ISO schedule time (departure / check-in / pickup / tour date). */
  scheduledAt: string;
  /** Short label per kind, i18n key prefix (e.g. 'trip.leg.flight'). */
  legKind: 'flight' | 'hotel' | 'tour' | 'transfer';
}

export interface Trip {
  id: string;
  entries: TripTimelineEntry[];
  /** Earliest schedule time — trip start. */
  startsAt: string;
  /** Latest schedule end approximation — trip end. */
  endsAt: string;
  /** Booking refs included, for quick status lookups. */
  bookingRefs: string[];
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function entryDate(v: Voucher): Date {
  return new Date(getVoucherScheduleTime(v));
}

/** Trip end estimate per kind (hotel checkout, flight arrival, etc.). */
function entryEndDate(v: Voucher): Date {
  const start = entryDate(v);
  if (v.kind === 'hotel') {
    return new Date(v.checkOut);
  }
  if (v.kind === 'flight') {
    return new Date(v.arrivalTime);
  }
  if (v.kind === 'tour') {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.max(v.durationDays - 1, 0));
    return end;
  }
  // transfer: ~2h service window
  return new Date(start.getTime() + 2 * 3_600_000);
}

/**
 * Clusters vouchers into trips by schedule proximity (greedy, chronological).
 * Single-voucher trips are valid (a lone flight is still a trip).
 */
export function deriveTrips(vouchers: Voucher[]): Trip[] {
  const sorted = [...vouchers].sort(
    (a, b) => entryDate(a).getTime() - entryDate(b).getTime(),
  );

  const trips: Trip[] = [];
  let cluster: Voucher[] = [];
  let clusterStart: Date | null = null;

  const flush = () => {
    if (cluster.length === 0) return;
    const entries: TripTimelineEntry[] = cluster.map((v) => ({
      voucher: v,
      scheduledAt: getVoucherScheduleTime(v),
      legKind: v.kind,
    }));
    const start = entries.reduce(
      (min, e) => (e.scheduledAt < min ? e.scheduledAt : min),
      entries[0]!.scheduledAt,
    );
    const end = cluster
      .map(entryEndDate)
      .reduce((max, d) => (d.getTime() > max.getTime() ? d : max))
      .toISOString();
    trips.push({
      id: `trip-${start}`,
      entries,
      startsAt: start,
      endsAt: end,
      bookingRefs: cluster.map((v) => v.bookingRef),
    });
    cluster = [];
    clusterStart = null;
  };

  for (const v of sorted) {
    const d = entryDate(v);
    if (
      clusterStart === null ||
      daysBetween(clusterStart, d) <= TRIP_CLUSTER_WINDOW_DAYS
    ) {
      if (clusterStart === null) clusterStart = d;
      cluster.push(v);
    } else {
      flush();
      clusterStart = d;
      cluster.push(v);
    }
  }
  flush();

  return trips;
}

/** The trip currently in progress or the next upcoming one (null if none). */
export function findActiveTrip(trips: Trip[], now = new Date()): Trip | null {
  for (const t of trips) {
    const start = new Date(t.startsAt);
    const end = new Date(t.endsAt);
    if (start.getTime() <= now.getTime() && now.getTime() <= end.getTime()) {
      return t; // in progress
    }
  }
  // next upcoming
  const upcoming = trips
    .filter((t) => new Date(t.startsAt).getTime() > now.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return upcoming[0] ?? null;
}
