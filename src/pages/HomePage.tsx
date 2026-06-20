import { MapPin, RefreshCw } from "lucide-react";
import { useWeatherStore } from "@/lib/store";
import { useWeather } from "@/lib/useWeather";
import { WeatherIcon } from "@/components/WeatherIcon";

export default function HomePage() {
  const location = useWeatherStore((s) => s.location);
  const current = useWeatherStore((s) => s.current);
  const hourly = useWeatherStore((s) => s.hourly);
  const daily = useWeatherStore((s) => s.daily);
  const { loading, error, refresh } = useWeather();

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* 定位 + 刷新 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span className="truncate">{location?.address ?? "定位中..."}</span>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="p-1.5 rounded-lg bg-[var(--color-card)] text-[var(--color-text-muted)]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 状态驱动 */}
      {loading && <LoadingState />}
      {error && !loading && <ErrorState message={error} onRetry={() => refresh()} />}
      {!loading && !error && !current && <EmptyState onRefresh={() => refresh()} />}

      {current && (
        <>
          <NowCard current={current} />
          {hourly.length > 0 && <HourlyTimeline hourly={hourly} />}
          {daily.length > 0 && <DailyPreview daily={daily} />}
        </>
      )}
    </div>
  );
}

// ─── 子组件 ───

function NowCard({ current }: { current: NonNullable<ReturnType<typeof useWeatherStore.getState>["current"]> }) {
  const { temp, feelsLike, condition, humidity, windDir, windSpeed, aqi } = current;

  return (
    <div className="bg-[var(--color-card)] rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-6xl font-light tracking-tight">{temp}°</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">体感 {feelsLike}°</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <WeatherIcon condition={condition} size={36} />
          <p className="text-xl font-medium">{condition}</p>
        </div>
      </div>
      <div className="flex justify-between text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
        <span>💧 {humidity}%</span>
        <span>🌬 {windDir} {windSpeed}m/s</span>
        {aqi !== null && <span>AQI {aqi}</span>}
        {current.sourceBreakdown && <FusionNote breakdown={current.sourceBreakdown} />}
      </div>
    </div>
  );
}

/** 多源融合提示 */
function FusionNote({ breakdown }: { breakdown: NonNullable<ReturnType<typeof useWeatherStore.getState>["current"]>["sourceBreakdown"] }) {
  const entries = Object.entries(breakdown ?? {});
  if (entries.length <= 1) return null;

  const temps = entries.map(([, v]) => v.temp);
  const range = Math.max(...temps) - Math.min(...temps);

  if (range <= 2) return <span className="text-[var(--color-success)]">✓ 多源一致</span>;
  if (range <= 5) return <span className="text-[var(--color-warn)]">⚠ 各源有差异</span>;
  return <span className="text-[var(--color-danger)]">⚠ 分歧较大</span>;
}

/** 降雨时间轴 — 小时级 */
function HourlyTimeline({ hourly }: { hourly: ReturnType<typeof useWeatherStore.getState>["hourly"] }) {
  // 只显示变化节点 + 每 3 小时卡
  const display = hourly.filter((h, i) => h.isTurning || i % 3 === 0);

  return (
    <div className="bg-[var(--color-card)] rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-medium text-[var(--color-text-muted)]">未来24小时</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {display.map((h, i) => (
          <div key={i} className={`flex flex-col items-center min-w-[52px] gap-1 ${h.isTurning ? "text-[var(--color-accent)]" : ""}`}>
            <span className="text-xs text-[var(--color-text-muted)]">
              {new Date(h.time).toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-sm font-medium">{h.temp}°</span>
            <span className="text-xs text-[var(--color-text-muted)]">{h.condition}</span>
            {h.pop > 0 && (
              <span className="text-[10px] text-[var(--color-rain)]">{h.pop}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 7天预报 */
function DailyPreview({ daily }: { daily: ReturnType<typeof useWeatherStore.getState>["daily"] }) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl p-4 space-y-2">
      <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">未来7天</h3>
      {daily.slice(0, 7).map((d, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span className={`w-10 ${i === 0 ? "font-medium" : "text-[var(--color-text-muted)]"}`}>
            {i === 0 ? "今天" : new Date(d.date).toLocaleDateString("zh", { weekday: "short" })}
          </span>
          <span className="flex-1 ml-4">{d.condition}</span>
          {d.pop > 0 && <span className="text-xs text-[var(--color-rain)] mr-3">{d.pop}%</span>}
          <span className="tabular-nums">
            <span className="text-[var(--color-text-muted)]">{d.tempLow}°</span>
            {" ~ "}
            <span>{d.tempHigh}°</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 状态组件 ───

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <RefreshCw className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
      <p className="text-sm text-[var(--color-text-muted)] animate-pulse">获取天气中...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[var(--color-danger)]">{message}</p>
      <button className="text-xs text-[var(--color-accent)] underline" onClick={onRetry}>重试</button>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[var(--color-text-muted)]">暂无天气数据</p>
      <button className="text-xs text-[var(--color-accent)] underline" onClick={onRefresh}>刷新</button>
    </div>
  );
}
