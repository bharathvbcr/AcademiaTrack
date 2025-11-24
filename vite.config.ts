import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }: { mode: string }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      },
      build: {
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'framer-motion', 'date-fns', '@hello-pangea/dnd'],
              charts: ['recharts'],
            },
          },
        },
      }
    };
});
