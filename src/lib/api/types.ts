import type {
  CurrentWeather, HourlyForecast, DailyForecast, RainDetail,
  SourceId, SourceForecast,
} from "@/types/weather";

// ─── 各源返回原始数据，由 FusionEngine 统一归一化 ───

export interface SourceFetchResult {
  sourceId: SourceId;
  ok: boolean;
  responseMs: number;
  error?: string;

  // 原始数据（供融合引擎加工）
  now?: NormalizedNow;
  hourly?: NormalizedHourly[];
  daily?: NormalizedDaily[];
  rain?: NormalizedRain[];
}

// ─── 蒲福风力等级转换 (m/s → 0-12) ───

const BEAUFORT_MS = [0, 0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];

export function msToBeaufort(ms: number): number {
  for (let i = 12; i >= 0; i--) {
    if (ms >= BEAUFORT_MS[i]) return i;
  }
  return 0;
}

/** 归一化实况 */
export interface NormalizedNow {
  temp: number;
  feelsLike: number;
  condition: string;       // 中文: "小雨"/"晴"
  iconCode: string;        // 源内图标码
  humidity: number;
  windDir: string;
  windSpeed: number;       // 蒲福风级 (0-12)
  pressure: number;
  visibility: number;
  uv: number;
  aqi: number | null;
}

/** 归一化小时预报 */
export interface NormalizedHourly {
  time: string;            // ISO
  temp: number;
  condition: string;
  iconCode: string;
  pop: number;             // 0-100
  rainAmount: number;
}

/** 归一化日预报 */
export interface NormalizedDaily {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  iconCode: string;
  pop: number;
  rainAmount: number;
  sunrise: string;
  sunset: string;
  windDir: string;
  windSpeed: number;
}

/** 归一化分钟级降水 */
export interface NormalizedRain {
  time: string;
  intensity: number;       // mm/h
}

/** 数据源适配器接口 */
export interface WeatherSourceAdapter {
  id: SourceId;
  fetchNow(lat: number, lng: number): Promise<SourceFetchResult>;
  fetchHourly?(lat: number, lng: number): Promise<SourceFetchResult>;
  fetchDaily?(lat: number, lng: number): Promise<SourceFetchResult>;
  fetchRain?(lat: number, lng: number): Promise<SourceFetchResult>;
}
