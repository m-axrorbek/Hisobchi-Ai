import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const uzbekVoiceApiKey = env.UZBEKVOICE_API_KEY || "";

  return {
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
          headers: uzbekVoiceApiKey
            ? {
                Authorization: uzbekVoiceApiKey
              }
            : undefined,
          rewrite: (path) => path.replace("/api/uzbekvoice/stt", "/api/v1/stt")
        }
      }
    }
  };
});
