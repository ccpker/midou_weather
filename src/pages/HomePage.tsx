import { Navigation, MapPin, CloudRain, Thermometer } from "lucide-react";
import { useWeatherStore } from "@/lib/store";

// ─── 首页 — 三区域: 天气现状 / 降雨时间轴 / 未来预报 ───
export default function HomePage() {
  const location = useWeatherStore((s) => s.location);
  const current = useWeatherStore((s) => s.current);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);

  if (loading) {
    return <PageShell><LoadingState /></PageShell>;
  }
  if (error) {
    return <PageShell><ErrorState message={error} /></PageShell>;
  }

  return (
    <PageShell>
      {/* 定位区 */}
      <LocationBar loc={location?.address ?? "定位中..."} />

      {/* 当前天气卡片 */}
      {current && <NowCard current={current} />}
      {!current && <EmptyState onRefresh={() => {}} />}

      {/* 降雨时间轴 — TODO */}
      {/* 未来预报 — TODO */}
    </PageShell>
  );
}

// ─── 子组件 ───

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pt-6 pb-4 space-y-4">{children}</div>;
}

function LocationBar({ loc }: { loc: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
      <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
      <span className="truncate">{loc}</span>
    </div>
  );
}

function NowCard({ current }: { current: NonNullable<ReturnType<typeof useWeatherStore.getState>["current"]> }) {
  const { temp, feelsLike, condition, humidity, windDir, windSpeed, aqi } = current;

  return (
    <div className="bg-[var(--color-card)] rounded-2xl p-5 space-y-3">
      {/* 温度 + 天气 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-6xl font-light tracking-tight">{temp}°</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">体感 {feelsLike}°</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-medium">{condition}</p>
        </div>
      </div>

      {/* 详情条 */}
      <div className="flex justify-between text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
        <span>💧 {humidity}%</span>
        <span>🌬 {windDir} {windSpeed}m/s</span>
        {aqi !== null && <span>AQI {aqi}</span>}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-[var(--color-text-muted)] animate-pulse">获取天气中...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[var(--color-danger)]">{message}</p>
      <button
        className="text-xs text-[var(--color-accent)] underline"
        onClick={() => window.location.reload()}
      >
        重试
      </button>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <CloudRain className="w-12 h-12 text-[var(--color-text-muted)]" />
      <p className="text-sm text-[var(--color-text-muted)]">暂无天气数据</p>
      <button
        className="text-xs text-[var(--color-accent)] underline"
        onClick={onRefresh}
      >
        刷新
      </button>
    </div>
  );
}
