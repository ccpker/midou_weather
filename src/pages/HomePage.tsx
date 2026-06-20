import { MapPin, RefreshCw, Check, X, CloudRain, Droplets, Wind as WindIcon } from "lucide-react";
import { useWeatherStore } from "@/lib/store";
import { useWeather } from "@/lib/useWeather";
import { WeatherIcon } from "@/components/WeatherIcon";
import { classifyCondition, weatherClassLabel } from "@/lib/icons";
import { useMemo, useState } from "react";
import type { SourceId } from "@/types/weather";

const ALL_SOURCE_IDS: SourceId[] = ["qweather", "seniverse", "amap", "caiyun", "cma", "api_box"];
const RAIN_POP_THRESHOLD = 40;

export default function HomePage() {
  const location = useWeatherStore((s) => s.location);
  const current = useWeatherStore((s) => s.current);
  const hourly = useWeatherStore((s) => s.hourly);
  const daily = useWeatherStore((s) => s.daily);
  const { loading, error, refresh } = useWeather();

  const weatherClass = useMemo(
    () => (current?.condition ? classifyCondition(current.condition) : null),
    [current?.condition],
  );

  return (
    <div className="px-5 pt-2 pb-6 space-y-5">
      {/* 定位栏 — iOS 风格 */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[var(--color-accent)]" />
          <span className="text-sm text-white/80 font-medium truncate max-w-[200px]">
            {location?.address ?? "定位中..."}
          </span>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="p-2 rounded-full glass active:scale-90 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 text-white/70 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 状态驱动 */}
      {loading && <LoadingState />}
      {error && !loading && <ErrorState message={error} onRetry={() => refresh()} />}
      {!loading && !error && !current && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in-up delay-100">
          <div className="w-20 h-20 rounded-full glass flex items-center justify-center">
            <CloudRain className="w-10 h-10 text-[var(--color-accent)] opacity-60" />
          </div>
          <p className="text-sm text-white/50">暂无天气数据</p>
          <button
            onClick={() => refresh()}
            className="px-5 py-2 glass rounded-full text-sm text-[var(--color-accent)] active:scale-95 transition-transform"
          >
            点此获取天气
          </button>
        </div>
      )}

      {current && (
        <>
          {/* 当前温度卡片 */}
          <NowCardHero current={current} weatherClass={weatherClass} />

          {/* 小时预报 — 横向滚动条 */}
          {hourly.length > 0 && <HourlyStrip hourly={hourly} />}

          {/* 雨量校准反馈 */}
          {hourly.length > 0 && <FeedbackSection hourly={hourly} />}

          {/* 每日预报 */}
          {daily.length > 0 && <DailyCards daily={daily} />}
        </>
      )}
    </div>
  );
}

// ═══ 当前温度 Hero 卡片 ═══

function NowCardHero({
  current,
  weatherClass,
}: {
  current: NonNullable<ReturnType<typeof useWeatherStore.getState>["current"]>;
  weatherClass: ReturnType<typeof classifyCondition> | null;
}) {
  const { temp, feelsLike, condition, humidity, windDir, windSpeed, aqi } = current;
  const label = weatherClass ? weatherClassLabel(weatherClass) : condition;

  return (
    <div className="animate-fade-in-up delay-100 flex flex-col items-center py-3">
      {/* 大温度 */}
      <p className="text-[5rem] leading-none font-thin temp-display text-white tracking-tighter">
        {Math.round(temp)}<span className="text-4xl">°</span>
      </p>

      {/* 天气状态 */}
      <div className="flex items-center gap-2 mt-2">
        <WeatherIcon condition={condition} size={28} />
        <span className="text-xl font-medium text-white/90">{label}</span>
      </div>

      {/* 体感 */}
      <p className="text-sm text-white/50 mt-1">体感 {Math.round(feelsLike)}°</p>

      {/* 指标行 */}
      <div className="flex items-center gap-5 mt-4">
        <div className="flex items-center gap-1 text-xs text-white/50">
          <Droplets className="w-3.5 h-3.5 text-[var(--color-rain)]" />
          <span>{humidity}%</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/50">
          <WindIcon className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>{windDir} {windSpeed}m/s</span>
        </div>
        {aqi !== null && (
          <div className="flex items-center gap-1 text-xs">
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
              aqi <= 50 ? "bg-green-500/20 text-green-400" :
              aqi <= 100 ? "bg-yellow-500/20 text-yellow-400" :
              aqi <= 150 ? "bg-orange-500/20 text-orange-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              AQI {aqi}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ 小时预报条 — 模仿 iOS Weather 横向滚动 ═══

function HourlyStrip({ hourly }: { hourly: ReturnType<typeof useWeatherStore.getState>["hourly"] }) {
  // 取前 24 小时，拐点+每3小时
  const display = hourly.slice(0, 24).filter((h, i) => h.isTurning || i % 3 === 0 || i === 0);

  // 温度范围用于柱状图
  const temps = display.map((h) => h.temp);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = Math.max(maxT - minT, 1);

  return (
    <div className="animate-fade-in-up delay-200">
      <div className="glass rounded-2xl px-4 py-4">
        <p className="text-xs font-medium text-white/40 mb-3">未来24小时</p>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {display.map((h, i) => {
            const hour = new Date(h.time).getHours();
            const label = i === 0 ? "现在" : `${hour}时`;
            const barH = 12 + ((h.temp - minT) / range) * 28;

            return (
              <div key={i} className="flex flex-col items-center min-w-[52px] gap-1.5 shrink-0">
                <span className="text-[11px] text-white/50">{label}</span>
                <div
                  className="w-1 rounded-full bg-gradient-to-t from-[var(--color-accent)]/40 to-[var(--color-accent)]/80 rain-bar"
                  style={{ height: `${barH}px` }}
                />
                <span className="text-xs font-medium text-white/80">{Math.round(h.temp)}°</span>
                {h.pop > 0 && (
                  <span className="text-[10px] text-[var(--color-rain)]">
                    {h.pop}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ 每日预报 — 毛玻璃列表 ═══

function DailyCards({ daily }: { daily: ReturnType<typeof useWeatherStore.getState>["daily"] }) {
  const temps = daily.flatMap((d) => [d.tempLow, d.tempHigh]);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = Math.max(maxT - minT, 1);

  return (
    <div className="animate-fade-in-up delay-300">
      <div className="glass rounded-2xl px-4 py-4">
        <p className="text-xs font-medium text-white/40 mb-3">未来7天</p>
        <div className="space-y-0">
          {daily.slice(0, 7).map((d, i) => {
            const leftPct = ((d.tempLow - minT) / range) * 100;
            const widthPct = Math.max(((d.tempHigh - d.tempLow) / range) * 100, 8);

            return (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                {/* 星期 */}
                <span className={`w-10 text-sm shrink-0 ${
                  i === 0 ? "text-white font-medium" : "text-white/50"
                }`}>
                  {i === 0 ? "今天" : new Date(d.date).toLocaleDateString("zh", { weekday: "short" })}
                </span>

                {/* 天气图标 */}
                <WeatherIcon condition={d.condition} size={18} />

                {/* 温度条 */}
                <div className="flex-1 flex items-center gap-2 h-4">
                  <span className="text-xs text-white/30 w-8 text-right tabular-nums">{d.tempLow}°</span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full relative overflow-hidden">
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-blue-400/70 to-orange-400/70"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/80 w-8 tabular-nums">{d.tempHigh}°</span>
                </div>

                {/* 降水概率 */}
                {d.pop > 0 && (
                  <span className="text-[11px] text-[var(--color-rain)] w-8 text-right shrink-0">
                    {d.pop}%
                  </span>
                )}
                {d.pop === 0 && <span className="w-8 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ 反馈区 — 雨量校准 ═══

function FeedbackSection({ hourly }: { hourly: ReturnType<typeof useWeatherStore.getState>["hourly"] }) {
  const applyFeedback = useWeatherStore((s) => s.applyFeedback);
  const addFeedback = useWeatherStore((s) => s.addFeedback);
  const feedbacks = useWeatherStore((s) => s.feedbacks);
  const sources = useWeatherStore((s) => s.sources);
  const [expanded, setExpanded] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  const feedbackSlots = useMemo(() => {
    const now = Date.now();
    return hourly
      .filter((h) => {
        const t = new Date(h.time).getTime();
        return t <= now + 3600_000 && t >= now - 6 * 3600_000;
      })
      .slice(0, 4);
  }, [hourly]);

  const fedBackTimes = useMemo(() => new Set(feedbacks.map((f) => f.forecastTime)), [feedbacks]);

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
    setSubmitted((prev) => new Set(prev).add(forecastTime));
  };

  if (feedbackSlots.length === 0) return null;

  return (
    <div className="animate-fade-in-up delay-400">
      <div className="glass rounded-2xl px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-white/60 w-full"
        >
          <CloudRain className="w-4 h-4 text-[var(--color-rain)]" />
          雨量校准
          <span className="ml-auto text-xs text-white/30">{expanded ? "收起 ▲" : "展开 ▼"}</span>
        </button>

        {expanded && (
          <div className="space-y-1.5 pt-3">
            <p className="text-[10px] text-white/30 mb-2">点 ✅ 表示实际下了雨，点 ❌ 表示没下雨 — 帮助训练水位系统</p>
            {feedbackSlots.map((h) => {
              const predicted = h.pop >= RAIN_POP_THRESHOLD;
              const alreadyFed = fedBackTimes.has(h.time) || submitted.has(h.time);
              const existing = feedbacks.find((f) => f.forecastTime === h.time);

              return (
                <div
                  key={h.time}
                  className={`flex items-center justify-between py-2 px-3 rounded-xl text-sm ${
                    alreadyFed ? "bg-white/3 opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-12">
                      {new Date(h.time).toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-sm text-white/80">{Math.round(h.temp)}°</span>
                    <span className={`text-xs ${predicted ? "text-[var(--color-rain)] font-medium" : "text-white/40"}`}>
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
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleFeedback(h.time, predicted, true)}
                        className="px-2.5 py-1 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] text-xs font-medium active:scale-90 transition-transform"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-0.5" />下了
                      </button>
                      <button
                        onClick={() => handleFeedback(h.time, predicted, false)}
                        className="px-2.5 py-1 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] text-xs font-medium active:scale-90 transition-transform"
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
    </div>
  );
}

// ═══ 状态组件 ═══

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="w-20 h-20 rounded-full glass animate-pulse-glow flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
      </div>
      <p className="text-sm text-white/40 animate-pulse">获取天气中...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
        <X className="w-8 h-8 text-red-400" />
      </div>
      <p className="text-sm text-red-400 max-w-[240px] text-center">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 glass rounded-full text-sm text-[var(--color-accent)] active:scale-95 transition-transform"
      >
        重试
      </button>
    </div>
  );
}
