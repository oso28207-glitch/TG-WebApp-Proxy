import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// معرّف __dirname لبيئة ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      buffer: 'buffer/',
      util: 'util/',
      events: 'events/',
      os: resolve('src/shims/os.js'),
      'node:os': resolve('src/shims/os.js'),
      net: resolve('src/shims/net.js'),
      'node:net': resolve('src/shims/net.js'),
      path: resolve('src/shims/path.js'),
      'node:path': resolve('src/shims/path.js'),
      crypto: resolve('src/shims/crypto.js'),
      'node:crypto': resolve('src/shims/crypto.js'),
      fs: resolve('src/shims/fs.js'),
      'node:fs': resolve('src/shims/fs.js'),
      constants: resolve('src/shims/constants.js'),
      stream: resolve('src/shims/stream.js'),
      'node:stream': resolve('src/shims/stream.js'),
      assert: resolve('src/shims/assert.js'),
      'node:assert': resolve('src/shims/assert.js'),
      zlib: resolve('src/shims/zlib.js'),
      'node:zlib': resolve('src/shims/zlib.js'),
      'node-localstorage': resolve('src/shims/node-localstorage.js'),
      'socks': resolve('src/shims/socks.js'),
    },
  },
  define: {
    'global': 'globalThis',
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          teleproto: ['teleproto'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['buffer', 'teleproto', 'util', 'events', 'big-integer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 3000,
  },
});
