import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Hisobchi Ai",
        short_name: "Hisobchi",
        description: "Uzbek voice-based expense, debt, and money tracker",
        theme_color: "#111111",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/"
      }
    })
  ],
  server: {
    proxy: {
      "/api/assistant/analyze": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/api/currency/rates": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/api/uzbekvoice/stt": {
        target: "https://uzbekvoice.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace("/api/uzbekvoice/stt", "/api/v1/stt")
      },
      "/api/uzbekvoice/tts": {
        target: "https://uzbekvoice.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace("/api/uzbekvoice/tts", "/api/v1/tts")
      }
    }
  }
});
