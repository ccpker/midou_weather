import { MapPin, RefreshCw, CloudRain, Droplets, Wind as WindIcon, Eye, Target, Navigation } from "lucide-react";
import { useWeatherStore } from "@/lib/store";
import { useWeather } from "@/lib/useWeather";
import { WeatherIcon } from "@/components/WeatherIcon";
import { classifyCondition, weatherClassLabel, type WeatherClass } from "@/lib/icons";
import { useMemo, type ReactNode } from "react";
import WeatherAttackTimeline from "@/components/WeatherAttackTimeline";
import WeatherRhythmBar from "@/components/WeatherRhythmBar";
import MinuteRainChart from "@/components/MinuteRainChart";
import type { SourceState, SpatialPrecision, PrimarySourceId, HourlyForecast } from "@/types/weather";

const TAB_LABELS: Record<PrimarySourceId, string> = { caiyun: "彩云天气", qweather: "和风天气" };

export default function HomePage() {
  const location = useWeatherStore((s) => s.location);
  const activeTab = useWeatherStore((s) => s.activeTab);
  const caiyun = useWeatherStore((s) => s.caiyun);
  const qweather = useWeatherStore((s) => s.qweather);
  const { loading, error, refresh, switchTab } = useWeather();

  const data = activeTab === "caiyun" ? caiyun : qweather;
  const otherData = activeTab === "caiyun" ? qweather : caiyun;
  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;

  const weatherClass = useMemo(
    () => (current?.condition ? classifyCondition(current.condition) : null),
    [current?.condition],
  );

  return (
    <div className="px-5 pt-2 pb-6 space-y-3">
      <LocationBar location={location} loading={loading} onRefresh={refresh} />

      {/* 双页 Tab */}
      <SourceTabs active={activeTab} onChange={switchTab} />

      {loading && <LoadingState />}
      {error && !loading && <ErrorState message={error} onRetry={() => refresh()} />}
      {!loading && !error && !current && <EmptyState />}

      {current && (
        <>
          <SourcePrecisionCards />
          <HeroSection current={current} weatherClass={weatherClass} location={location} />
          {data.rainDetail.length > 0 && <MinuteRainChart data={data.rainDetail} />}
          {hourly.length > 0 && (
            <WeatherAttackTimeline
              hourly={hourly}
              rainDetail={data.rainDetail}
              otherHourly={otherData.hourly}
            />
          )}
          {hourly.length > 0 && <WeatherRhythmBar hourly={hourly} />}
          {daily.length > 0 && <DailyCards daily={daily} weatherClass={weatherClass} />}
        </>
      )}
    </div>
  );
}

// ═══ 双页 Tab ═══

function SourceTabs({
  active,
  onChange,
}: {
  active: PrimarySourceId;
  onChange: (id: PrimarySourceId) => void;
}) {
  const sources = useWeatherStore((s) => s.sources);
  const tabs: { id: PrimarySourceId; label: string; alive: boolean }[] = [
    { id: "caiyun", label: "彩云天气", alive: sources.caiyun?.lastError === null },
    { id: "qweather", label: "和风天气", alive: sources.qweather?.lastError === null },
  ];

  return (
    <div className="animate-fade-in-up delay-100">
      <div className="glass-day rounded-xl px-1.5 py-1.5 flex gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
              active === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {t.label}
              <span className={`w-1.5 h-1.5 rounded-full ${
                t.alive ? "bg-emerald-400" : "bg-red-400"
              }`} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══ 定位栏 ═══

function LocationBar({
  location, loading, onRefresh,
}: {
  location: ReturnType<typeof useWeatherStore.getState>["location"];
  loading: boolean;
  onRefresh: () => void;
}) {
  const label = location?.district
    ? location.district + (location.address ? " · " + location.address.replace(location.district, "").replace(/^[\s·]+/, "") : "")
    : location?.address ?? "定位中...";

  const precisionBadge = location ? (() => {
    switch (location.precision) {
      case "gps": return { text: "GPS", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "ip": return { text: "IP定位", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "manual": return { text: "手动", color: "bg-sky-50 text-sky-700 border-sky-200" };
      case "fallback": return { text: "默认位置", color: "bg-red-50 text-red-600 border-red-200" };
      default: return null;
    }
  })() : null;

  const accuracyLabel = location?.accuracyMeters
    ? location.accuracyMeters >= 1000
      ? `±${Math.round(location.accuracyMeters / 1000)}km`
      : `±${location.accuracyMeters}m`
    : null;

  return (
    <div className="flex items-center justify-between animate-fade-in-up">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
        <span className="text-sm text-gray-800 font-medium truncate">{label}</span>
        {precisionBadge && (
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] leading-none border ${precisionBadge.color}`}>
            {precisionBadge.text}
          </span>
        )}
        {accuracyLabel && (
          <span className="text-[10px] text-gray-400 shrink-0">{accuracyLabel}</span>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-2 rounded-full bg-gray-100 active:bg-gray-200 active:scale-90 transition-transform shrink-0 ml-2"
      >
        <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

// ═══ 空状态 ═══

function EmptyState() {
  const sources = useWeatherStore((s) => s.sources);
  const sourceList = Object.values(sources).filter(s => s.enabled);
  const aliveCount = sourceList.filter(s => s.lastError === null && s.lastUpdated !== null).length;

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-in-up delay-100">
      <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
        <CloudRain className="w-10 h-10 text-gray-400 animate-pulse-glow" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-base font-semibold text-gray-700">等待数据源响应...</p>
        <p className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
          正在从 {sourceList.length} 个气象源获取数据
        </p>
      </div>
      {sourceList.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 w-full max-w-[260px]">
          {sourceList.map((s) => {
            const hasData = s.lastUpdated !== null && s.lastError === null;
            const hasError = s.lastError !== null;
            return (
              <div key={s.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] ${
                hasData ? 'bg-emerald-50 text-emerald-700' :
                hasError ? 'bg-red-50 text-red-500' :
                'bg-gray-100 text-gray-400 animate-pulse'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  hasData ? 'bg-emerald-500' : hasError ? 'bg-red-400' : 'bg-gray-300'
                }`} />
                {s.name}
              </div>
            );
          })}
        </div>
      )}
      <button
        onClick={() => useWeatherStore.getState().loadMock()}
        className="px-5 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-200 bg-gray-100 border border-gray-200"
      >
        <span className="flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          预览 Mock 数据
        </span>
      </button>
    </div>
  );
}

// ═══ Hero — 温度左置 + 指标右列 ═══

function HeroSection({
  current,
  weatherClass,
  location,
}: {
  current: NonNullable<ReturnType<typeof useWeatherStore.getState>["caiyun"]["current"]>;
  weatherClass: ReturnType<typeof classifyCondition> | null;
  location: ReturnType<typeof useWeatherStore.getState>["location"];
}) {
  const { temp, feelsLike, humidity, windDir, windSpeed, aqi } = current;
  const locationLabel = location?.district ?? location?.address ?? "";

  return (
    <div className="animate-fade-in-up delay-100">
      <div className="glass-day-strong rounded-2xl px-5 py-4 flex items-start gap-4">
        <div className="shrink-0">
          <p className="text-[6rem] leading-none font-thin temp-display text-gray-900 tracking-[-0.04em]">
            {Math.round(temp)}<span className="text-3xl align-top ml-0.5">°</span>
          </p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            {weatherClass && (
              <>
                <WeatherIcon condition={current.condition} size={14} />
                <span className="text-gray-500">{weatherClassLabel(weatherClass)}</span>
              </>
            )}
            <span>{locationLabel}</span>
          </p>
        </div>

        <div className="flex-1 pt-2 space-y-2.5">
          <StatLine icon="🌡️" label="体感" value={`${Math.round(feelsLike)}°`} />
          <StatLine icon={<Droplets className="w-3.5 h-3.5 text-blue-500" />} label="湿度" value={`${humidity}%`} />
          <StatLine icon={<WindIcon className="w-3.5 h-3.5 text-teal-500" />} label="风力" value={`${windDir} ${windSpeed}级`} />
          {aqi !== null ? (
            <StatLine
              icon={
                <span className={`w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center shrink-0 ${
                  aqi <= 50 ? "bg-green-100 text-green-700" :
                  aqi <= 100 ? "bg-yellow-100 text-yellow-700" :
                  aqi <= 150 ? "bg-orange-100 text-orange-700" :
                  "bg-red-100 text-red-700"
                }`}>AQ</span>
              }
              label="空气"
              value={aqi <= 50 ? "优" : aqi <= 100 ? "良" : aqi <= 150 ? "轻度" : "差"}
            />
          ) : (
            <StatLine icon={<Eye className="w-3.5 h-3.5 text-gray-300" />} label="能见" value="--" />
          )}
        </div>
      </div>
    </div>
  );
}

function StatLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 flex items-center justify-center w-4">{icon}</span>
      <span className="text-xs text-gray-400 w-8 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

// ═══ 每日预报 ═══

function DailyCards({
  daily,
  weatherClass,
}: {
  daily: ReturnType<typeof useWeatherStore.getState>["caiyun"]["daily"];
  weatherClass: ReturnType<typeof classifyCondition> | null;
}) {
  const temps = daily.flatMap((d) => [d.tempLow, d.tempHigh]);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = Math.max(maxT - minT, 1);

  return (
    <div className="animate-fade-in-up delay-400">
      <div className="glass-day rounded-2xl px-4 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">未来7天</p>
        <div className="space-y-0">
          {daily.slice(0, 7).map((d, i) => {
            const leftPct = ((d.tempLow - minT) / range) * 100;
            const widthPct = Math.max(((d.tempHigh - d.tempLow) / range) * 100, 10);

            return (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                <span className={`w-11 text-sm shrink-0 ${
                  i === 0 ? "text-gray-900 font-semibold" : "text-gray-500"
                }`}>
                  {i === 0 ? "今天" : new Date(d.date).toLocaleDateString("zh", { weekday: "short" })}
                </span>
                <div className="flex items-center gap-1.5 w-18 shrink-0">
                  <WeatherIcon condition={d.condition} size={16} />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-8 text-right tabular-nums font-medium">{d.tempLow}°</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full relative overflow-hidden">
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-400"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-800 w-8 tabular-nums font-semibold">{d.tempHigh}°</span>
                </div>
                {d.pop > 20 ? (
                  <span className="text-[11px] font-medium text-blue-500 w-8 text-right shrink-0">{d.pop}%</span>
                ) : d.pop > 0 ? (
                  <span className="text-[11px] text-gray-400 w-8 text-right shrink-0">{d.pop}%</span>
                ) : (
                  <span className="w-8 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ 数据源精度 + 位置卡片 ═══

function sourceAreaLabel(s: SourceState, addr: string, district: string, city: string): string {
  const precisionMap: Record<SpatialPrecision, (() => string)> = {
    point: () => {
      if (s.spatialPrecisionLabel.includes("11km")) return district || city || "未知";
      const street = addr.replace(district, "").replace(/^[\s·]+/, "").slice(0, 8).trim();
      return street || district || city || "未知";
    },
    district: () => district || "未知",
    city: () => city || "未知",
  };
  return precisionMap[s.spatialPrecision]?.() ?? "未知";
}

function SourcePrecisionCards() {
  const sources = useWeatherStore((s) => s.sources);
  const location = useWeatherStore((s) => s.location);
  const sourceBreakdown = useWeatherStore((s) => s.caiyun.current?.sourceBreakdown ?? s.qweather.current?.sourceBreakdown);
  const entries = Object.values(sources).filter(s => s.enabled);

  if (entries.length === 0 || !location) return null;

  const { address, district, city } = location;

  const precisionColorMap: Record<SpatialPrecision, string> = {
    point: "border-emerald-200 bg-emerald-50/60",
    district: "border-sky-200 bg-sky-50/60",
    city: "border-amber-200 bg-amber-50/60",
  };

  const precisionIcon: Record<SpatialPrecision, string> = {
    point: "🎯",
    district: "🏘️",
    city: "🏙️",
  };

  return (
    <div className="animate-fade-in-up delay-100">
      <div className="glass-day rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">数据来源</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {entries.map((s) => {
            const area = sourceAreaLabel(s, address, district, city);
            return (
              <div
                key={s.id}
                className={`rounded-xl px-2.5 py-2 border ${precisionColorMap[s.spatialPrecision] ?? "border-gray-200"}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold text-gray-800">{s.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    s.lastError ? "bg-red-400" : s.lastUpdated ? "bg-emerald-400" : "bg-gray-300"
                  }`} />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span>{precisionIcon[s.spatialPrecision] ?? "📍"}</span>
                  <span>{s.spatialPrecisionLabel}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-600 truncate flex items-center gap-0.5">
                    <Navigation className="w-2.5 h-2.5 shrink-0" />
                    {area}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  const sources = useWeatherStore((s) => s.sources);
  const sourceEntries = Object.values(sources).filter(s => s.enabled);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
      <p className="text-sm text-gray-500">正在从 {sourceEntries.length} 个气象源获取数据...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <p className="text-sm text-red-500 max-w-[240px] text-center">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm text-sky-600 active:scale-95 transition-transform shadow-sm"
      >
        重试
      </button>
    </div>
  );
}
