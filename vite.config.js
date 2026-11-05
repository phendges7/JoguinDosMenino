import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, open: false },
  build: { chunkSizeWarningLimit: 1600 }, // Phaser alone is ~1.2 MB
});
