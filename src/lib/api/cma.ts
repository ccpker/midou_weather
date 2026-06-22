/**
 * CMA(中国气象局)适配器 — 通过API盒子获取官方数据
 *
 * 数据源: 中国气象局 (CMA)
 * 接口: https://cn.apihz.cn/api/tianqi/tqyb.php
 *
 * 特点:
 * - CMA官方数据，与ECMWF/GFS/商业模型完全独立
 * - 实况全字段(温湿风气压体感) + 8时段逐时(含云量) + 7天预报 + 预警
 * - 每日无调用次数上限（分钟频限）
 * - 地址查询版仅支持地名，内部通过高德逆地理转换坐标
 * - 无AQI（和风+彩云双覆盖）、无suntimes（经纬度版才提供）
 */

import { HttpClient } from "./client";
import { SOURCE_CONFIG } from "@/lib/config";
import type { SourceFetchResult, NormalizedNow, NormalizedHourly, NormalizedDaily } from "./types";

const client = new HttpClient(SOURCE_CONFIG.cma.baseUrl);

// ─── 坐标→城市名（通过高德regeo） ───
// 注：CMA仅支持到县级/地级市，区级(昌邑区/船营区等)在数据库中不存在

let _cachedCity: { key: string; city: string } | null = null;

async function getCityName(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (_cachedCity?.key === cacheKey) return _cachedCity.city;

  const amapClient = new HttpClient(SOURCE_CONFIG.amap.baseUrl);
  const data = await amapClient.get<any>("/geocode/regeo", {
    key: SOURCE_CONFIG.amap.key,
    location: `${lng.toFixed(6)},${lat.toFixed(6)}`,
    extensions: "base",
  });
  const comp = data.regeocode?.addressComponent;
  // 优先 city → district → 省份级市 → 坐标串
  let city = "";
  if (typeof comp?.city === "string" && comp.city && comp.city !== "[]") {
    city = comp.city.replace(/市$/, "");
  } else if (typeof comp?.district === "string" && comp.district) {
    city = comp.district.replace(/区|县|市$/, "");
  } else if (typeof comp?.province === "string" && comp.province) {
    city = comp.province.replace(/省|市$/, "");
  }
  // 只有拿到有效城市名才缓存；失败不缓存，下次重试
  if (city) {
    _cachedCity = { key: cacheKey, city };
  } else {
    throw new Error(`无法解析城市名 (lat=${lat.toFixed(3)} lng=${lng.toFixed(3)})`);
  }
  return city;
}

// ─── CMA 图标URL → 和风图标码（保持统一） ───

const CMA_ICON_MAP: Record<string, string> = {
  "xiaoyu": "305", "zhongyu": "306", "dayu": "307",
  "leizhenyu": "310", "zhenyu": "300",
  "xiaoxue": "400", "zhongxue": "401", "daxue": "402",
  "yin": "104", "duoyun": "101", "qing": "100",
  "wu": "501", "shachen": "503", "fuchen": "504",
};

function cmaIcon(imgUrl: string): string {
  const m = imgUrl.match(/\/([a-z]+)\.png/i);
  return m ? (CMA_ICON_MAP[m[1]] ?? "999") : "999";
}

// ─── 工具函数 ───

function parseHourTime(timeStr: string, dateStr: string): string {
  // 时间如"14:00"，基准日期取从返回的 hourtime 或 uptime
  const date = new Date(dateStr.replace(/\//g, "-"));
  const [h, m] = timeStr.split(":").map(Number);
  date.setHours(h, m ?? 0, 0, 0);
  return date.toISOString();
}

function parseDate(d: string): string {
  return d?.replace(/\//g, "-").substring(0, 10) ?? "";
}

function parseRain(rain: string): number {
  if (!rain || rain === "无降水" || rain === "无") return 0;
  const m = rain.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/** 风力文本→蒲福风级 */
const WIND_LEVEL_MAP: Record<string, number> = {
  "微风": 2, "无持续风向": 2,
  "1级": 1, "2级": 2, "3级": 3, "4级": 4, "5级": 5,
  "6级": 6, "7级": 7, "8级": 8, "9级": 9, "10级": 10,
};

function parseWindSpeed(level: string): number {
  if (WIND_LEVEL_MAP[level] !== undefined) return WIND_LEVEL_MAP[level];
  // 处理"3~4级"这类，取大值
  const m = level.match(/(\d+)/g);
  if (!m) return 0;
  return Math.max(...m.map(Number));
}

// ─── 适配器 ───

export const cmaAdapter = {
  id: "cma" as const,

  async fetchNow(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const city = await getCityName(lat, lng);
      const data = await client.get<any>("/tqyb.php", {
        id: SOURCE_CONFIG.cma.id,
        key: SOURCE_CONFIG.cma.key,
        place: city,
        day: "1",
      });
      if (data.code !== 200) throw new Error(data.msg || "CMA API error");

      const ni = data.nowinfo;
      const now: NormalizedNow = {
        temp: ni.temperature,
        feelsLike: ni.feelst,
        condition: data.weather1,
        iconCode: cmaIcon(data.weather1img),
        humidity: ni.humidity,
        windDir: ni.windDirection,
        windSpeed: ni.windSpeed,
        pressure: ni.pressure,
        visibility: 10,
        uv: 0,
        aqi: null,
      };
      return { sourceId: "cma", ok: true, responseMs: Date.now() - t0, now };
    } catch (e: any) {
      return { sourceId: "cma", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchHourly(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const city = await getCityName(lat, lng);
      const data = await client.get<any>("/tqyb.php", {
        id: SOURCE_CONFIG.cma.id,
        key: SOURCE_CONFIG.cma.key,
        place: city,
        day: "1",
        hourtype: "1",
      });
      if (data.code !== 200) throw new Error(data.msg || "CMA API error");

      const dateRef = data.hourtime || data.uptime || new Date().toISOString();
      const hourly: NormalizedHourly[] = (data.hour1 || []).map((h: any) => ({
        time: parseHourTime(h["时间"], dateRef),
        temp: parseFloat(h["气温"]),
        condition: h["天气"],
        iconCode: cmaIcon(h["图标"]),
        pop: 0,
        rainAmount: parseRain(h["降水"]),
      }));
      return { sourceId: "cma", ok: true, responseMs: Date.now() - t0, hourly };
    } catch (e: any) {
      return { sourceId: "cma", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },

  async fetchDaily(lat: number, lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      const city = await getCityName(lat, lng);
      const data = await client.get<any>("/tqyb.php", {
        id: SOURCE_CONFIG.cma.id,
        key: SOURCE_CONFIG.cma.key,
        place: city,
        day: "7",
      });
      if (data.code !== 200) throw new Error(data.msg || "CMA API error");

      const daily: NormalizedDaily[] = [];

      // Day 0 = 今天 (weather1/weather2 表示白天/夜间)
      daily.push({
        date: parseDate(data.uptime),
        tempHigh: parseFloat(data.wd1),
        tempLow: parseFloat(data.wd2),
        condition: data.weather1,
        iconCode: cmaIcon(data.weather1img),
        pop: 0,
        rainAmount: 0,
        sunrise: "",
        sunset: "",
        windDir: data.winddirection1,
        windSpeed: parseWindSpeed(data.windleve1),
      });

      // Day 1-6 = weatherday2 ~ weatherday7
      for (let i = 2; i <= 7; i++) {
        const d = data["weatherday" + i];
        if (!d) break;
        daily.push({
          date: parseDate(d.date),
          tempHigh: parseFloat(String(d.wd1)),
          tempLow: parseFloat(String(d.wd2)),
          condition: d.weather1,
          iconCode: cmaIcon(d.weather1img),
          pop: 0,
          rainAmount: 0,
          sunrise: "",
          sunset: "",
          windDir: d.winddirection1,
          windSpeed: parseWindSpeed(d.windleve1),
        });
      }

      return { sourceId: "cma", ok: true, responseMs: Date.now() - t0, daily };
    } catch (e: any) {
      return { sourceId: "cma", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};
