/**
 * 和风天气适配器 — 独立 API Host + JWT 认证
 */
import { HttpClient } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import type { SourceFetchResult, NormalizedNow, NormalizedHourly, NormalizedDaily, NormalizedRain } from "./types";

const client = new HttpClient(SOURCE_CONFIG.qweather.baseUrl, {
  "X-QW-Api-Key": SOURCE_CONFIG.qweather.key,
});

export const qweatherAdapter = {
  id: "qweather" as const,

  async fetchNow(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/v7/weather/now", {
        location: `${lng.toFixed(2)},${lat.toFixed(2)}`,
      });
      const n = data.now;
      const now: NormalizedNow = {
        temp: parseFloat(n.temp),
        feelsLike: parseFloat(n.feelsLike),
        condition: n.text,
        iconCode: n.icon,
        humidity: parseFloat(n.humidity),
        windDir: n.windDir,
        windSpeed: parseFloat(n.windScale) || 0, // 蒲福风级
        pressure: parseFloat(n.pressure),
        visibility: parseFloat(n.vis),
        uv: 0, // 和风实况无UV
        aqi: null,
      };
      return { sourceId: "qweather", ok: true, responseMs: Date.now() - t0, now };
    } catch (e: any) {
      return { sourceId: "qweather", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchHourly(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/v7/weather/24h", {
        location: `${lng.toFixed(2)},${lat.toFixed(2)}`,
      });
      const hourly: NormalizedHourly[] = data.hourly.map((h: any) => ({
        time: h.fxTime,
        temp: parseFloat(h.temp),
        condition: h.text,
        iconCode: h.icon,
        pop: Math.round(parseFloat(h.pop)),
        rainAmount: parseFloat(h.precip),
      }));
      return { sourceId: "qweather", ok: true, responseMs: Date.now() - t0, hourly };
    } catch (e: any) {
      return { sourceId: "qweather", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchDaily(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/v7/weather/7d", {
        location: `${lng.toFixed(2)},${lat.toFixed(2)}`,
      });
      const daily: NormalizedDaily[] = data.daily.map((d: any) => ({
        date: d.fxDate,
        tempHigh: parseFloat(d.tempMax),
        tempLow: parseFloat(d.tempMin),
        condition: d.textDay || d.textNight,
        iconCode: d.iconDay,
        pop: d.pop ? Math.round(parseFloat(d.pop)) : 0,
        rainAmount: parseFloat(d.precip),
        sunrise: d.sunrise,
        sunset: d.sunset,
        windDir: d.windDirDay || "",
        windSpeed: parseFloat(d.windSpeedDay || "0"),
      }));
      return { sourceId: "qweather", ok: true, responseMs: Date.now() - t0, daily };
    } catch (e: any) {
      return { sourceId: "qweather", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchRain(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/v7/minutely/5m", {
        location: `${lng.toFixed(2)},${lat.toFixed(2)}`,
      });
      const rain: NormalizedRain[] = (data.minutely || []).map((m: any) => ({
        time: m.fxTime,
        intensity: parseFloat(m.precip),
      }));
      return { sourceId: "qweather", ok: true, responseMs: Date.now() - t0, rain };
    } catch (e: any) {
      return { sourceId: "qweather", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};
