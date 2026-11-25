import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// L'applicazione è statica e viene pubblicata da GitHub Pages dalla cartella docs/.
// base relativa: funziona sotto qualsiasi percorso, anche aprendo il file in locale da un server.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../docs", emptyOutDir: true, chunkSizeWarningLimit: 700,
    // React in un file a parte; la libreria dei grafici si divide da sola: barre, linee e punti per quasi tutte le
    // sezioni, i moduli della mappa solo per le pagine che hanno una mappa
    rollupOptions: { output: { manualChunks: (id) => (id.includes("node_modules/react") || id.includes("node_modules/scheduler") ? "react" : undefined) } },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
