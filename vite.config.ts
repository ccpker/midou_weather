import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    cors: true,                      // CORS 兜底 — 天气API可能跨域
    host: "0.0.0.0",
    port: 5173,
  },
});
