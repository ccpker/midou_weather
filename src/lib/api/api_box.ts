/**
 * 接口盒子 (apihz.cn) 适配器 — 钻石会员
 */
import { HttpClient } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import type { SourceFetchResult, NormalizedNow, NormalizedDaily } from "./types";

const client = new HttpClient(SOURCE_CONFIG.api_box.baseUrl);

export const apiBoxAdapter = {
  id: "api_box" as const,

  async fetchNow(_lat: number, _lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/tianqi/tqyb.php", {
        id: SOURCE_CONFIG.api_box.id,
        key: SOURCE_CONFIG.api_box.key,
        sheng: SOURCE_CONFIG.api_box.province,
        place: SOURCE_CONFIG.api_box.city,
      });
      if (data.code !== 200) throw new Error(data.msg ?? "API error");

      const d = data.data;
      const now: NormalizedNow = {
        temp: parseFloat(d.wd ?? "0"),
        feelsLike: parseFloat(d.wd ?? "0"),
        condition: d.tq ?? "",
        iconCode: "",
        humidity: parseFloat(d.sd ?? "0"),
        windDir: d.fx ?? "",
        windSpeed: parseFloat(d.fl ?? "0"),
        pressure: parseFloat(d.qy ?? "0"),
        visibility: parseFloat(d.njd ?? "0"),
        uv: 0,
        aqi: parseFloat(d.kongqi ?? "0") || null,
      };
      return { sourceId: "api_box", ok: true, responseMs: Date.now() - t0, now };
    } catch (e: any) {
      return { sourceId: "api_box", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchDaily(_lat: number, _lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const data = await client.get<any>("/tianqi/tqyb.php", {
        id: SOURCE_CONFIG.api_box.id,
        key: SOURCE_CONFIG.api_box.key,
        sheng: SOURCE_CONFIG.api_box.province,
        place: SOURCE_CONFIG.api_box.city,
      });
      if (data.code !== 200) throw new Error(data.msg ?? "API error");

      // 接口盒子可能返回每日预报（不同会员等级字段不同）
      const days = data.data?.tianqi ?? data.data?.days ?? [];
      const daily: NormalizedDaily[] = (Array.isArray(days) ? days : [days]).map((d: any) => ({
        date: d.date ?? d.time ?? "",
        tempHigh: parseFloat(d.high ?? d.htemp ?? "0"),
        tempLow: parseFloat(d.low ?? d.ltemp ?? "0"),
        condition: d.type ?? d.text ?? "",
        iconCode: "",
        pop: parseFloat(d.pop ?? d.jiangshui ?? "0"),
        rainAmount: parseFloat(d.rain ?? "0"),
        sunrise: d.sunrise ?? "",
        sunset: d.sunset ?? "",
        windDir: d.fx ?? "",
        windSpeed: parseFloat(d.fl ?? "0"),
      }));
      return { sourceId: "api_box", ok: true, responseMs: Date.now() - t0, daily };
    } catch (e: any) {
      return { sourceId: "api_box", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};
