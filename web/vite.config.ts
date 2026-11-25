import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// L'applicazione è statica e viene pubblicata da GitHub Pages dalla cartella docs/.
// base relativa: funziona sotto qualsiasi percorso, anche aprendo il file in locale da un server.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "../docs", emptyOutDir: true, chunkSizeWarningLimit: 1200 },
  test: { include: ["tests/**/*.test.ts"] },
});
