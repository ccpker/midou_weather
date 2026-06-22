/**
 * 彩云天气适配器 — 分钟级降水预报
 * Token 硬编码在 Cloudflare Pages Worker 服务端
 * 
 * 彩云 /v2.6/{lng},{lat}/weather 单次返回所有维度数据
 * → 所有 fetchXxx 共享一次请求，避免重复调用导致 429
 */
import { HttpClient, _xhrGet } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import { msToBeaufort, type SourceFetchResult, type NormalizedNow, type NormalizedHourly, type NormalizedDaily, type NormalizedRain } from "./types";

const client = new HttpClient(SOURCE_CONFIG.caiyun.baseUrl);

/** 单次请求缓存（同轮 fetchAll 中复用） */
let _CACHE: { ts: number; data: any } | null = null;

/** 拉取彩云全量数据（单次 API 调用，含 2s 间隔防限流） */
async function _fetchAll(lat: number, lng: number): Promise<any> {
  const cache = _CACHE;
  // 同轮已有缓存直接返回
  if (cache && Date.now() - cache.ts < 3000) return cache.data;

  // 距上次请求不足 2s → 等待
  if (cache && Date.now() - cache.ts < 2000) {
    await new Promise(r => setTimeout(r, 2000 - (Date.now() - cache.ts)));
  }

  const url = `${SOURCE_CONFIG.caiyun.baseUrl}/${lng.toFixed(4)},${lat.toFixed(4)}/weather`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch {
      // fetch 被 CORS 拦截 → 走 XHR 回退
      res = await _xhrGet(url);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _CACHE = { ts: Date.now(), data };
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const caiyunAdapter = {
  id: "caiyun" as const,

  async fetchNow(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await _fetchAll(lat, lng);
      const r = data.result.realtime;
      const now: NormalizedNow = {
        temp: r.temperature,
        feelsLike: r.apparent_temperature,
        condition: r.skycon.replace(/^.+_/, ""),
        iconCode: r.skycon,
        humidity: Math.round(r.humidity * 100),
        windDir: _windDir(r.wind.direction),
        windSpeed: msToBeaufort(r.wind.speed),
        pressure: Math.round(r.pressure / 100),
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
      const data = await _fetchAll(lat, lng);
      const hourly: NormalizedHourly[] = (data.result.hourly?.precipitation ?? []).map((p: any) => {
        const skycon = data.result.hourly?.skycon?.find((s: any) => s.datetime === p.datetime);
        const temp = data.result.hourly?.temperature?.find((t: any) => t.datetime === p.datetime);
        return {
          time: p.datetime,
          temp: temp?.value ?? 0,
          condition: skycon?.value ?? "",
          iconCode: skycon?.value ?? "",
          pop: Math.round(p.probability),
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
      const data = await _fetchAll(lat, lng);
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
          pop: precip ? Math.round(precip.probability) : 0,
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
      const data = await _fetchAll(lat, lng);
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
  const now = Date.now();
  for (let i = 0; i < precip.length; i++) {
    rain.push({
      time: new Date(now + i * 60000).toISOString(),
      intensity: precip[i],
    });
  }
  return rain;
}
