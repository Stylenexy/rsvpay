import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { BRAND } from './src/brand.ts';

/** Injects the brand name into index.html. */
const brand = () => ({
  name: 'brand',
  transformIndexHtml: (html: string) => html.replaceAll('%BRAND%', BRAND),
});

export default defineConfig({
  base: './',
  plugins: [brand(), react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
