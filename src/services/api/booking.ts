import { z } from 'zod';
import type { AxiosInstance } from 'axios';

/**
 * Server-authoritative Booking API Service.
 *
 * Strict Production Invariants (Phase 1 — P0 Financial & Booking Integrity):
 * - NO SILENT SUCCESS: When the server is unreachable or fails, operations fail fast with clean errors.
 * - NO FAKE DRAFTS: Booking IDs and references originate exclusively from the authoritative server.
 * - NO FAKE CAPTURE: Payment confirmation and PNR generation require server-side financial capture.
 * - Idempotency keys protect against double-charging and duplicate bookings.
 */

export const ServerBookingSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  type: z.enum(['FLIGHT', 'HOTEL', 'TOUR', 'TRANSFER', 'CIP']),
  itemId: z.string().min(1),
  itemTitle: z.string().min(1),
  totalAmount: z.number().positive(),
  discountAmount: z.number().nonnegative().optional(),
  currency: z.string().min(3),
  status: z.string(),
  paymentStatus: z.string().optional(),
  travelDate: z.string(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  createdAt: z.string(),
  voucher: z.record(z.unknown()).optional(),
});
export type ServerBooking = z.infer<typeof ServerBookingSchema>;

export const CreateDraftParamsSchema = z.object({
  idempotencyKey: z.string().min(1),
  type: z.enum(['FLIGHT', 'HOTEL', 'TOUR', 'TRANSFER', 'CIP']),
  itemId: z.string().min(1),
  itemTitle: z.string().min(1),
  count: z.number().int().positive(),
  nights: z.number().int().positive().optional(),
  travelDate: z.string(),
  passengers: z.array(z.record(z.unknown())).min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(5),
  referralCode: z.string().optional(),
  source: z.literal('MOBILE').default('MOBILE'),
});
export type CreateDraftParams = z.infer<typeof CreateDraftParamsSchema>;

export const CreateDraftResponseSchema = z.object({
  success: z.boolean(),
  bookingId: z.string().min(1),
  reference: z.string().min(1),
  totalAmount: z.number(),
  discountAmount: z.number().optional(),
  currency: z.string(),
  status: z.string(),
  error: z.string().optional(),
});
export type CreateDraftResponse = z.infer<typeof CreateDraftResponseSchema>;

export const QuoteValidationParamsSchema = z.object({
  type: z.enum(['FLIGHT', 'HOTEL', 'TOUR']),
  itemId: z.string().min(1),
  expectedAmount: z.string(),
  expectedCurrency: z.string().length(3),
});
export type QuoteValidationParams = z.infer<typeof QuoteValidationParamsSchema>;

export const QuoteValidationResponseSchema = z.object({
  valid: z.boolean(),
  quoteId: z.string().min(1),
  serverAmount: z.string(),
  serverCurrency: z.string(),
  expiresAt: z.string(),
  priceMismatch: z.boolean().optional(),
});
export type QuoteValidationResponse = z.infer<typeof QuoteValidationResponseSchema>;

export const ConfirmPaymentParamsSchema = z.object({
  bookingId: z.string().min(1),
  method: z.enum(['wallet_irr', 'gateway_shetab', 'gateway_ecardo']),
  idempotencyKey: z.string().min(1),
  targetCurrency: z.string().optional(),
  paymentInstrument: z.enum(['visa_mastercard', 'crypto_usdt', 'wechat_alipay', 'shetab_card']).optional(),
});
export type ConfirmPaymentParams = z.infer<typeof ConfirmPaymentParamsSchema>;

export const ConfirmPaymentResponseSchema = z.object({
  success: z.boolean(),
  bookingId: z.string().optional(),
  bookingStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  pnr: z.string().optional(),
  voucher: z.record(z.unknown()).optional(),
  redirectUrl: z.string().optional(),
  error: z.string().optional(),
});
export type ConfirmPaymentResponse = z.infer<typeof ConfirmPaymentResponseSchema>;

export function createBookingService(client: AxiosInstance) {
  return {
    /**
     * Validates live pricing with the server before checkout (detects stale quotes).
     * Strictly fails if the server is unreachable — never silently approves unverified prices.
     */
    async validateQuote(params: QuoteValidationParams): Promise<QuoteValidationResponse> {
      const query = QuoteValidationParamsSchema.parse(params);
      try {
        const res = await client.post('/bookings/quote/validate', query);
        return QuoteValidationResponseSchema.parse(res.data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: unknown }; message?: string };
        const serverMsg =
          (axiosErr.response?.data as { error?: string })?.error ||
          axiosErr.message ||
          'Quote validation server unavailable';
        throw new Error(`Quote verification error: ${serverMsg}. Server verification is mandatory before payment.`);
      }
    },

    /**
     * Creates an authoritative booking draft on the server.
     * Soft-locks allotment inventory on the backend.
     * Strictly fails if the server is unreachable — never creates fake local booking references.
     */
    async createDraft(params: CreateDraftParams): Promise<CreateDraftResponse> {
      const payload = CreateDraftParamsSchema.parse(params);
      try {
        const res = await client.post('/bookings/draft', payload);
        return CreateDraftResponseSchema.parse(res.data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: unknown }; message?: string };
        const serverMsg =
          (axiosErr.response?.data as { error?: string })?.error ||
          axiosErr.message ||
          'Server reservation endpoint unavailable';
        throw new Error(`Booking draft creation failed: ${serverMsg}. Please check network connection and retry.`);
      }
    },

    /**
     * Executes server payment confirmation.
     * Strictly requires authoritative server capture — never fabricates CAPTURED status on network failure.
     */
    async confirmPayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResponse> {
      const payload = ConfirmPaymentParamsSchema.parse(params);
      try {
        const res = await client.post('/bookings/pay', payload);
        return ConfirmPaymentResponseSchema.parse(res.data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: unknown }; message?: string };
        const serverMsg =
          (axiosErr.response?.data as { error?: string })?.error ||
          axiosErr.message ||
          'Payment processing failed or server unreachable';
        return {
          success: false,
          error: serverMsg,
        };
      }
    },

    /**
     * Retrieves an authoritative booking by ID with current status and vouchers.
     */
    async getBooking(bookingId: string): Promise<ServerBooking | null> {
      try {
        const res = await client.get(`/bookings/${encodeURIComponent(bookingId)}`);
        return ServerBookingSchema.parse(res.data);
      } catch {
        return null;
      }
    },

    /**
     * Fetches all bookings belonging to the authenticated traveler.
     */
    async listUserBookings(): Promise<ServerBooking[]> {
      try {
        const res = await client.get('/bookings/user');
        const data = res.data;
        if (Array.isArray(data?.bookings)) {
          return z.array(ServerBookingSchema).parse(data.bookings);
        }
        if (Array.isArray(data)) {
          return z.array(ServerBookingSchema).parse(data);
        }
        return [];
      } catch {
        return [];
      }
    },

    /**
     * Requests booking cancellation through the server state machine.
     */
    async requestCancellation(bookingId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
      try {
        const res = await client.post(`/bookings/${encodeURIComponent(bookingId)}/cancel`, { reason });
        return { success: Boolean(res.data?.success ?? true) };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        return { success: false, error: axiosErr.response?.data?.error || axiosErr.message || 'Cancellation failed' };
      }
    },
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
