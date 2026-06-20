import { useEffect, useCallback } from "react";
import { useWeatherStore } from "@/lib/store";
import { weatherService } from "@/lib/weather-service";

/** React Hook: 天气数据加载入口 */
export function useWeather() {
  const location = useWeatherStore((s) => s.location);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);

  const refresh = useCallback(async (lat?: number, lng?: number) => {
    const loc = { lat: lat ?? location?.lat ?? 43.8377, lng: lng ?? location?.lng ?? 126.5494 };
    await weatherService.refresh(loc.lat, loc.lng);
  }, [location]);

  // 首次加载
  useEffect(() => {
    refresh();
  }, []);

  return { loading, error, refresh };
}
