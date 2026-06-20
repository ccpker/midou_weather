import { useMemo } from "react";
import { useWeatherStore } from "@/lib/store";
import { classifyCondition } from "@/lib/icons";

/**
 * 动态天气背景 — 根据当前天气条件切换渐变
 * 含装饰性氛围圆，为毛玻璃卡片提供可模糊的底层
 */
export function WeatherBackground() {
  const current = useWeatherStore((s) => s.current);

  const gradientClass = useMemo(() => {
    if (!current?.condition) return "gradient-unknown";
    const cls = classifyCondition(current.condition);
    return `gradient-${cls}`;
  }, [current?.condition]);

  return (
    <div className={`fixed inset-0 ${gradientClass} transition-all duration-1000 ease-in-out`}>
      {/* 装饰性氛围圆 — 为 backdrop-filter 提供可感知的模糊层 */}
      <div className="absolute top-[-20%] left-[-30%] w-[80%] h-[50%] rounded-full bg-[var(--color-accent)]/5 blur-3xl" />
      <div className="absolute top-[10%] right-[-20%] w-[60%] h-[40%] rounded-full bg-white/3 blur-3xl" />
      <div className="absolute bottom-[15%] left-[10%] w-[50%] h-[30%] rounded-full bg-white/2 blur-2xl" />
    </div>
  );
}
