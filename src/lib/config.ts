/**
 * API 配置 — 五源端点与认证
 * 
 * 开发模式走 Vite proxy 绕过 CORS
 * 生产模式(APK)直接访问，依赖 androidScheme:"https" 禁用同源限制
 */

const IS_DEV = import.meta.env.DEV;

export const SOURCE_CONFIG = {
  qweather: {
    baseUrl: IS_DEV ? "/api/qweather" : `https://${import.meta.env.VITE_QWEATHER_HOST ?? "devapi.qweather.com"}`,
    key: import.meta.env.VITE_QWEATHER_KEY ?? "",
  },
  amap: {
    baseUrl: IS_DEV ? "/api/amap" : "https://restapi.amap.com/v3",
    key: import.meta.env.VITE_AMAP_KEY ?? "",
    adcode: "220200",
  },
  caiyun: {
    baseUrl: IS_DEV ? "/api/caiyun" : "https://midou-weather-caiyun.pages.dev",
    token: import.meta.env.VITE_CAIYUN_KEY ?? "",
  },
  openmeteo: {
    baseUrl: IS_DEV ? "/api/openmeteo" : "https://api.open-meteo.com/v1",
  },
  cma: {
    baseUrl: IS_DEV ? "/api/cma" : "https://cn.apihz.cn/api/tianqi",
    id: import.meta.env.VITE_CMA_ID ?? "",
    key: import.meta.env.VITE_CMA_KEY ?? "",
  },
} as const;

/** 源显示名 */
export const SOURCE_NAMES: Record<string, string> = {
  qweather: "和风天气",
  amap: "高德地图",
  caiyun: "彩云天气",
  openmeteo: "Open-Meteo",
  cma: "中国气象局",
};

/** 默认水位 */
export const DEFAULT_WATERLINE = 0;

/** 水位衰减系数：每 24 小时未反馈，水位向 0 衰减 */
export const WATERLINE_DECAY_PER_DAY = 0.5;

/** 权重 softmax 温度参数 */
export const SOFTMAX_TEMPERATURE = 2.0;
