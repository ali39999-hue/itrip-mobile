# iTrip Mobile (Firuzo) · گاوصندوق دیجیتال و همراه هوشمند سفر

> **همراه عملیاتی سفر و گاوصندوق دیجیتال گردشگران پلتفرم فیروزو (iTrip) برای سیستم‌عامل اندروید**  
> مبتنی بر React Native 0.77+، پایدار بر بستر Expo SDK 52 (New Architecture) و سیستم طراحی NativeWind v4.

---

## 🌟 ستون‌های اصلی محصول (Key Pillars)

1. **گاوصندوق آفلاین سفر (Offline-First Travel Vault & Passes):**
   - دسترسی دائمی و بدون نیاز به اینترنت به بلیت‌های پرواز، کدهای QR فرودگاهی و ووچرهای اقامتی.
   - **کارت آدرس هتل برای رانندگان تاکسی (Driver Card):** نمایش مشخصات و آدرس هتل به خط فارسی به رانندگان تاکسی بدون نیاز به اینترنت یا سیم‌کارت محلی.
   - **صف موتیشن‌های آفلاین (Offline Mutation Queue):** ثبت درخواست‌های لغو سفر، یادداشت‌ها و تنظیمات در زمان قطعی اینترنت و سینک خودکار پس از اتصال با الگوریتم Exponential Backoff.
2. **یکپارچگی عمیق مالی با سرور و NewCash (Server-Authoritative Ledger):**
   - عدم اعتماد به کلاینت در تراکنش‌های مالی؛ اعتبارسنجی قطعی قیمت (Price Quote Validation) و رزرو موجودی روی سرور.
   - چنددرگاهی پرداخت: کیف پول NewCash، کارت‌های بانکی شبکه شتاب، و درگاه بین‌المللی eCardo (ویزا، مسترکارت و تتر USDT).
   - تضمین عدم رخداد خطاهای ممیز شناور پولی با موتور محاسباتی `decimal.js`.
3. **پشتیبانی کامل ۵ زبانه و تقویم دوگانه شمسی/میلادی (Dual Calendar & i18n Parity):**
   - زبان‌های راست‌به‌چپ (فارسی `fa`، عربی `ar`) و چپ‌به‌راست (انگلیسی `en`، چینی `zh`، روسی `ru`) با تطابق ۱۰۰ درصدی کلیدهای ترجمه (۱۵۴ کلید در هر زبان).
   - مبدل تقویم جلالی (خورشیدی) و میلادی با نام ماه‌های بومی در انتخاب تاریخ پرواز و هتل.
4. **امنیت سخت‌افزاری و محافظت از داده‌ها:**
   - ذخیره‌سازی توکن‌های نشست در Android Keystore از طریق `SecureStore`.
   - رمزنگاری پایگاه داده محلی ووچرها با SQLCipher (۲۵۶ بیتی) و بیومتریک (اثر انگشت و چهره).
   - سیاست پینینگ گواهی SSL در محیط Production و حذف اطلاعات حساس از گزارش‌های تله‌متری.

---

## 🛠 استک فناوری (Technology Stack)

| لایه / ماژول | فناوری / کتابخانه |
| :--- | :--- |
| **فریم‌ورک پایه** | React Native 0.77 + Expo SDK 52 (Fabric / TurboModules / Hermes) |
| **مسیریابی** | Expo Router v4 (File-based Tabs & Stacks) |
| **دیزاین سیستم** | NativeWind v4 + Tailwind CSS (انطباق ۱:۱ با توکن‌های فیروزو) |
| **مدیریت استیت** | Zustand v5 + TanStack Query v5 |
| **موتور محاسبات مالی** | Decimal.js (Fixed-point Money Arithmetic) |
| **پایگاه داده آفلاین** | SQLite (با پشتیبانی کامل SQLCipher و Expo SQLite) |
| **موتور سینک و صف آفلاین** | WorkManager + Persistent SQLite Mutation Queue |
| **چندزبانی** | i18next + react-i18next (5 Locales: fa, ar, en, zh, ru) |
| **تقویم بومی** | مبدل اختصاصی تقویم جلالی (Shamsi) و میلادی (Gregorian) |
| **تست‌های واحد و یکپارچگی** | Vitest 2.1 (۸۵ تست خودکار) |

---

## 📁 ساختار پوشه‌بندی (Directory Structure)

```text
src/
├── app/                  # مسیریابی مبتنی بر فایل (Expo Router)
│   ├── (auth)/           # ورود، ارسال و بررسی OTP
│   ├── (tabs)/           # تب‌های پنج‌گانه اصلی (خانه، جستجو، سفرهای من، کیف‌پول، حساب)
│   ├── booking/          # جریان رزرو، نتایج، مرور، مسافران و صفحه تأیید نهایی
│   ├── sos/              # مرکز ابزارهای اضطراری سفر (مبدل ارز، اصطلاحات، شماره‌های اضطراری)
│   └── _layout.tsx       # ریشه ناوبری، فونت‌ها و بازیابی نشست (Bootstrap)
├── components/
│   ├── shared/           # بنر آفلاین و صفحات نگهدارنده
│   └── ui/               # Button, Input, Card, Badge, Skeleton, EmptyState, ErrorState, DatePickerModal
├── domains/              # هسته دامنه خالص (Pure TypeScript)
│   ├── booking/          # ماشین وضعیت ۱۲ گانه رزرو و موتور قیمت‌گذاری
│   ├── calendar/         # مبدل تقویم جلالی و میلادی با تست‌های واحد
│   ├── currency/         # موتور تبدیل و محاسبات پولی (Money Engine)
│   ├── hotel/            # اعتبارسنجی اقامت و تاریخ‌ها
│   ├── identity/         # اعتبارسنجی گذرنامه و مسافران با Zod
│   └── voucher/          # ساختار بارکد گیت پرواز و ووچر هتل
├── hooks/                # وضعیت شبکه، احراز هویت، فونت‌ها، بیومتریک و Push Notification
├── i18n/                 # ترجمه‌ها و تنظیمات چندزبانی (fa, ar, en, zh, ru)
├── services/             # کلاینت HTTP آکسیوس، رزرو، کیف پول، پایگاه داده، صف آفلاین و تله‌متری
├── stores/               # استورهای Zustand (auth, wallet, booking, hotel, vault)
└── styles/               # توکن‌های رنگی فیروزو و global.css
```

---

## 🚀 راه‌اندازی و توسعه (Getting Started)

### پیش‌نیازها
- Node.js >= 18
- ابزار npm یا pnpm
- Android Studio / Android SDK (برای بیلد مستقیم نیتیو)

### دستورات توسعه و تضمین کیفیت (Quality Gates)

```bash
# نصب وابستگی‌ها
npm install

# اجرای سرور توسعه Expo
npm start

# اجرای مستقیم روی اندروید
npm run android

# بررسی تایپ‌های TypeScript (Strict Typecheck)
npm run typecheck

# بررسی استانداردهای کدنویسی (Lint)
npm run lint

# اجرای تست‌های جامع واحد و دامنه (Vitest)
npm run test

# اعتبارسنجی تطابق کلیدهای چندزبانه (i18n Parity Check)
npm run i18n:parity

# اجرای کلیه گیت‌های کنترل کیفی به صورت یکپارچه
npm run verify

# کامپایل باندل Production برای سیستم‌عامل اندروید
npm run build:bundle
```

---

## 📄 مجوز و مالکیت (License)
کلیه حقوق و مالکیت معنوی این پلتفرم متعلق به **مجموعه گردشگری فیروزو (Firuzo / iTrip)** می‌باشد.
