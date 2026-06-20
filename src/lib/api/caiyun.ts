/**
 * 彩云天气适配器 — 分钟级降水预报
 * Token: pFY4X100Ct8MXzmn
 * 端点: /v2.6/{token}/{lng},{lat}/weather
 */
import { HttpClient } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import type { SourceFetchResult, NormalizedNow, NormalizedHourly, NormalizedDaily, NormalizedRain } from "./types";

const client = new HttpClient(SOURCE_CONFIG.caiyun.baseUrl);

export const caiyunAdapter = {
  id: "caiyun" as const,

  async _fetch(lat: number, lng: number): Promise<any> {
    const url = `/v2.6/${SOURCE_CONFIG.caiyun.token}/${lng.toFixed(4)},${lat.toFixed(4)}/weather`;
    // 彩云的路径结构特殊，不能直接拼 baseUrl+path，需要完整 URL
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${SOURCE_CONFIG.caiyun.baseUrl}${url}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  },

  async fetchNow(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await this._fetch(lat, lng);
      const r = data.result.realtime;
      const now: NormalizedNow = {
        temp: r.temperature,
        feelsLike: r.apparent_temperature,
        condition: r.skycon.replace(/^.+_/, ""), // "PARTLY_CLOUDY_NIGHT" → "NIGHT" (暂用)
        iconCode: r.skycon,
        humidity: Math.round(r.humidity * 100),
        windDir: _windDir(r.wind.direction),
        windSpeed: r.wind.speed,
        pressure: Math.round(r.pressure / 100), // Pa→hPa
        visibility: r.visibility,
        uv: r.life_index.ultraviolet?.index ?? 0,
        aqi: data.result.aqi?.chn ?? null,
      };
      return { sourceId: "caiyun", ok: true, responseMs: Date.now() - t0, now };
    } catch (e: any) {
      return { sourceId: "caiyun", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchHourly(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await this._fetch(lat, lng);
      const hourly: NormalizedHourly[] = (data.result.hourly?.precipitation ?? []).map((p: any) => {
        const skycon = data.result.hourly?.skycon?.find((s: any) => s.datetime === p.datetime);
        const temp = data.result.hourly?.temperature?.find((t: any) => t.datetime === p.datetime);
        return {
          time: p.datetime,
          temp: temp?.value ?? 0,
          condition: skycon?.value ?? "",
          iconCode: skycon?.value ?? "",
          pop: Math.round(p.probability * 100),
          rainAmount: p.value,
        };
      });
      return { sourceId: "caiyun", ok: true, responseMs: Date.now() - t0, hourly };
    } catch (e: any) {
      return { sourceId: "caiyun", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchDaily(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await this._fetch(lat, lng);
      const daily: NormalizedDaily[] = (data.result.daily?.temperature ?? []).map((t: any, i: number) => {
        const skycon = data.result.daily?.skycon?.[i];
        const precip = data.result.daily?.precipitation?.[i];
        const astro = data.result.daily?.astro?.[i];
        return {
          date: t.date,
          tempHigh: t.max,
          tempLow: t.min,
          condition: skycon?.value ?? "",
          iconCode: skycon?.value ?? "",
          pop: precip ? Math.round(precip.probability * 100) : 0,
          rainAmount: precip?.max?.value ?? 0,
          sunrise: astro?.sunrise?.time ?? "",
          sunset: astro?.sunset?.time ?? "",
          windDir: "",
          windSpeed: 0,
        };
      });
      return { sourceId: "caiyun", ok: true, responseMs: Date.now() - t0, daily };
    } catch (e: any) {
      return { sourceId: "caiyun", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchRain(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await this._fetch(lat, lng);
      // 分钟级降水 (未来 2 小时)
      const rain: NormalizedRain[] = _flattenMinutelies(data.result.minutely?.precipitation_2h ?? []);
      return { sourceId: "caiyun", ok: true, responseMs: Date.now() - t0, rain };
    } catch (e: any) {
      return { sourceId: "caiyun", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};

function _windDir(deg: number): string {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return dirs[Math.round(deg / 45) % 8];
}

function _flattenMinutelies(precip: any[]): NormalizedRain[] {
  if (!precip) return [];
  const rain: NormalizedRain[] = [];
  // 彩云返回 [data, data, ...]，每分钟一条
  const now = Date.now();
  for (let i = 0; i < precip.length; i++) {
    rain.push({
      time: new Date(now + i * 60000).toISOString(),
      intensity: precip[i],
    });
  }
  return rain;
}
