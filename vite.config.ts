import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    cors: true,
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/qweather": {
        target: "https://k77h2tb3b6.re.qweatherapi.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/qweather/, ""),
        headers: { Host: "k77h2tb3b6.re.qweatherapi.com" },
      },
      "/api/amap": {
        target: "https://restapi.amap.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/amap/, ""),
      },
      "/api/caiyun": {
        target: "https://midou-weather-caiyun.pages.dev",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/caiyun/, ""),
      },
      "/api/openmeteo": {
        target: "https://api.open-meteo.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/openmeteo/, ""),
      },
      "/api/cma": {
        target: "https://cn.apihz.cn",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/cma/, ""),
      },
    },
  },
});
