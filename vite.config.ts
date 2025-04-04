import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    },
    open: true,
    watch: {
      usePolling: true
    }
  },
  optimizeDeps: {
    include: ['@tanstack/react-table', 'react', 'react-dom', 'react-router-dom']
  },
  build: {
    outDir: 'dist',
    sourcemap: 'inline',
    minify: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Skip all warnings
        return;
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  logLevel: 'silent'
})
