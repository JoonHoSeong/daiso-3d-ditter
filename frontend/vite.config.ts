import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 12000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('daisoProducts.json')) {
            return 'catalog-data';
          }
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
        }
      }
    }
  }
});
