/**
 * 融合引擎 — 多源数据归一化、去噪、加权
 * 
 * 核心逻辑:
 * 1. 对每个数据点取多源中位值
 * 2. 有权重时加权平均
 * 3. 计算各源对最终值的贡献（用于水位反馈）
 */

import type {
  SourceId, SourceState, SourceForecast, CurrentWeather,
  HourlyForecast, DailyForecast,
} from "@/types/weather";
import type {
  NormalizedNow, NormalizedHourly, NormalizedDaily, SourceFetchResult,
} from "./types";

/** 融合实况 → CurrentWeather */
export function fuseNow(results: SourceFetchResult[], sources: Record<SourceId, SourceState>): CurrentWeather | null {
  const alive = results.filter((r) => r.ok && r.now);
  if (alive.length === 0) return null;

  // 提取权重
  const weights = alive.map((r) => {
    const src = sources[r.sourceId];
    const w = src?.enabled !== false ? (src?.weight ?? 1) : 0;
    return w;
  });

  const tempts = alive.map((r) => r.now!.temp);
  const feels = alive.map((r) => r.now!.feelsLike);
  const humids = alive.map((r) => r.now!.humidity);

  // 天气现象: 多数投票
  const conditions = alive.map((r) => r.now!.condition);

  const sourceBreakdown: Record<string, SourceForecast> = {} as Record<SourceId, SourceForecast>;
  for (const r of alive) {
    sourceBreakdown[r.sourceId] = {
      temp: r.now!.temp,
      condition: r.now!.condition,
      confidence: (sources as Record<string, SourceState>)[r.sourceId]?.waterline ?? 0,
    };
  }

  return {
    temp: Math.round(_wavg(tempts, weights) * 10) / 10,
    feelsLike: Math.round(_wavg(feels, weights) * 10) / 10,
    condition: _mode(conditions),
    icon: alive[0].now!.iconCode, // TODO: 统一图标映射
    humidity: Math.round(_wavg(humids, weights)),
    windDir: alive[0].now!.windDir,
    windSpeed: Math.round(_wavg(alive.map((r) => r.now!.windSpeed), weights) * 10) / 10,
    visibility: Math.round(_wavg(alive.map((r) => r.now!.visibility), weights)),
    pressure: Math.round(_wavg(alive.map((r) => r.now!.pressure), weights)),
    uv: Math.round(_wavg(alive.map((r) => r.now!.uv), weights)),
    aqi: alive.find((r) => r.now!.aqi !== null)?.now!.aqi ?? null,
    sourceBreakdown: sourceBreakdown as Record<string, SourceForecast>,
  };
}

/** 融合小时预报 */
export function fuseHourly(results: SourceFetchResult[]): HourlyForecast[] {
  const alive = results.filter((r) => r.ok && r.hourly && r.hourly.length > 0);
  if (alive.length === 0) return [];

  // 以第一个有数据的源为时间轴基准
  const base = alive[0].hourly!;
  const merged: HourlyForecast[] = [];

  for (let i = 0; i < base.length; i++) {
    const temps: number[] = [];
    const pops: number[] = [];
    const rains: number[] = [];
    const conditions: string[] = [];

    for (const r of alive) {
      const h: NormalizedHourly | undefined = r.hourly?.[i];
      if (h) {
        temps.push(h.temp);
        pops.push(h.pop);
        rains.push(h.rainAmount);
        conditions.push(h.condition);
      }
    }

    const hour = base[i];
    merged.push({
      time: hour.time,
      temp: Math.round(_avg(temps) * 10) / 10,
      condition: _mode(conditions),
      icon: hour.iconCode,
      pop: Math.round(_avg(pops)),
      rainAmount: Math.round(_avg(rains) * 10) / 10,
      isTurning: false, // 由调用方后处理标记
    });
  }

  // 标记变化节点: 温度或降雨趋势拐点
  return _markTurningPoints(merged);
}

/** 融合日预报 */
export function fuseDaily(results: SourceFetchResult[]): DailyForecast[] {
  const alive = results.filter((r) => r.ok && r.daily && r.daily.length > 0);
  if (alive.length === 0) return [];

  const base = alive[0].daily!;
  return base.map((d, i) => {
    const highs: number[] = [], lows: number[] = [], pops: number[] = [], conds: string[] = [];
    for (const r of alive) {
      const day: NormalizedDaily | undefined = r.daily?.[i];
      if (day) {
        highs.push(day.tempHigh);
        lows.push(day.tempLow);
        pops.push(day.pop);
        conds.push(day.condition);
      }
    }
    return {
      date: d.date,
      tempHigh: Math.round(_avg(highs)),
      tempLow: Math.round(_avg(lows)),
      condition: _mode(conds),
      icon: d.iconCode,
      pop: Math.round(_avg(pops)),
      rainAmount: Math.round(_avg(alive.flatMap((r) => r.daily?.[i]?.rainAmount ?? [])) * 10) / 10,
      sunrise: d.sunrise,
      sunset: d.sunset,
      windDir: d.windDir,
      windSpeed: d.windSpeed,
    };
  });
}

// ─── 工具函数 ───

function _wavg(vals: number[], weights: number[]): number {
  let sum = 0, wsum = 0;
  for (let i = 0; i < vals.length; i++) {
    sum += vals[i] * weights[i];
    wsum += weights[i];
  }
  return wsum === 0 ? 0 : sum / wsum;
}

function _avg(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** 众数 */
function _mode(vals: string[]): string {
  const freq: Record<string, number> = {};
  for (const v of vals) {
    freq[v] = (freq[v] ?? 0) + 1;
  }
  let best = vals[0] ?? "";
  let bestFreq = 0;
  for (const [k, f] of Object.entries(freq)) {
    if (f > bestFreq) {
      best = k;
      bestFreq = f;
    }
  }
  return best;
}

/** 标记温度/降雨趋势拐点 */
function _markTurningPoints(hourly: HourlyForecast[]): HourlyForecast[] {
  if (hourly.length < 3) return hourly;
  for (let i = 1; i < hourly.length - 1; i++) {
    const prevTrend = hourly[i].temp - hourly[i - 1].temp;
    const nextTrend = hourly[i + 1].temp - hourly[i].temp;
    // 趋势方向变化
    if (prevTrend * nextTrend < 0) hourly[i].isTurning = true;
    // 降雨突变
    if (Math.abs(hourly[i].rainAmount - hourly[i - 1].rainAmount) > 5) hourly[i].isTurning = true;
  }
  return hourly;
}

/** 计算多源对融合结果的置信度 */
export function computeConfidence(results: SourceFetchResult[]): { consensus: "high" | "medium" | "low"; message: string } {
  const alive = results.filter((r) => r.ok && r.now);
  if (alive.length <= 1) return { consensus: "low", message: "仅一个数据源可用" };

  const temps = alive.map((r) => r.now!.temp);
  const range = Math.max(...temps) - Math.min(...temps);
  const conditions = new Set(alive.map((r) => r.now!.condition));

  if (range <= 2 && conditions.size === 1) return { consensus: "high", message: "多源一致" };
  if (range <= 5) return { consensus: "medium", message: "各源略有分歧" };
  return { consensus: "low", message: `温差${Math.round(range)}°C，多源分歧大` };
}
