import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1000, // raise limit to 1000 KB (default is 500 KB)
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom'],
            'vendor-ui':     ['lucide-react', 'motion'],
            'vendor-charts': ['recharts'],
            'vendor-pdf':    ['jspdf', 'jspdf-autotable'],
            'vendor-excel':  ['xlsx'],
            'vendor-dates':  ['date-fns'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
