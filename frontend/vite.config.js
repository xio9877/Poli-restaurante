import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/auth': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/tables': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
      '/orders': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
      '/dine-in': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/delivery': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/customers': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
      '/users': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
      '/categories': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/products': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/kitchen': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
      '/invoices': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/payments': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/settings': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
      '/admin': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  appType: 'spa',
});
