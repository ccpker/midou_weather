import { MapPin, RefreshCw, Check, X, CloudRain } from "lucide-react";
import { useWeatherStore } from "@/lib/store";
import { useWeather } from "@/lib/useWeather";
import { WeatherIcon } from "@/components/WeatherIcon";
import { useMemo, useState } from "react";
import type { SourceId } from "@/types/weather";

const ALL_SOURCE_IDS: SourceId[] = ["qweather", "seniverse", "amap", "caiyun", "cma", "api_box"];
const RAIN_POP_THRESHOLD = 40; // pop > 40% 判定为 "预报有雨"

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
          {hourly.length > 0 && <FeedbackSection hourly={hourly} />}
          {daily.length > 0 && <DailyPreview daily={daily} />}
        </>
      )}
    </div>
  );
}

// ─── NowCard ───

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

function FusionNote({ breakdown }: { breakdown: NonNullable<ReturnType<typeof useWeatherStore.getState>["current"]>["sourceBreakdown"] }) {
  const entries = Object.entries(breakdown ?? {});
  if (entries.length <= 1) return null;
  const temps = entries.map(([, v]) => v.temp);
  const range = Math.max(...temps) - Math.min(...temps);
  if (range <= 2) return <span className="text-[var(--color-success)]">✓ 多源一致</span>;
  if (range <= 5) return <span className="text-[var(--color-warn)]">⚠ 各源有差异</span>;
  return <span className="text-[var(--color-danger)]">⚠ 分歧较大</span>;
}

// ─── HourlyTimeline ───

function HourlyTimeline({ hourly }: { hourly: ReturnType<typeof useWeatherStore.getState>["hourly"] }) {
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

// ─── 反馈区 — 雨量校准 ───

function FeedbackSection({ hourly }: { hourly: ReturnType<typeof useWeatherStore.getState>["hourly"] }) {
  const applyFeedback = useWeatherStore((s) => s.applyFeedback);
  const addFeedback = useWeatherStore((s) => s.addFeedback);
  const feedbacks = useWeatherStore((s) => s.feedbacks);
  const sources = useWeatherStore((s) => s.sources);
  const [expanded, setExpanded] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  // 过去6小时 + 当前小时的预报点 (可反馈时间窗口)
  const feedbackSlots = useMemo(() => {
    const now = Date.now();
    return hourly
      .filter((h) => {
        const t = new Date(h.time).getTime();
        // 过去6小时到未来1小时
        return t <= now + 3600_000 && t >= now - 6 * 3600_000;
      })
      .slice(0, 4); // 最多4个时间点
  }, [hourly]);

  // 已反馈的时间点 (从 feedbacks 集合取)
  const fedBackTimes = useMemo(() => {
    return new Set(feedbacks.map((f) => f.forecastTime));
  }, [feedbacks]);

  // 活跃的数据源
  const activeSources = useMemo(() => {
    return (Object.entries(sources) as [SourceId, typeof sources[SourceId]][])
      .filter(([, s]) => s.enabled)
      .map(([id]) => id);
  }, [sources]);

  const handleFeedback = (forecastTime: string, predicted: boolean, actual: boolean) => {
    if (submitted.has(forecastTime)) return;
    const now = new Date().toISOString();
    addFeedback({ forecastTime, predicted, actual, reportedAt: now });
    applyFeedback({ forecastTime, predicted, actual, reportedAt: now }, activeSources);
    setSubmitted((prev) => new Set(prev).add(forecastTime)); // 本地防重复
  };

  if (feedbackSlots.length === 0) return null;

  return (
    <div className="bg-[var(--color-card)] rounded-2xl p-4 space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] w-full"
      >
        <CloudRain className="w-4 h-4 text-[var(--color-rain)]" />
        雨量校准
        <span className="ml-auto text-xs">{expanded ? "收起" : "展开"}</span>
      </button>

      {expanded && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
            点 ✅ 表示实际下了雨，点 ❌ 表示没下雨 — 帮助训练水位系统
          </p>
          {feedbackSlots.map((h) => {
            const predicted = h.pop >= RAIN_POP_THRESHOLD;
            const alreadyFed = fedBackTimes.has(h.time) || submitted.has(h.time);

            // 找到该时间点已有的反馈
            const existing = feedbacks.find((f) => f.forecastTime === h.time);

            return (
              <div
                key={h.time}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-sm
                  ${alreadyFed ? "bg-[var(--color-bg)] opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-text-muted)] w-12">
                    {new Date(h.time).toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-sm">{h.temp}°</span>
                  <span className={`text-xs ${predicted ? "text-[var(--color-rain)] font-medium" : "text-[var(--color-text-muted)]"}`}>
                    {predicted ? `有雨 ${h.pop}%` : `无雨 ${h.pop}%`}
                  </span>
                </div>

                {alreadyFed ? (
                  <span className="text-xs">
                    {existing?.actual ? (
                      <span className="text-[var(--color-success)] flex items-center gap-1">
                        <Check className="w-3 h-3" /> 下了
                      </span>
                    ) : (
                      <span className="text-[var(--color-danger)] flex items-center gap-1">
                        <X className="w-3 h-3" /> 没下
                      </span>
                    )}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleFeedback(h.time, predicted, true)}
                      className="px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-medium hover:bg-[var(--color-success)]/20 transition-colors"
                      aria-label="下雨了"
                    >
                      <Check className="w-3.5 h-3.5 inline mr-0.5" />下了
                    </button>
                    <button
                      onClick={() => handleFeedback(h.time, predicted, false)}
                      className="px-2 py-0.5 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs font-medium hover:bg-[var(--color-danger)]/20 transition-colors"
                      aria-label="没下雨"
                    >
                      <X className="w-3.5 h-3.5 inline mr-0.5" />没下
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DailyPreview ───

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
