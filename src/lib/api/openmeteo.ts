/**
 * Open-Meteo 适配器 — 全球免费天气API，无需Key
 * 
 * 数据源: 全球天气模型(11km分辨率)
 * 接口: https://api.open-meteo.com/v1/forecast
 * 
 * 特点:
 * - 完全免费，非商业使用无需API Key
 * - 响应极快（<10ms，服务器在欧美）
 * - CORS支持，前端直接调用
 * - 每次请求拉全部维度（current + 24h + 7d），省配额
 */

import { HttpClient } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import { msToBeaufort, type SourceFetchResult, type NormalizedNow, type NormalizedHourly, type NormalizedDaily } from "./types";

// Open-Meteo 天气代码 → 中文描述映射
const WMO_CODES: Record<number, { condition: string; icon: string }> = {
  0:  { condition: "晴",        icon: "100" },
  1:  { condition: "晴",        icon: "100" },
  2:  { condition: "多云",      icon: "101" },
  3:  { condition: "阴",        icon: "104" },
  45: { condition: "雾",        icon: "501" },
  48: { condition: "雾凇",      icon: "501" },
  51: { condition: "小雨",      icon: "305" },
  53: { condition: "中雨",      icon: "306" },
  55: { condition: "大雨",      icon: "307" },
  56: { condition: "冻雨",      icon: "313" },
  57: { condition: "冻雨",      icon: "313" },
  61: { condition: "小雨",      icon: "305" },
  63: { condition: "中雨",      icon: "306" },
  65: { condition: "大雨",      icon: "307" },
  66: { condition: "冻雨",      icon: "313" },
  67: { condition: "冻雨",      icon: "313" },
  71: { condition: "小雪",      icon: "400" },
  73: { condition: "中雪",      icon: "401" },
  75: { condition: "大雪",      icon: "402" },
  77: { condition: "雪",        icon: "400" },
  80: { condition: "阵雨",      icon: "300" },
  81: { condition: "中阵雨",    icon: "301" },
  82: { condition: "大阵雨",    icon: "302" },
  85: { condition: "阵雪",      icon: "406" },
  86: { condition: "大阵雪",    icon: "407" },
  95: { condition: "雷阵雨",    icon: "310" },
  96: { condition: "雷暴+冰雹", icon: "311" },
  99: { condition: "雷暴+冰雹", icon: "311" },
};

const client = new HttpClient(SOURCE_CONFIG.openmeteo.baseUrl);

/** Open-Meteo 一次请求拉全部数据，调用后拆分为 now/hourly/daily */
async function fetchAll(lat: number, lng: number): Promise<{
  now: NormalizedNow;
  hourly: NormalizedHourly[];
  daily: NormalizedDaily[];
}> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    timezone: "Asia/Shanghai",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "surface_pressure",
      "visibility",
      "uv_index",
    ].join(","),
    hourly: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability",
      "precipitation",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "sunrise",
      "sunset",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
    ].join(","),
    forecast_days: "7",
  });

  const raw = await client.get<any>(`/forecast?${params.toString()}`);

  const wmoNow = WMO_CODES[raw.current.weather_code] ?? { condition: "未知", icon: "999" };

  const now: NormalizedNow = {
    temp: raw.current.temperature_2m,
    feelsLike: raw.current.apparent_temperature,
    condition: wmoNow.condition,
    iconCode: wmoNow.icon,
    humidity: raw.current.relative_humidity_2m,
    windDir: _degToDir(raw.current.wind_direction_10m),
    windSpeed: msToBeaufort(raw.current.wind_speed_10m / 3.6), // km/h→m/s→蒲福
    pressure: raw.current.surface_pressure,
    visibility: raw.current.visibility ?? 10,
    uv: raw.current.uv_index ?? 0,
    aqi: null, // Open-Meteo 无AQI
  };

  const hourly: NormalizedHourly[] = raw.hourly.time.map((t: string, i: number) => {
    const wmo = WMO_CODES[raw.hourly.weather_code[i]] ?? { condition: "未知", icon: "999" };
    return {
      time: t,
      temp: raw.hourly.temperature_2m[i],
      condition: wmo.condition,
      iconCode: wmo.icon,
      pop: raw.hourly.precipitation_probability[i] ?? 0,
      rainAmount: raw.hourly.precipitation[i] ?? 0,
    };
  });

  const daily: NormalizedDaily[] = raw.daily.time.map((d: string, i: number) => {
    const wmo = WMO_CODES[raw.daily.weather_code[i]] ?? { condition: "未知", icon: "999" };
    return {
      date: d,
      tempHigh: raw.daily.temperature_2m_max[i],
      tempLow: raw.daily.temperature_2m_min[i],
      condition: wmo.condition,
      iconCode: wmo.icon,
      pop: raw.daily.precipitation_probability_max[i] ?? 0,
      rainAmount: raw.daily.precipitation_sum[i] ?? 0,
      sunrise: raw.daily.sunrise[i],
      sunset: raw.daily.sunset[i],
      windDir: _degToDir(raw.daily.wind_direction_10m_dominant[i]),
      windSpeed: msToBeaufort(raw.daily.wind_speed_10m_max[i] / 3.6),
    };
  });

  return { now, hourly, daily };
}

/** 风向角度 → 中文 */
function _degToDir(deg: number): string {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const i = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return `${dirs[i]}风`;
}

// ─── 适配器导出 ───

export const openmeteoAdapter = {
  id: "openmeteo" as const,

  async fetchNow(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await fetchAll(lat, lng);
      return { sourceId: "openmeteo", ok: true, responseMs: Date.now() - t0, now: data.now, hourly: data.hourly, daily: data.daily };
    } catch (e: any) {
      return { sourceId: "openmeteo", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchHourly(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await fetchAll(lat, lng);
      return { sourceId: "openmeteo", ok: true, responseMs: Date.now() - t0, hourly: data.hourly };
    } catch (e: any) {
      return { sourceId: "openmeteo", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchDaily(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await fetchAll(lat, lng);
      return { sourceId: "openmeteo", ok: true, responseMs: Date.now() - t0, daily: data.daily };
    } catch (e: any) {
      return { sourceId: "openmeteo", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};
