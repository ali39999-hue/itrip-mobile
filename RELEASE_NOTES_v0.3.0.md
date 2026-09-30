# Release v0.3.0 — Comprehensive Travel & Fintech Domain Expansion

### New Domain Capabilities:
- **Tour Domain (`src/domains/tour/`):** Full guided itineraries, hotel tier multipliers (ECO, STD, LUX), group/private execution models, deposit calculation, departure capacity management (7 unit tests).
- **Visa Domain (`src/domains/visa/`):** Consular catalog, required document checklists, fee decomposition (gov fee + service fee), processing time estimation (5 unit tests).
- **Rental & Transfer Domain (`src/domains/rental/`):** Vehicle fleet models, driver eligibility rules (age & license tenure), insurance tiers, deposit waiver with chauffeur (5 unit tests).
- **Escrow Domain (`src/domains/escrow/`):** 9-state finite state machine, dispute arbitration tracking, 1.5% platform commission calculation (5 unit tests).
- **Hotel Stay Domain Enhancement (`src/domains/hotel/stay.ts`):** Multi-room occupancies, room-specific guest allocations with lead guest flags (+2 unit tests).
- **Digital Travel Vault Voucher Extension (`src/domains/voucher/voucher.ts`):** Extended offline storage to TourVoucher and TransferVoucher with offline scannable barcodes (+1 unit test).
- **UI Expansion:** HomeScreen 8-service responsive grid (Flights, Hotels, Tours, Trains, Visas, Rentals, CIP, eSIM).
- **Visual Assets:** 50+ SVG and PNG icons mapped to typed constant `serviceIcons.ts`.
- **Localization:** 32 new translation keys added with 100% parity across 5 languages (ar, en, fa, ru, zh) totaling 186 keys each.

### Quality & Verification Evidence:
- **Unit & Integration Tests:** 135/135 passed across 24 test files (100% pass rate).
- **TypeScript:** Strict typecheck passed with 0 errors.
- **ESLint:** Code style verified with 0 errors and 0 warnings.
- **i18n Parity:** 5 locales verified with 100% symmetry.
- **Production APK SHA-256 Checksum:** `2a55d6250fc25fe3a682968a2107fcb2a16c3dbd59eea02da0f061c6ab49a3f9`
