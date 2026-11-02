/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { APP_STORE_ID } from './src/config/appStore.js';

// Safari on iPhone and iPad shows its Smart App Banner (Get / Open) from this meta tag.
const smartAppBanner = {
    name: 'smart-app-banner',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'apple-itunes-app', content: `app-id=${APP_STORE_ID}` }, injectTo: 'head' }],
};

export default defineConfig({
    plugins: [react(), smartAppBanner],
    build: {
        outDir: 'dist',
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/setupTests.js'],
    },
});
