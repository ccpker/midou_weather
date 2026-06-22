import type {
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  SourceState,
  SourceSnapshot,
  SourceStats,
  SpatialPrecision,
} from "@/types/weather";

const now = new Date();
const pad = (n: number) => n.toString().padStart(2, "0");
const iso = (h: number) => {
  const d = new Date(now);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

// ═══ 当前天气 — 小雨转阴，20°C ═══
export const mockCurrent: CurrentWeather = {
  temp: 20,
  feelsLike: 18,
  condition: "小雨",
  icon: "305",
  humidity: 78,
  windDir: "东南风",
  windSpeed: 2,  // 蒲福3级 ≈ 3.2m/s
  visibility: 8,
  pressure: 1006,
  uv: 2,
  aqi: 42,
  sourceBreakdown: {
    qweather: { temp: 20, condition: "小雨", confidence: 0.88 },
    cma: { temp: 19, condition: "阴", confidence: 0.82 },
    amap: { temp: 21, condition: "小雨", confidence: 0.85 },
    caiyun: { temp: 20, condition: "小雨", confidence: 0.91 },
    openmeteo: { temp: 21, condition: "小雨", confidence: 0.86 },
  },
};

// ═══ 24小时预报 ═══
export const mockHourly: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => {
  const h = (now.getHours() + i) % 24;
  const temps = [19, 19, 18, 18, 18, 19, 19, 20, 21, 21, 22, 22, 23, 23, 23, 22, 22, 21, 20, 20, 19, 19, 19, 18];
  const pops = [85, 90, 75, 60, 40, 25, 15, 10, 5, 5, 10, 15, 15, 20, 25, 30, 35, 40, 45, 55, 60, 65, 55, 40];
  const conditions = i < 5 ? "小雨" : i < 8 ? "阴" : i < 17 ? "多云" : "阴";

  return {
    time: iso(h),
    temp: temps[i],
    condition: conditions,
    icon: i < 5 ? "305" : i < 8 ? "104" : "101",
    pop: pops[i],
    rainAmount: i < 5 ? [0.8, 1.2, 0.5, 0.3, 0.1][i] ?? 0 : 0,
    isTurning: i === 5 || i === 8 || i === 17,
  };
});

// ═══ 7天预报 ═══
export const mockDaily: DailyForecast[] = [
  {
    date: new Date(now.getTime() + 0 * 86400000).toISOString().slice(0, 10),
    tempHigh: 23, tempLow: 16, condition: "小雨转阴", icon: "305",
    pop: 85, rainAmount: 3.2, sunrise: "04:15", sunset: "19:21",
    windDir: "东南风", windSpeed: 3, // 蒲福
  },
  {
    date: new Date(now.getTime() + 1 * 86400000).toISOString().slice(0, 10),
    tempHigh: 27, tempLow: 17, condition: "多云转晴", icon: "101",
    pop: 20, rainAmount: 0, sunrise: "04:14", sunset: "19:22",
    windDir: "南风", windSpeed: 2, // 蒲福
  },
  {
    date: new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10),
    tempHigh: 30, tempLow: 19, condition: "晴", icon: "100",
    pop: 5, rainAmount: 0, sunrise: "04:14", sunset: "19:23",
    windDir: "西南风", windSpeed: 3, // 蒲福
  },
  {
    date: new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10),
    tempHigh: 28, tempLow: 20, condition: "多云", icon: "101",
    pop: 30, rainAmount: 0.5, sunrise: "04:13", sunset: "19:24",
    windDir: "南风", windSpeed: 2, // 蒲福
  },
  {
    date: new Date(now.getTime() + 4 * 86400000).toISOString().slice(0, 10),
    tempHigh: 25, tempLow: 18, condition: "雷阵雨", icon: "302",
    pop: 70, rainAmount: 8.5, sunrise: "04:13", sunset: "19:24",
    windDir: "东北风", windSpeed: 4, // 蒲福
  },
  {
    date: new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10),
    tempHigh: 22, tempLow: 16, condition: "小雨", icon: "305",
    pop: 65, rainAmount: 2.8, sunrise: "04:12", sunset: "19:25",
    windDir: "北风", windSpeed: 3, // 蒲福
  },
  {
    date: new Date(now.getTime() + 6 * 86400000).toISOString().slice(0, 10),
    tempHigh: 26, tempLow: 17, condition: "阴转多云", icon: "104",
    pop: 25, rainAmount: 0, sunrise: "04:12", sunset: "19:26",
    windDir: "西北风", windSpeed: 2, // 蒲福
  },
];

// ═══ 数据源 ═══
const sourceIds = ["qweather", "openmeteo", "amap", "caiyun", "cma"] as const;
const sourceNames: Record<string, string> = {
  qweather: "和风天气", openmeteo: "Open-Meteo", amap: "高德",
  caiyun: "彩云天气", cma: "中国气象局",
};
const sourcePrecisions: Record<string, { spatialPrecision: SpatialPrecision; spatialPrecisionLabel: string }> = {
  qweather: { spatialPrecision: "point", spatialPrecisionLabel: "~3km网格" },
  openmeteo: { spatialPrecision: "point", spatialPrecisionLabel: "~11km网格" },
  amap: { spatialPrecision: "district", spatialPrecisionLabel: "区级" },
  caiyun: { spatialPrecision: "point", spatialPrecisionLabel: "~5km网格" },
  cma: { spatialPrecision: "city", spatialPrecisionLabel: "地级市" },
};

export const mockSources: Record<string, SourceState> = Object.fromEntries(
  sourceIds.map((id) => [
    id,
    {
      id,
      name: sourceNames[id],
      enabled: true,
      weight: 1.0,
      waterline: id === "caiyun" ? 0.3 : 0,
      lastResponseMs: [74, 25, 105, 62, 90][sourceIds.indexOf(id)]!,
      lastError: null,
      lastUpdated: now.toISOString(),
      spatialPrecision: sourcePrecisions[id]?.spatialPrecision ?? "point",
      spatialPrecisionLabel: sourcePrecisions[id]?.spatialPrecisionLabel ?? "?",
    },
  ])
);

export const mockSnapshots: Record<string, SourceSnapshot[]> = Object.fromEntries(
  sourceIds.map((id) => [
    id,
    Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(now.getTime() - i * 600000).toISOString(),
      temp: 20 + Math.random() * 2 - 1,
      condition: "小雨",
      responseMs: 30 + Math.floor(Math.random() * 80),
      error: null,
    })),
  ])
);

export const mockSourceStats: Record<string, SourceStats> = Object.fromEntries(
  sourceIds.map((id) => [id, {
    totalFetches: 88,
    errors: 0,
    avgResponseMs: [74, 25, 105, 62, 90][sourceIds.indexOf(id)]!,
    totalFeedbacks: 12,
    hits: 8, falseAlarms: 1, misses: 1, correctNeg: 2,
    accuracy: 83,
  }])
);
