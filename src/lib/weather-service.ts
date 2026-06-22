/**
 * WeatherService — 单源驱动调度
 * 
 * V4.4 架构:
 * - 主源 (彩云/和风) → 各自独立 fetch，直接写入 store.caiyun / store.qweather
 * - 补充源 → 补主源缺失字段（如 Open-Meteo 补日出/体感）
 * - 不再做五源加权融合
 */

import { useWeatherStore } from "@/lib/store";
import { SOURCE_NAMES } from "@/lib/config";
import type { SourceId, SourceState, SourceSnapshot, DimKey, DimStatus, PrimarySourceId, SourceWeatherData, HourlyForecast, DailyForecast, CurrentWeather } from "@/types/weather";
import type { SourceFetchResult } from "./api/types";
import { qweatherAdapter } from "./api/qweather";
import { openmeteoAdapter } from "./api/openmeteo";
import { amapAdapter } from "./api/amap";
import { caiyunAdapter } from "./api/caiyun";
import { cmaAdapter } from "./api/cma";

// ─── 源注册表 ───

type AdapterEntry = {
  id: SourceId; name: string;
  fetchNow: (lat: number, lng: number) => Promise<SourceFetchResult>;
  fetchHourly?: (lat: number, lng: number) => Promise<SourceFetchResult>;
  fetchDaily?: (lat: number, lng: number) => Promise<SourceFetchResult>;
  fetchRain?: (lat: number, lng: number) => Promise<SourceFetchResult>;
  spatialPrecision: "point" | "district" | "city";
  spatialPrecisionLabel: string;
};

const ADAPTERS: AdapterEntry[] = [
  { id: qweatherAdapter.id, name: "和风天气", fetchNow: qweatherAdapter.fetchNow, fetchHourly: qweatherAdapter.fetchHourly, fetchDaily: qweatherAdapter.fetchDaily, fetchRain: qweatherAdapter.fetchRain, spatialPrecision: "point", spatialPrecisionLabel: "~3km网格" },
  { id: openmeteoAdapter.id, name: "Open-Meteo", fetchNow: openmeteoAdapter.fetchNow, fetchHourly: openmeteoAdapter.fetchHourly, fetchDaily: openmeteoAdapter.fetchDaily, spatialPrecision: "point", spatialPrecisionLabel: "~11km网格" },
  { id: amapAdapter.id, name: "高德地图", fetchNow: amapAdapter.fetchNow, fetchDaily: amapAdapter.fetchDaily, spatialPrecision: "district", spatialPrecisionLabel: "区级" },
  { id: caiyunAdapter.id, name: "彩云天气", fetchNow: caiyunAdapter.fetchNow, fetchHourly: caiyunAdapter.fetchHourly, fetchDaily: caiyunAdapter.fetchDaily, fetchRain: caiyunAdapter.fetchRain, spatialPrecision: "point", spatialPrecisionLabel: "~5km网格" },
  { id: cmaAdapter.id, name: "中国气象局", fetchNow: cmaAdapter.fetchNow, fetchHourly: cmaAdapter.fetchHourly, fetchDaily: cmaAdapter.fetchDaily, spatialPrecision: "city", spatialPrecisionLabel: "地级市" },
];

// ─── 公开 API ───

export class WeatherService {
  private store: typeof useWeatherStore;

  constructor() {
    this.store = useWeatherStore;
    this._initSources();
  }

  private _initSources() {
    const sources = {} as Record<SourceId, SourceState>;
    for (const adp of ADAPTERS) {
      sources[adp.id] = {
        id: adp.id,
        name: adp.name,
        enabled: true,
        weight: 1,
        waterline: 0,
        lastResponseMs: null,
        lastError: null,
        lastUpdated: null,
        spatialPrecision: adp.spatialPrecision,
        spatialPrecisionLabel: adp.spatialPrecisionLabel,
      };
    }
    this.store.getState().setSources(sources);
  }

  /** 获取指定主源的适配器 */
  private getAdapter(id: PrimarySourceId): AdapterEntry {
    return id === "caiyun" ? caiyunEntry : qweatherEntry;
  }

  /** 主入口: 刷新指定主源的完整天气数据 */
  async refreshForSource(sourceId: PrimarySourceId, lat: number, lng: number): Promise<void> {
    const store = this.store.getState();
    store.setSourceWeather(sourceId, { loading: true, error: null });

    const adp = this.getAdapter(sourceId);
    const t0 = Date.now();

    try {
      // 并发请求该源的全部维度
      const [nowR, hourlyR, dailyR, rainR] = await Promise.all([
        adp.fetchNow(lat, lng),
        adp.fetchHourly?.(lat, lng) ?? Promise.resolve(null),
        adp.fetchDaily?.(lat, lng) ?? Promise.resolve(null),
        adp.fetchRain?.(lat, lng) ?? Promise.resolve(null),
      ]);

      // 更新源状态
      this._updateSourceStatus(adp.id, [nowR, hourlyR, dailyR, rainR].filter(Boolean) as SourceFetchResult[]);

      let current: CurrentWeather | null = null;
      if (nowR.ok && nowR.now) {
        current = nowR.now as unknown as CurrentWeather;
        // 补充: 日出日落/体感 — Open-Meteo
        if (sourceId === "caiyun" || sourceId === "qweather") {
          try {
            const omNow = await openmeteoAdapter.fetchNow(lat, lng);
            if (omNow.ok && omNow.now) {
              current = { ...current, feelsLike: omNow.now.feelsLike ?? current.feelsLike };
            }
          } catch { /* 补充源失败不阻断 */ }
        }
      }

      const hourly: HourlyForecast[] = (hourlyR?.ok && hourlyR?.hourly ? hourlyR.hourly : []) as unknown as HourlyForecast[];
      const daily: DailyForecast[] = (dailyR?.ok && dailyR?.daily ? dailyR.daily : []) as unknown as DailyForecast[];

      // 补充: 日出日落进 daily — Open-Meteo
      if (daily.length > 0) {
        try {
          const omDaily = await openmeteoAdapter.fetchDaily?.(lat, lng);
          if (omDaily?.ok && omDaily?.daily) {
            for (let i = 0; i < Math.min(daily.length, omDaily.daily.length); i++) {
              daily[i] = { ...daily[i], sunrise: omDaily.daily[i].sunrise, sunset: omDaily.daily[i].sunset };
            }
          }
        } catch { /* 补充源失败不阻断 */ }
      }

      store.setSourceWeather(sourceId, {
        current,
        hourly,
        daily,
        rainDetail: rainR?.ok && rainR?.rain ? rainR.rain : [],
        loading: false,
        error: current ? null : `${adp.name}实况数据获取失败`,
      });

    } catch (e: any) {
      store.setSourceWeather(sourceId, { loading: false, error: e.message ?? "未知错误" });
    }

    const elapsed = Date.now() - t0;
    // 更新源诊断
    this._updateSourceDiag(adp.id, elapsed);
  }

  /** 回退: 用另一个源的数据填充 (当前源故障时自动切) */
  async fallbackToOther(lat: number, lng: number): Promise<void> {
    const { activeTab, caiyun, qweather } = this.store.getState();
    const other: PrimarySourceId = activeTab === "caiyun" ? "qweather" : "caiyun";
    const otherData = other === "caiyun" ? caiyun : qweather;
    if (otherData.current) return; // 已有数据，不重复请求
    await this.refreshForSource(other, lat, lng);
  }

  /** 更新单个源的状态和快照 */
  private _updateSourceStatus(sourceId: SourceId, results: SourceFetchResult[]) {
    const sources = { ...this.store.getState().sources };
    const src = sources[sourceId];
    if (!src) return;
    const now = new Date().toISOString();
    for (const r of results) {
      src.lastResponseMs = r.responseMs;
      src.lastError = r.ok ? src.lastError : (r.error ?? null);
      src.lastUpdated = now;
    }
    // 推实况快照
    const nowR = results.find((r) => r.now);
    if (nowR) {
      this.store.getState().pushSnapshot(sourceId, {
        timestamp: now,
        temp: nowR.now?.temp ?? null,
        condition: nowR.now?.condition ?? null,
        responseMs: nowR.responseMs,
        error: nowR.error ?? null,
      });
    }
    this.store.getState().setSources(sources);
    this.store.getState().recomputeStats();
  }

  private _updateSourceDiag(sourceId: SourceId, _elapsed: number) {
    const sources = { ...this.store.getState().sources };
    const src = sources[sourceId];
    if (!src) return;
    src.lastUpdated = new Date().toISOString();
    sources[sourceId] = src;
    this.store.getState().setSources(sources);
  }
}

const caiyunEntry = ADAPTERS.find((a) => a.id === "caiyun")!;
const qweatherEntry = ADAPTERS.find((a) => a.id === "qweather")!;

/** 单例 */
export const weatherService = new WeatherService();
