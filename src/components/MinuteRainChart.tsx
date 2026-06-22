import { useMemo } from "react";
import type { RainDetail } from "@/types/weather";

const BUCKET_MINUTES = 5;
const MAX_BARS = 24; // 2 hours = 24 × 5min

function bucketRain(rain: RainDetail[]): { time: string; maxIntensity: number; avgIntensity: number }[] {
  if (!rain.length) return [];
  const buckets: { time: string; sum: number; max: number; count: number }[] = [];
  const base = new Date(rain[0].time).getTime();
  for (const r of rain) {
    const idx = Math.floor((new Date(r.time).getTime() - base) / (BUCKET_MINUTES * 60000));
    if (idx < 0 || idx >= MAX_BARS) continue;
    while (buckets.length <= idx) buckets.push({ time: "", sum: 0, max: 0, count: 0 });
    buckets[idx].sum += r.intensity;
    buckets[idx].max = Math.max(buckets[idx].max, r.intensity);
    buckets[idx].count++;
    if (!buckets[idx].time) buckets[idx].time = r.time;
  }
  return buckets.map((b) => ({
    time: b.time,
    maxIntensity: b.max,
    avgIntensity: b.count > 0 ? b.sum / b.count : 0,
  }));
}

function intensityColor(v: number): string {
  if (v <= 0.05) return "#d1d5db"; // gray-300 — no rain
  if (v <= 0.4) return "#22d3ee";   // cyan
  if (v <= 1.0) return "#3B82F6";   // blue
  if (v <= 2.5) return "#8B5CF6";   // violet
  if (v <= 5.0) return "#F59E0B";   // amber
  if (v <= 10.0) return "#EF4444";  // red
  return "#991B1B";                  // dark red
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function hasRain(buckets: ReturnType<typeof bucketRain>): boolean {
  return buckets.some((b) => b.maxIntensity > 0.05);
}

export default function MinuteRainChart({ data }: { data: RainDetail[] }) {
  const buckets = useMemo(() => bucketRain(data), [data]);
  const anyRain = useMemo(() => hasRain(buckets), [buckets]);

  if (!data.length) return null;

  // find max intensity for scale
  const maxVal = Math.max(0.1, ...buckets.map((b) => b.maxIntensity));
  const BAR_W = 10;
  const GAP = 3;
  const H_MAX = 72;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
      {/* header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">
          {anyRain ? "未来2小时降水预报" : "未来2小时无降水"}
        </span>
        {anyRain && (
          <span className="text-[10px] text-gray-400">雨强 mm/h</span>
        )}
      </div>

      {/* chart area */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-end gap-[3px]" style={{ minWidth: buckets.length * (BAR_W + GAP) }}>
          {buckets.map((b, i) => {
            const h = Math.max(2, Math.round((b.maxIntensity / maxVal) * H_MAX));
            const color = intensityColor(b.maxIntensity);
            // show time label every 4 bars (20 min)
            const showLabel = i % 4 === 0;
            return (
              <div key={i} className="flex flex-col items-center shrink-0" style={{ width: BAR_W }}>
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{ height: h, backgroundColor: color, borderRadius: "3px 3px 0 0" }}
                  title={`${formatTimeLabel(b.time)} — ${b.maxIntensity.toFixed(1)} mm/h`}
                />
                {showLabel && (
                  <span className="text-[9px] text-gray-400 mt-1 leading-none">
                    {formatTimeLabel(b.time)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* legend — only when rain */}
      {anyRain && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#22d3ee" }} />
            <span className="text-[9px] text-gray-400">蒙蒙雨</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#3B82F6" }} />
            <span className="text-[9px] text-gray-400">小雨</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#8B5CF6" }} />
            <span className="text-[9px] text-gray-400">中雨</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />
            <span className="text-[9px] text-gray-400">大雨</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#EF4444" }} />
            <span className="text-[9px] text-gray-400">暴雨</span>
          </div>
        </div>
      )}
    </div>
  );
}
