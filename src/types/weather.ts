// ─── 数据源 ───
export type SourceId = "qweather" | "openmeteo" | "amap" | "caiyun" | "cma";

/** 空间精度级别 */
export type SpatialPrecision = "point" | "district" | "city";

/** 单维度请求状态 */
export interface DimStatus {
  ok: boolean;
  responseMs: number;
  error: string | null;
}

/** 维度记录键 */
export type DimKey = "now" | "hourly" | "daily" | "rain";

export interface SourceState {
  id: SourceId;
  name: string;
  enabled: boolean;
  weight: number;                   // 可调节权重 (>=0)
  waterline: number;                // 水位值 (-∞,+∞)，越高越可信
  lastResponseMs: number | null;
  lastError: string | null;
  lastUpdated: string | null;       // ISO时间戳
  spatialPrecision: SpatialPrecision;  // 空间精度级别
  spatialPrecisionLabel: string;       // 人类可读 "~3km网格" "区级" "市級"
  /** 分维度诊断状态 (now/hourly/daily/rain) */
  dims?: Partial<Record<DimKey, DimStatus>>;
}

/** 单次数据源读数快照 */
export interface SourceSnapshot {
  timestamp: string;
  temp: number | null;
  condition: string | null;
  responseMs: number;
  error: string | null;
}

/** 数据源统计 */
export interface SourceStats {
  totalFetches: number;
  errors: number;
  avgResponseMs: number;
  // 降水准确率 (基于反馈)
  totalFeedbacks: number;
  hits: number;       // 预报有雨 + 实际有雨
  falseAlarms: number; // 预报有雨 + 实际无雨
  misses: number;     // 预报无雨 + 实际有雨
  correctNeg: number; // 预报无雨 + 实际无雨
  /** 综合准确率 (0-100) */
  accuracy: number;
}

// ─── 天气 ───
export interface CurrentWeather {
  temp: number;                     // 当前温度 °C
  feelsLike: number;
  condition: string;                // 中文: "小雨"/"多云"/"晴"
  icon: string;                     // 天气现象图标码
  humidity: number;                 // %
  windDir: string;
  windSpeed: number;                // 蒲福风级 (0-12)
  visibility: number;               // km
  pressure: number;                 // hPa
  uv: number;
  aqi: number | null;
  /** 融合时各源预报详情，用于争议展示 */
  sourceBreakdown?: Record<SourceId, SourceForecast>;
}

export interface SourceForecast {
  temp: number;
  condition: string;
  confidence: number;               // 0-1
}

// ─── 小时预报 ───
export interface HourlyForecast {
  time: string;                     // ISO-8601
  temp: number;
  condition: string;
  icon: string;
  pop: number;                      // 降水概率 0-100
  rainAmount: number;               // 降雨量 mm
  /** 是否为变化节点 (温度或降水趋势转折) */
  isTurning: boolean;
}

// ─── 日预报 ───
export interface DailyForecast {
  date: string;                     // ISO date
  tempHigh: number;
  tempLow: number;
  condition: string;
  icon: string;
  pop: number;
  rainAmount: number;
  sunrise: string;
  sunset: string;
  windDir: string;
  windSpeed: number;
}

// ─── 降水详情 (彩云分钟级) ───
export interface RainDetail {
  time: string;
  intensity: number;                // mm/h
}

// ─── 雨水位反馈 ───
export interface RainFeedback {
  forecastTime: string;             // 预报时间点
  predicted: boolean;               // 预报说有雨？
  actual: boolean;                  // 用户反馈实际下了？
  reportedAt: string;
}

// ─── 定位 ───
export type LocationSource = "gps" | "ip" | "manual" | "fallback";

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;                  // 逆地理 "昌邑区·延安路附近"
  district: string;
  province: string;
  city: string;                     // 地级市名 (用于CMA place参数)
  updatedAt: string;
  precision: LocationSource;        // 定位溯源
  accuracyMeters: number | null;    // 估算精度 (GPS~5m, IP~5000m)
}

// ─── 城市 ───
export interface CityInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isCurrent: boolean;               // 当前定位城市
  order: number;
}

// ─── 配置中心 ───
export interface RemoteConfig {
  version: { code: number; name: string };
  sources: Record<SourceId, { enabled: boolean; weight: number; note?: string }>;
  alerts: { message: string; level: "info" | "warn" | "error" };
}

// ─── 应用状态 ───
export type PageId = "home" | "sources" | "settings";

export interface AppState {
  page: PageId;
  location: GeoLocation | null;
  cities: CityInfo[];
  current: CurrentWeather | null;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  rainDetail: RainDetail[];
  sources: Record<SourceId, SourceState>;
  /** 各源最近N条读数快照 (用于趋势/统计) */
  snapshots: Record<SourceId, SourceSnapshot[]>;
  /** 各源统计 (由快照+反馈计算) */
  sourceStats: Record<SourceId, SourceStats>;
  feedbacks: RainFeedback[];
  config: RemoteConfig | null;
  loading: boolean;
  error: string | null;
}
