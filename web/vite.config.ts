import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The application is static and is published by GitHub Pages from the docs/ folder.
// Relative base: it works under any path, also when the files are served locally.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    // React in a separate file; the charting library splits by itself: bars, lines and points for almost every
    // section, the map modules only for the pages that have a map
    rollupOptions: { output: { manualChunks: (id) => (id.includes("node_modules/react") || id.includes("node_modules/scheduler") ? "react" : undefined) } },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
