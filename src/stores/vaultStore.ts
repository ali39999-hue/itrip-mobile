import { create } from 'zustand';
import {
  sortVouchers,
  getVoucherScheduleTime,
  type Voucher,
  type FlightVoucher,
  type HotelVoucher,
  type TourVoucher,
  type TransferVoucher,
} from '@/domains/voucher/voucher';
import { vault } from '@/services/db/vault';

/**
 * Vault store — in-memory mirror of the offline voucher database.
 *
 * Load once at boot (root layout); persist on every confirm.
 * The DB is the durable source; this store is the reactive cache.
 */

interface VaultState {
  vouchers: Voucher[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  addFlightVoucher: (v: FlightVoucher) => Promise<void>;
  addHotelVoucher: (v: HotelVoucher) => Promise<void>;
  addTourVoucher: (v: TourVoucher) => Promise<void>;
  addTransferVoucher: (v: TransferVoucher) => Promise<void>;
  remove: (bookingRef: string) => Promise<void>;
  flightVouchers: () => FlightVoucher[];
  hotelVouchers: () => HotelVoucher[];
  tourVouchers: () => TourVoucher[];
  transferVouchers: () => TransferVoucher[];
  upcoming: () => Voucher[];
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vouchers: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const all = await vault.listVouchers();
      set({ vouchers: sortVouchers(all), loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  addFlightVoucher: async (v) => {
    await vault.saveVoucher(v);
    set((s) => ({
      vouchers: sortVouchers([v, ...s.vouchers.filter((x) => x.bookingRef !== v.bookingRef)]),
    }));
  },

  addHotelVoucher: async (v) => {
    await vault.saveVoucher(v);
    set((s) => ({
      vouchers: sortVouchers([v, ...s.vouchers.filter((x) => x.bookingRef !== v.bookingRef)]),
    }));
  },

  addTourVoucher: async (v) => {
    await vault.saveVoucher(v);
    set((s) => ({
      vouchers: sortVouchers([v, ...s.vouchers.filter((x) => x.bookingRef !== v.bookingRef)]),
    }));
  },

  addTransferVoucher: async (v) => {
    await vault.saveVoucher(v);
    set((s) => ({
      vouchers: sortVouchers([v, ...s.vouchers.filter((x) => x.bookingRef !== v.bookingRef)]),
    }));
  },

  remove: async (bookingRef) => {
    await vault.deleteVoucher(bookingRef);
    set((s) => ({ vouchers: s.vouchers.filter((v) => v.bookingRef !== bookingRef) }));
  },

  flightVouchers: () => get().vouchers.filter((v): v is FlightVoucher => v.kind === 'flight'),
  hotelVouchers: () => get().vouchers.filter((v): v is HotelVoucher => v.kind === 'hotel'),
  tourVouchers: () => get().vouchers.filter((v): v is TourVoucher => v.kind === 'tour'),
  transferVouchers: () => get().vouchers.filter((v): v is TransferVoucher => v.kind === 'transfer'),
  upcoming: () => {
    const now = Date.now();
    return get().vouchers.filter((v) => {
      const scheduleTime = getVoucherScheduleTime(v);
      const at = new Date(scheduleTime).getTime();
      return at >= now;
    });
  },
}));
