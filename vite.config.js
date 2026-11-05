import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works from any folder,
  // e.g. GitHub Pages at https://<user>.github.io/JoguinDosMenino/
  base: './',
  server: { port: 5173, open: false },
  build: { chunkSizeWarningLimit: 1600 }, // Phaser alone is ~1.2 MB
});
