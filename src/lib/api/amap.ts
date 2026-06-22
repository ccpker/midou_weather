/**
 * 高德地图天气适配器
 *
 * 高德天气API需要adcode而非坐标 — 先逆地理转adcode再查天气
 */
import { HttpClient } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import type { SourceFetchResult, NormalizedNow, NormalizedDaily } from "./types";

const client = new HttpClient(SOURCE_CONFIG.amap.baseUrl);

/** 坐标→adcode 缓存，避免同一次刷新重复逆地理 */
let _cachedAdcode: { key: string; adcode: string } | null = null;

async function getAdcode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (_cachedAdcode?.key === cacheKey) return _cachedAdcode.adcode;

  const data = await client.get<any>("/geocode/regeo", {
    key: SOURCE_CONFIG.amap.key,
    location: `${lng.toFixed(6)},${lat.toFixed(6)}`,
    extensions: "base",
  });
  const adcode = data.regeocode?.addressComponent?.adcode ?? SOURCE_CONFIG.amap.adcode ?? "220200";
  _cachedAdcode = { key: cacheKey, adcode };
  return adcode;
}

export const amapAdapter = {
  id: "amap" as const,

  async fetchNow(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const adcode = await getAdcode(lat, lng);
      const data = await client.get<any>("/weather/weatherInfo", {
        key: SOURCE_CONFIG.amap.key,
        city: adcode,
        extensions: "base",
      });
      const l = data.lives?.[0];
      if (!l) throw new Error("No live data");
      const now: NormalizedNow = {
        temp: parseFloat(l.temperature),
        feelsLike: parseFloat(l.temperature), // 高德无体感
        condition: l.weather,
        iconCode: "",
        humidity: parseFloat(l.humidity),
        windDir: l.winddirection,
        windSpeed: parseFloat(l.windpower) || 0, // 蒲福风级 (高德原生)
        pressure: 0,
        visibility: 0,
        uv: 0,
        aqi: null,
      };
      return { sourceId: "amap", ok: true, responseMs: Date.now() - t0, now };
    } catch (e: any) {
      return { sourceId: "amap", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchDaily(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const adcode = await getAdcode(lat, lng);
      const data = await client.get<any>("/weather/weatherInfo", {
        key: SOURCE_CONFIG.amap.key,
        city: adcode,
        extensions: "all",
      });
      const daily: NormalizedDaily[] = (data.forecasts?.[0]?.casts ?? []).map((d: any) => ({
        date: d.date,
        tempHigh: parseFloat(d.daytemp),
        tempLow: parseFloat(d.nighttemp),
        condition: d.dayweather,
        iconCode: "",
        pop: 0, // 高德无降水概率
        rainAmount: 0,
        sunrise: "",
        sunset: "",
        windDir: d.daywind,
        windSpeed: parseFloat(d.daypower) || 0, // 蒲福风级 (高德原生)
      }));
      return { sourceId: "amap", ok: true, responseMs: Date.now() - t0, daily };
    } catch (e: any) {
      return { sourceId: "amap", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};

/** 风力等级→m/s 近似（蒲福风级） */
function _forceToMs(level: number): number {
  if (level <= 0) return 0;
  const map = [0, 1, 3, 5, 7, 10, 13, 16, 20, 23, 27, 31, 35];
  return map[Math.min(level, map.length - 1)] ?? level * 3;
}
