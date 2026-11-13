import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Config is read from .env.local so the ports and the API address can change
// without touching the code. See .env.example for what each one does.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.VITE_PORT || 5173);
  const target = env.VITE_API_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [react()],
    server: {
      port,
      // Only used when VITE_API_BASE_URL is a path rather than a full address.
      proxy: { "/api": { target, changeOrigin: true } },
    },
    preview: { port },
    build: { outDir: "dist", sourcemap: mode !== "production" },
  };
});
