/**
 * WeatherService — 总调度
 * 
 * 职责:
 * 1. 并发请求 6 源数据 (Promise.allSettled)
 * 2. 融合结果写入 Zustand Store
 * 3. 更新各源状态（水位/延迟/错误）
 */

import { useWeatherStore } from "@/lib/store";
import { SOURCE_NAMES } from "@/lib/config";
import type { SourceId, SourceState, RainDetail, SourceSnapshot } from "@/types/weather";
import type { SourceFetchResult } from "./api/types";
import { qweatherAdapter } from "./api/qweather";
import { seniverseAdapter } from "./api/seniverse";
import { amapAdapter } from "./api/amap";
import { cmaAdapter } from "./api/cma";
import { caiyunAdapter } from "./api/caiyun";
import { apiBoxAdapter } from "./api/api_box";
import { fuseNow, fuseHourly, fuseDaily } from "./api/fusion";

// ─── 源注册表 ───

type Fetcher = (lat: number, lng: number) => Promise<SourceFetchResult>;

type AdapterEntry = { id: SourceId; name: string; fetchNow: Fetcher; fetchHourly?: Fetcher; fetchDaily?: Fetcher; fetchRain?: Fetcher };

const ADAPTERS: AdapterEntry[] = [
  { id: qweatherAdapter.id, name: "和风天气", fetchNow: qweatherAdapter.fetchNow, fetchHourly: qweatherAdapter.fetchHourly, fetchDaily: qweatherAdapter.fetchDaily },
  { id: seniverseAdapter.id, name: "心知天气", fetchNow: seniverseAdapter.fetchNow, fetchDaily: seniverseAdapter.fetchDaily },
  { id: amapAdapter.id, name: "高德地图", fetchNow: amapAdapter.fetchNow, fetchDaily: amapAdapter.fetchDaily },
  { id: cmaAdapter.id, name: "中国气象局", fetchNow: cmaAdapter.fetchNow },
  { id: caiyunAdapter.id, name: "彩云天气", fetchNow: caiyunAdapter.fetchNow, fetchHourly: caiyunAdapter.fetchHourly, fetchDaily: caiyunAdapter.fetchDaily, fetchRain: caiyunAdapter.fetchRain },
  { id: apiBoxAdapter.id, name: "接口盒子", fetchNow: apiBoxAdapter.fetchNow, fetchDaily: apiBoxAdapter.fetchDaily },
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
      };
    }
    this.store.getState().setSources(sources);
  }

  /** 主入口: 刷新全部天气数据 */
  async refresh(lat: number, lng: number): Promise<void> {
    this.store.getState().setLoading(true);
    this.store.getState().setError(null);

    // 并发请求所有源的实况数据
    const nowResults = await this._fetchAll("now", lat, lng);
    this._updateSourceStatus(nowResults);

    // 融合实况
    const current = fuseNow(nowResults, this.store.getState().sources);
    if (current) this.store.getState().setCurrent(current);

    // 并发请求预报
    const [hourlyResults, dailyResults, rainResults] = await Promise.all([
      this._fetchAll("hourly", lat, lng),
      this._fetchAll("daily", lat, lng),
      this._fetchAll("rain", lat, lng),
    ]);
    this._updateSourceStatus([...hourlyResults, ...dailyResults, ...rainResults]);

    // 融合预报
    const hourly = fuseHourly(hourlyResults);
    const daily = fuseDaily(dailyResults);
    if (hourly.length) this.store.getState().setHourly(hourly);
    if (daily.length) this.store.getState().setDaily(daily);

    // 彩云分钟级降水
    const rainResult = rainResults.find((r) => r.sourceId === "caiyun" && r.ok && r.rain);
    if (rainResult?.rain) {
      this.store.getState().setRainDetail(rainResult.rain as RainDetail[]);
    }

    this.store.getState().setLoading(false);
  }

  /** 并行请求所有源的某个数据维度 */
  private async _fetchAll(
    kind: "now" | "hourly" | "daily" | "rain",
    lat: number,
    lng: number
  ): Promise<SourceFetchResult[]> {
    const tasks = ADAPTERS.map(async (adp) => {
      const fetcher = kind === "rain" ? (adp.fetchRain ?? null) :
                      kind === "hourly" ? (adp.fetchHourly ?? null) :
                      kind === "daily" ? (adp.fetchDaily ?? null) :
                      adp.fetchNow;
      if (!fetcher) {
        return { sourceId: adp.id, ok: false, responseMs: 0, error: "不支持此数据维度" } as SourceFetchResult;
      }
      return fetcher(lat, lng);
    });
    return Promise.all(tasks);
  }

  /** 更新各源状态 + 推快照 */
  private _updateSourceStatus(results: SourceFetchResult[]) {
    const sources = { ...this.store.getState().sources };
    const now = new Date().toISOString();
    for (const r of results) {
      const src = sources[r.sourceId];
      if (!src) continue;
      src.lastResponseMs = r.responseMs;
      src.lastError = r.error ?? null;
      src.lastUpdated = now;
      // 推快照
      this.store.getState().pushSnapshot(r.sourceId, {
        timestamp: now,
        temp: r.now?.temp ?? null,
        condition: r.now?.condition ?? null,
        responseMs: r.responseMs,
        error: r.error ?? null,
      });
    }
    this.store.getState().setSources(sources);
    this.store.getState().recomputeStats();
  }
}

/** 单例 */
export const weatherService = new WeatherService();
