import { useEffect, useCallback } from "react";
import { useWeatherStore } from "@/lib/store";
import { weatherService } from "@/lib/weather-service";
import { locateUser } from "@/lib/location";

/** React Hook: 定位 + 单源天气加载 */
export function useWeather() {
  const location = useWeatherStore((s) => s.location);
  const activeTab = useWeatherStore((s) => s.activeTab);
  const sourceData = useWeatherStore((s) => s[activeTab]);

  const refresh = useCallback(async () => {
    const loc = location ?? { lat: 43.8377, lng: 126.5494 };
    const tab = useWeatherStore.getState().activeTab;
    await weatherService.refreshForSource(tab, loc.lat, loc.lng);
  }, [location]);

  // 切换 tab 时自动拉数据
  const switchTab = useCallback(async (tab: "caiyun" | "qweather") => {
    useWeatherStore.getState().setActiveTab(tab);
    const loc = useWeatherStore.getState().location ?? { lat: 43.8377, lng: 126.5494 };
    await weatherService.refreshForSource(tab, loc.lat, loc.lng);
  }, []);

  // 首次加载: 定位 → 刷新两个主源
  useEffect(() => {
    const init = async () => {
      if (!location) {
        await locateUser();
      }
      const loc = useWeatherStore.getState().location ?? { lat: 43.8377, lng: 126.5494 };
      const tab = useWeatherStore.getState().activeTab;
      await weatherService.refreshForSource(tab, loc.lat, loc.lng);
    };
    init();
  }, []);

  return {
    loading: sourceData.loading,
    error: sourceData.error,
    refresh,
    switchTab,
  };
}
