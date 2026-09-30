import { z } from 'zod';
import Decimal from 'decimal.js';
import { money, type Money, type CurrencyCode } from '@/domains/currency/money';

/**
 * Visa Domain — international consular requirements, applications, and document tracking.
 * Mirrored and upgraded from eCardo Visa Services.
 */

export const VisaTypeSchema = z.enum(['TOURIST', 'BUSINESS', 'TRANSIT', 'PILGRIMAGE', 'MEDICAL']);
export type VisaType = z.infer<typeof VisaTypeSchema>;

export const VisaDocTypeSchema = z.enum([
  'PASSPORT_SCAN',
  'PERSONAL_PHOTO',
  'BANK_STATEMENT',
  'TRAVEL_INSURANCE',
  'FLIGHT_ITINERARY',
  'HOTEL_VOUCHER',
  'NATIONAL_ID',
  'EMPLOYMENT_LETTER',
]);
export type VisaDocType = z.infer<typeof VisaDocTypeSchema>;

export const VisaRequiredDocSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  titleFa: z.string().min(1),
  type: VisaDocTypeSchema,
  instructions: z.string().default(''),
  instructionsFa: z.string().default(''),
  required: z.boolean().default(true),
});
export type VisaRequiredDoc = z.infer<typeof VisaRequiredDocSchema>;

export const VisaCatalogItemSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  countryNameFa: z.string().min(1),
  countryFlag: z.string().min(1),
  visaType: VisaTypeSchema,
  title: z.string().min(1),
  titleFa: z.string().min(1),
  description: z.string().default(''),
  requiredDocs: z.array(VisaRequiredDocSchema),
  serviceFee: z.string().regex(/^\d+(\.\d+)?$/),
  govFee: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.enum(['IRR', 'USD', 'EUR', 'AED', 'CNY', 'RUB']),
  processingDaysMin: z.number().int().min(1),
  processingDaysMax: z.number().int().min(1),
  needsBiometric: z.boolean().default(false),
  appealSupported: z.boolean().default(true),
  maxRevisions: z.number().int().default(3),
  isActive: z.boolean().default(true),
});
export type VisaCatalogItem = z.infer<typeof VisaCatalogItemSchema>;

export const VisaApplicationDraftSchema = z.object({
  visaId: z.string().min(1),
  applicantPassengerId: z.string().min(1),
  intendedEntryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stayDurationDays: z.number().int().min(1).max(90),
  documents: z.array(
    z.object({
      docKey: z.string().min(1),
      fileUri: z.string().min(1),
    }),
  ).default([]),
});
export type VisaApplicationDraft = z.infer<typeof VisaApplicationDraftSchema>;

/** Total consular + service fee */
export function calculateVisaTotal(visa: VisaCatalogItem): Money {
  const service = new Decimal(visa.serviceFee);
  const gov = new Decimal(visa.govFee);
  const total = service.plus(gov).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return money(total, visa.currency as CurrencyCode);
}

/** Check if all mandatory required documents are uploaded */
export function validateVisaDocuments(
  visa: VisaCatalogItem,
  uploadedDocs: Array<{ docKey: string; fileUri: string }>,
): { isComplete: boolean; missingDocs: string[] } {
  const uploadedKeys = new Set(uploadedDocs.map((d) => d.docKey));
  const missing: string[] = [];

  for (const doc of visa.requiredDocs) {
    if (doc.required && !uploadedKeys.has(doc.key)) {
      missing.push(doc.title);
    }
  }

  return {
    isComplete: missing.length === 0,
    missingDocs: missing,
  };
}

/** Format expected processing duration label */
export function formatVisaProcessingTime(minDays: number, maxDays: number, isFa = false): string {
  if (isFa) {
    if (minDays === maxDays) return `${minDays} روز کاری`;
    return `${minDays} الی ${maxDays} روز کاری`;
  }
  if (minDays === maxDays) return `${minDays} Business Days`;
  return `${minDays}–${maxDays} Business Days`;
}
