import { create } from "zustand";
import type {
  AppState, PageId, CurrentWeather, HourlyForecast, DailyForecast,
  RainDetail, RainFeedback, GeoLocation, CityInfo,
  RemoteConfig, SourceState, SourceId, SourceSnapshot, SourceStats,
} from "@/types/weather";
import {
  mockCurrent, mockHourly, mockDaily, mockSources, mockSnapshots, mockSourceStats,
} from "@/lib/mock-data";

interface Actions {
  setPage: (page: PageId) => void;
  setLocation: (loc: GeoLocation) => void;
  setCities: (cities: CityInfo[]) => void;
  setCurrent: (w: CurrentWeather) => void;
  setHourly: (h: HourlyForecast[]) => void;
  setDaily: (d: DailyForecast[]) => void;
  setRainDetail: (r: RainDetail[]) => void;
  setSources: (s: Record<SourceId, SourceState>) => void;
  updateSourceWaterline: (id: SourceId, delta: number) => void;
  setConfig: (c: RemoteConfig) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;

  /** 添加雨水位反馈 */
  addFeedback: (f: RainFeedback) => void;

  /** 追加一条数据源快照 (保留最近20条) */
  pushSnapshot: (id: SourceId, snap: SourceSnapshot) => void;

  /** 根据反馈更新对应源的水位并重算统计 */
  applyFeedback: (f: RainFeedback, sourceIds: SourceId[]) => void;

  /** 重算所有源的统计 */
  recomputeStats: () => void;

  /** 切换源启用状态 */
  toggleSource: (id: SourceId) => void;

  /** 调节源权重 */
  setSourceWeight: (id: SourceId, weight: number) => void;

  /** 加载 mock 数据用于视觉预览 */
  loadMock: () => void;
}

function emptyStats(): SourceStats {
  return { totalFetches: 0, errors: 0, avgResponseMs: 0, totalFeedbacks: 0, hits: 0, falseAlarms: 0, misses: 0, correctNeg: 0, accuracy: 0 };
}

function computeStats(snaps: SourceSnapshot[], feedbacks: RainFeedback[], sourceId: SourceId): SourceStats {
  const s = emptyStats();
  s.totalFetches = snaps.length;
  s.errors = snaps.filter((x) => x.error !== null).length;
  const responseTimes = snaps.filter((x) => x.responseMs > 0).map((x) => x.responseMs);
  s.avgResponseMs = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

  // 从反馈关联的源列表统计
  for (const f of feedbacks) {
    // 简化: 用 sourceId 参与的所有反馈来统计(实际应精确匹配各源预报)
    // 这里以 feedback 中 sourceIds 是否包含此源为准
    // TODO: 精确到各源逐条预报的命中/误报
    s.totalFeedbacks++;
    if (f.predicted && f.actual) s.hits++;
    else if (f.predicted && !f.actual) s.falseAlarms++;
    else if (!f.predicted && f.actual) s.misses++;
    else s.correctNeg++;
  }

  const total = s.hits + s.falseAlarms + s.misses + s.correctNeg;
  s.accuracy = total > 0 ? Math.round((s.hits + s.correctNeg) / total * 100) : 0;
  return s;
}

export const useWeatherStore = create<AppState & Actions>((set, get) => ({
  // ─── 初始状态 ───
  page: "home",
  location: null,
  cities: [],
  current: null,
  hourly: [],
  daily: [],
  rainDetail: [],
  sources: {} as Record<SourceId, SourceState>,
  snapshots: {} as Record<SourceId, SourceSnapshot[]>,
  sourceStats: {} as Record<SourceId, SourceStats>,
  feedbacks: [],
  config: null,
  loading: true,
  error: null,

  setPage: (page) => set({ page }),
  setLocation: (loc) => set({ location: loc }),
  setCities: (cities) => set({ cities }),
  setCurrent: (w) => set({ current: w }),
  setHourly: (h) => set({ hourly: h }),
  setDaily: (d) => set({ daily: d }),
  setRainDetail: (r) => set({ rainDetail: r }),
  setSources: (sources) => set({ sources }),
  updateSourceWaterline: (id, delta) =>
    set((s) => ({
      sources: {
        ...s.sources,
        [id]: { ...s.sources[id], waterline: s.sources[id].waterline + delta },
      },
    })),
  setConfig: (config) => set({ config }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  pushSnapshot: (id, snap) =>
    set((s) => {
      const prev = s.snapshots[id] ?? [];
      // 保留最近20条
      const next = [...prev, snap].slice(-20);
      return { snapshots: { ...s.snapshots, [id]: next } };
    }),

  addFeedback: (f) =>
    set((s) => ({ feedbacks: [...s.feedbacks, f] })),

  applyFeedback: (f, sourceIds) =>
    set((s) => {
      const nextSources = { ...s.sources };
      for (const id of sourceIds) {
        const src = nextSources[id];
        if (!src) continue;
        let delta = 0;
        if (f.predicted && f.actual) delta = 1;
        else if (f.predicted && !f.actual) delta = -2;
        else if (!f.predicted && f.actual) delta = -3;
        nextSources[id] = { ...src, waterline: src.waterline + delta };
      }
      // 重算统计
      const nextFeedbacks = [...s.feedbacks, f];
      const nextStats: Record<string, SourceStats> = {};
      for (const sid of (Object.keys(nextSources) as SourceId[])) {
        nextStats[sid] = computeStats(s.snapshots[sid] ?? [], nextFeedbacks, sid);
      }
      return { sources: nextSources, feedbacks: nextFeedbacks, sourceStats: nextStats as Record<SourceId, SourceStats> };
    }),

  recomputeStats: () => {
    const { snapshots, feedbacks, sources } = get();
    const nextStats: Record<string, SourceStats> = {};
    for (const sid of (Object.keys(sources) as SourceId[])) {
      nextStats[sid] = computeStats(snapshots[sid] ?? [], feedbacks, sid);
    }
    set({ sourceStats: nextStats as Record<SourceId, SourceStats> });
  },

  toggleSource: (id) =>
    set((s) => ({
      sources: {
        ...s.sources,
        [id]: { ...s.sources[id], enabled: !s.sources[id].enabled },
      },
    })),

  setSourceWeight: (id, weight) =>
    set((s) => ({
      sources: {
        ...s.sources,
        [id]: { ...s.sources[id], weight: Math.max(0, Math.min(10, weight)) },
      },
    })),

  loadMock: () =>
    set({
      location: { lat: 43.82, lng: 126.55, address: "昌邑区 · 延安路附近", district: "昌邑区", province: "吉林省", city: "吉林", updatedAt: new Date().toISOString(), precision: "ip", accuracyMeters: 5000 },
      current: mockCurrent,
      hourly: mockHourly,
      daily: mockDaily,
      sources: mockSources as Record<SourceId, SourceState>,
      snapshots: mockSnapshots as Record<SourceId, SourceSnapshot[]>,
      sourceStats: mockSourceStats as Record<SourceId, SourceStats>,
      loading: false,
      error: null,
    }),
}));
