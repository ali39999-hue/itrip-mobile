/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#00A9A5',
        'brand-dark': '#007572',
        mint: '#E6F6F5',
        action: '#F0A62A',
        'action-hover': '#D98E16',
        price: '#9C6209',
        surface: '#FFFFFF',
        soft: '#F8FAFC',
        ink: '#0F172A',
        sub: '#64748B',
        rose: '#E11D48',
        success: '#10B981',
      },
      fontFamily: {
        yekan: ['YekanBakh'],
        geist: ['Geist'],
      },
    },
  },
  plugins: [],
};
