import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { BRAND, BRAND_URL } from './src/brand.ts';

/** Injects the brand name into index.html. */
const brand = () => ({
  name: 'brand',
  transformIndexHtml: (html: string) => html.replaceAll('%BRAND%', BRAND).replaceAll('%BRAND_URL%', BRAND_URL),
});

export default defineConfig({
  base: './',
  plugins: [brand(), react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
