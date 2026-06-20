import { useMemo } from "react";
import { useWeatherStore } from "@/lib/store";
import { classifyCondition } from "@/lib/icons";

/**
 * 动态天气背景 — 根据当前天气条件切换渐变
 * 无数据时使用默认暗色渐变
 */
export function WeatherBackground() {
  const current = useWeatherStore((s) => s.current);

  const gradientClass = useMemo(() => {
    if (!current?.condition) return "gradient-unknown";
    const cls = classifyCondition(current.condition);
    return `gradient-${cls}`;
  }, [current?.condition]);

  return (
    <div className={`fixed inset-0 ${gradientClass} transition-all duration-1000 ease-in-out`} />
  );
}
