import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'expo-secure-store': path.resolve(__dirname, './src/test/mocks/expo-secure-store.ts'),
      'expo-crypto': path.resolve(__dirname, './src/test/mocks/expo-crypto.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
