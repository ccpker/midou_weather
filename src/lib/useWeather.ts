import { useEffect, useCallback } from "react";
import { useWeatherStore } from "@/lib/store";
import { weatherService } from "@/lib/weather-service";
import { locateUser } from "@/lib/location";

/** React Hook: 定位 + 天气加载 */
export function useWeather() {
  const location = useWeatherStore((s) => s.location);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);
  const refresh = useCallback(async () => {
    const loc = location ?? { lat: 43.8377, lng: 126.5494 };
    await weatherService.refresh(loc.lat, loc.lng);
  }, [location]);

  // 首次加载: 定位 → 刷新天气
  useEffect(() => {
    const init = async () => {
      if (!location) {
        await locateUser();
      }
      // 获取定位后刷新
      const loc = useWeatherStore.getState().location ?? { lat: 43.8377, lng: 126.5494 };
      await weatherService.refresh(loc.lat, loc.lng);
    };
    init();
  }, []);

  return { loading, error, refresh };
}
