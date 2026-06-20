/**
 * API 配置 — 6源端点与认证
 * 
 * 生产环境 key 可从远程配置中心下发，覆盖此默认值
 */

export const SOURCE_CONFIG = {
  qweather: {
    baseUrl: "https://k77h2tb3b6.re.qweatherapi.com",
    key: import.meta.env.VITE_QWEATHER_KEY ?? "",
    cityCode: "101060201", // 吉林市
  },
  seniverse: {
    baseUrl: "https://api.seniverse.com/v3",
    key: import.meta.env.VITE_SENIVERSE_KEY ?? "",
    location: "jilin",
  },
  amap: {
    baseUrl: "https://restapi.amap.com/v3",
    key: import.meta.env.VITE_AMAP_KEY ?? "",
    adcode: "220200", // 吉林市
  },
  cma: {
    baseUrl: "http://d1.weather.com.cn/sk_2d",
    cityCode: "101060201",
    /** 移动端需走 CmaWeather 原生插件绕过 TLS 指纹检测 */
    useNativePlugin: true,
  },
  caiyun: {
    baseUrl: "https://api.caiyunapp.com/v2.6",
    token: "pFY4X100Ct8MXzmn",
  },
  api_box: {
    baseUrl: "https://cn.apihz.cn/api",
    id: "10016685",
    key: "e54c2408713989edaa053c4ec7584cf9",
    province: "吉林",
    city: "吉林",
  },
} as const;

/** 源显示名 */
export const SOURCE_NAMES: Record<string, string> = {
  qweather: "和风天气",
  seniverse: "心知天气",
  amap: "高德地图",
  cma: "中国气象局",
  caiyun: "彩云天气",
  api_box: "接口盒子",
};

/** 默认水位 */
export const DEFAULT_WATERLINE = 0;

/** 水位衰减系数：每 24 小时未反馈，水位向 0 衰减 */
export const WATERLINE_DECAY_PER_DAY = 0.5;

/** 权重 softmax 温度参数 */
export const SOFTMAX_TEMPERATURE = 2.0;
