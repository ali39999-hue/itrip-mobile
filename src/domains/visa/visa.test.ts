import { describe, it, expect } from 'vitest';
import {
  VisaCatalogItemSchema,
  VisaApplicationDraftSchema,
  calculateVisaTotal,
  validateVisaDocuments,
  formatVisaProcessingTime,
  type VisaCatalogItem,
} from './visa';

const mockVisa: VisaCatalogItem = {
  id: 'visa-uae-30d',
  countryCode: 'AE',
  countryName: 'United Arab Emirates',
  countryNameFa: 'امارات متحده عربی',
  countryFlag: '🇦🇪',
  visaType: 'TOURIST',
  title: 'Dubai 30-Day Tourist Visa',
  titleFa: 'ویزای ۳۰ روزه توریستی دبی',
  description: 'Single-entry tourist e-visa with quick processing.',
  requiredDocs: [
    {
      key: 'passport',
      title: 'Passport Scan',
      titleFa: 'اسکن صفحه اول پاسپورت',
      type: 'PASSPORT_SCAN',
      instructions: 'Must have at least 6 months validity.',
      instructionsFa: 'حداقل ۶ ماه اعتبار داشته باشد.',
      required: true,
    },
    {
      key: 'photo',
      title: 'Passport Photo',
      titleFa: 'عکس پرسنلی با پس‌زمینه سفید',
      type: 'PERSONAL_PHOTO',
      instructions: 'White background, 6x4 cm.',
      instructionsFa: 'زمینه سفید ۴×۶.',
      required: true,
    },
    {
      key: 'insurance',
      title: 'Travel Insurance',
      titleFa: 'بیمه مسافرتی',
      type: 'TRAVEL_INSURANCE',
      instructions: 'Optional supplementary insurance.',
      instructionsFa: 'بیمه تکمیلی اختیاری.',
      required: false,
    },
  ],
  serviceFee: '15000000',
  govFee: '35000000',
  currency: 'IRR',
  processingDaysMin: 2,
  processingDaysMax: 4,
  needsBiometric: false,
  appealSupported: true,
  maxRevisions: 3,
  isActive: true,
};

describe('Visa Domain', () => {
  it('validates a complete visa catalog item', () => {
    const parsed = VisaCatalogItemSchema.parse(mockVisa);
    expect(parsed.countryCode).toBe('AE');
    expect(parsed.requiredDocs).toHaveLength(3);
  });

  it('validates visa application draft', () => {
    const draft = VisaApplicationDraftSchema.parse({
      visaId: 'visa-uae-30d',
      applicantPassengerId: 'p-12345',
      intendedEntryDate: '2026-11-15',
      stayDurationDays: 30,
      documents: [
        { docKey: 'passport', fileUri: 'file:///vault/passport.jpg' },
      ],
    });
    expect(draft.stayDurationDays).toBe(30);
  });

  it('calculates total fees (service + gov) accurately', () => {
    const total = calculateVisaTotal(mockVisa);
    // 15,000,000 + 35,000,000 = 50,000,000 IRR
    expect(total.amount.toString()).toBe('50000000');
    expect(total.currency).toBe('IRR');
  });

  it('detects missing required documents', () => {
    const uploadedIncomplete = [
      { docKey: 'insurance', fileUri: 'file:///vault/insurance.pdf' },
    ];
    const check = validateVisaDocuments(mockVisa, uploadedIncomplete);
    expect(check.isComplete).toBe(false);
    expect(check.missingDocs).toContain('Passport Scan');
    expect(check.missingDocs).toContain('Passport Photo');

    const uploadedComplete = [
      { docKey: 'passport', fileUri: 'file:///vault/passport.jpg' },
      { docKey: 'photo', fileUri: 'file:///vault/photo.jpg' },
    ];
    const check2 = validateVisaDocuments(mockVisa, uploadedComplete);
    expect(check2.isComplete).toBe(true);
    expect(check2.missingDocs).toHaveLength(0);
  });

  it('formats visa processing time correctly', () => {
    expect(formatVisaProcessingTime(2, 4, false)).toBe('2–4 Business Days');
    expect(formatVisaProcessingTime(3, 3, false)).toBe('3 Business Days');
    expect(formatVisaProcessingTime(2, 4, true)).toBe('2 الی 4 روز کاری');
  });
});
