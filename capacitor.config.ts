import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.midou.weather",
  appName: "米豆天气",
  webDir: "dist",
  bundledWebRuntime: false,
  backgroundColor: "#0f172a",
  plugins: {
    Geolocation: {
      androidPermissionRequest: "always",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
  },
  server: {
    // 开发时连接本地 Vite dev server
    // url: "http://192.168.1.x:5173",
    // cleartext: true,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
    flavor: "production",
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
