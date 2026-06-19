import { create } from "zustand";
import type {
  AppState, PageId, CurrentWeather, HourlyForecast, DailyForecast,
  RainDetail, RainFeedback, GeoLocation, CityInfo,
  RemoteConfig, SourceState, SourceId,
} from "@/types/weather";

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

  /** 根据反馈更新对应源的水位 */
  applyFeedback: (f: RainFeedback, sourceIds: SourceId[]) => void;
}

export const useWeatherStore = create<AppState & Actions>((set) => ({
  // ─── 初始状态 ───
  page: "home",
  location: null,
  cities: [],
  current: null,
  hourly: [],
  daily: [],
  rainDetail: [],
  sources: {} as Record<SourceId, SourceState>,
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

  addFeedback: (f) =>
    set((s) => ({ feedbacks: [...s.feedbacks, f] })),

  applyFeedback: (f, sourceIds) =>
    set((s) => {
      const next = { ...s.sources };
      for (const id of sourceIds) {
        const src = next[id];
        if (!src) continue;
        let delta = 0;
        if (f.predicted && f.actual) delta = 1;       // 命中
        else if (f.predicted && !f.actual) delta = -2; // 假警
        else if (!f.predicted && f.actual) delta = -3; // 漏报
        next[id] = { ...src, waterline: src.waterline + delta };
      }
      return { sources: next, feedbacks: [...s.feedbacks, f] };
    }),
}));
