/**
 * 心知天气适配器
 */
import { HttpClient } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import type { SourceFetchResult, NormalizedNow, NormalizedDaily } from "./types";

const client = new HttpClient(SOURCE_CONFIG.seniverse.baseUrl);

export const seniverseAdapter = {
  id: "seniverse" as const,

  async fetchNow(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/weather/now.json", {
        key: SOURCE_CONFIG.seniverse.key,
        location: `${lat}:${lng}`,
        language: "zh-Hans",
        unit: "c",
      });
      const r = data.results?.[0]?.now;
      if (!r) throw new Error("No result");
      const now: NormalizedNow = {
        temp: parseFloat(r.temperature),
        feelsLike: parseFloat(r.temperature), // 心知无体感
        condition: r.text,
        iconCode: r.code,
        humidity: parseFloat(r.humidity),
        windDir: r.wind_direction,
        windSpeed: parseFloat(r.wind_speed),
        pressure: parseFloat(r.pressure),
        visibility: parseFloat(r.visibility),
        uv: parseFloat(r.uv ?? "0"),
        aqi: null,
      };
      return { sourceId: "seniverse", ok: true, responseMs: Date.now() - t0, now };
    } catch (e: any) {
      return { sourceId: "seniverse", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchDaily(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/weather/daily.json", {
        key: SOURCE_CONFIG.seniverse.key,
        location: `${lat}:${lng}`,
        language: "zh-Hans",
        unit: "c",
        days: "7",
      });
      const daily: NormalizedDaily[] = (data.results?.[0]?.daily ?? []).map((d: any) => ({
        date: d.date,
        tempHigh: parseFloat(d.high),
        tempLow: parseFloat(d.low),
        condition: d.text_day || d.text_night,
        iconCode: d.code_day,
        pop: parseFloat(d.precip ?? "0"),
        rainAmount: parseFloat(d.rainfall ?? "0"),
        sunrise: d.sunrise ?? "",
        sunset: d.sunset ?? "",
        windDir: d.wind_direction ?? "",
        windSpeed: parseFloat(d.wind_speed ?? "0"),
      }));
      return { sourceId: "seniverse", ok: true, responseMs: Date.now() - t0, daily };
    } catch (e: any) {
      return { sourceId: "seniverse", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};
