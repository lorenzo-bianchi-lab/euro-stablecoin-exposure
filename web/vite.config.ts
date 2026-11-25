import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// L'applicazione è statica e viene pubblicata da GitHub Pages dalla cartella docs/.
// base relativa: funziona sotto qualsiasi percorso, anche aprendo il file in locale da un server.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../docs", emptyOutDir: true, chunkSizeWarningLimit: 700,
    // librerie in file separati: React serve subito, i grafici solo alle sezioni che li usano
    rollupOptions: { output: { manualChunks: (id) => (id.includes("node_modules/echarts") || id.includes("node_modules/zrender") ? "charts" : id.includes("node_modules/react") || id.includes("node_modules/scheduler") ? "react" : undefined) } },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
