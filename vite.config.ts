/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/barcodegen/',
  test: { environment: 'happy-dom' },
});
