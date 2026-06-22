/**
 * 天气节奏条 — 亮色版：图形化时间段天气预览
 *
 * 设计：
 * - 每块作息一条横向色带，按小时分段
 * - 主色 = 天气类型 (绿=晴, 蓝=雨, 橙=雾霾, 紫=雷暴, 白=雪)
 * - 色深 = 强度 (雨量/概率越高颜色越深)
 * - 顶边线 = 概率指示 (红≥60% / 橙≥30%)
 * - 转折点 = 天气图标 + 温度标签
 * - 当前 = 竖线 + 光晕
 */

import { useMemo } from "react";
import { useRhythmConfig } from "@/lib/useRhythmConfig";
import { classifyCondition, weatherClassLabel, type WeatherClass } from "@/lib/icons";
import { WeatherIcon } from "@/components/WeatherIcon";
import { RefreshCw } from "lucide-react";

// ─── 白底天气颜色 (intensity 0→1 颜色加深) ───

function getWeatherBg(wc: WeatherClass, intensity: number): string {
  // intensity 分3档: ≤0.3 浅, ≤0.6 中, >0.6 深
  const tier = intensity < 0.3 ? 0 : intensity < 0.6 ? 1 : 2;
  switch (wc) {
    case "sunny": return ["bg-emerald-50", "bg-emerald-100", "bg-emerald-200"][tier];
    case "cloudy": return ["bg-sky-50", "bg-sky-100", "bg-sky-200"][tier];
    case "overcast": return ["bg-gray-100", "bg-gray-200", "bg-gray-300"][tier];
    case "rain": return ["bg-blue-50", "bg-blue-200", "bg-blue-400"][tier];
    case "heavy-rain": return ["bg-indigo-50", "bg-indigo-200", "bg-indigo-400"][tier];
    case "thunder": return ["bg-violet-50", "bg-violet-200", "bg-violet-400"][tier];
    case "fog": return ["bg-amber-50", "bg-amber-100", "bg-amber-200"][tier];
    case "haze": return ["bg-orange-50", "bg-orange-200", "bg-orange-400"][tier];
    case "sleet": return ["bg-cyan-50", "bg-cyan-100", "bg-cyan-200"][tier];
    case "snow":
    case "heavy-snow": return ["bg-sky-50", "bg-sky-100", "bg-sky-200"][tier];
    case "wind": return ["bg-teal-50", "bg-teal-100", "bg-teal-200"][tier];
    default: return ["bg-gray-50", "bg-gray-100", "bg-gray-200"][tier];
  }
}

function getWeatherBorder(wc: WeatherClass): string {
  switch (wc) {
    case "sunny": return "border-emerald-300";
    case "cloudy": return "border-sky-300";
    case "overcast": return "border-gray-300";
    case "rain": return "border-blue-400";
    case "heavy-rain": return "border-indigo-400";
    case "thunder": return "border-violet-400";
    case "fog": return "border-amber-300";
    case "haze": return "border-orange-400";
    case "sleet": return "border-cyan-300";
    case "snow":
    case "heavy-snow": return "border-sky-300";
    case "wind": return "border-teal-300";
    default: return "border-gray-300";
  }
}

// ─── 结构 ───

interface BlockBar {
  key: string;
  title: string;
  emoji: string;
  startH: number;
  endH: number;
  startLabel: string;
  endLabel: string;
  segments: Segment[];
}

interface Segment {
  weatherClass: WeatherClass;
  condition: string;
  intensity: number;      // 0-1
  pop: number;
  rainAmount: number;
  tempRange: [number, number];
  startHour: number;
  endHour: number;
  isTurning: boolean;
}

export default function WeatherRhythmBar({ hourly }: { hourly: import("@/types/weather").HourlyForecast[] }) {
  const { config, todayTemplate, dayLabel, toggleOverride, hasOverride } = useRhythmConfig();
  const template = config.templates[todayTemplate];

  const blocks: BlockBar[] = useMemo(() => {
    if (hourly.length === 0) return [];

    const maxRain = Math.max(...hourly.slice(0, 24).map((h) => h.rainAmount), 0.1);
    const maxPop = Math.max(...hourly.slice(0, 24).map((h) => h.pop), 1);

    return template.blocks.map((b) => {
      const slotHours = hourly.slice(0, 24).filter((h) => {
        const hr = new Date(h.time).getHours();
        if (b.startH <= b.endH) return hr >= b.startH && hr < b.endH;
        return hr >= b.startH || hr < b.endH;
      });

      if (slotHours.length === 0) {
        return { ...b, startLabel: fmtHour(b.startH), endLabel: fmtHour(b.endH), segments: [] };
      }

      const segs: Segment[] = [];
      let seg: Segment | null = null;

      for (const h of slotHours) {
        const hr = new Date(h.time).getHours();
        const wc = classifyCondition(h.condition);
        const intensity = h.rainAmount > 0 ? Math.min(h.rainAmount / maxRain, 1) : Math.min(h.pop / maxPop, 1);

        if (seg && seg.weatherClass === wc && !h.isTurning) {
          seg.endHour = hr + 1;
          if (h.rainAmount > 0) seg.intensity = Math.max(seg.intensity, Math.min(h.rainAmount / maxRain, 1));
          else seg.intensity = Math.max(seg.intensity, Math.min(h.pop / maxPop, 1));
          seg.pop = Math.max(seg.pop, h.pop);
          seg.rainAmount = Math.max(seg.rainAmount, h.rainAmount);
          seg.tempRange[1] = Math.max(seg.tempRange[1], h.temp);
          seg.tempRange[0] = Math.min(seg.tempRange[0], h.temp);
        } else {
          if (seg) segs.push(seg);
          seg = {
            weatherClass: wc, condition: h.condition, intensity,
            pop: h.pop, rainAmount: h.rainAmount,
            tempRange: [h.temp, h.temp],
            startHour: hr, endHour: hr + 1,
            isTurning: h.isTurning || false,
          };
        }
      }
      if (seg) segs.push(seg);

      return { ...b, startLabel: fmtHour(b.startH), endLabel: fmtHour(b.endH), segments: segs };
    });
  }, [hourly, template]);

  const now = new Date().getHours();

  return (
    <div className="animate-fade-in-up delay-300">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          今日节奏
          <span className={`ml-2 font-normal normal-case tracking-normal ${todayTemplate === "rest" ? "text-emerald-600" : "text-gray-400"}`}>
            {dayLabel.text}
          </span>
          {hasOverride && (
            <span className="ml-1 text-amber-500 text-[10px] font-normal">已手动</span>
          )}
        </p>
        <button
          onClick={toggleOverride}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] active:scale-90 transition-all ${
            hasOverride
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-gray-100 text-gray-500 hover:text-gray-700 border border-gray-200"
          }`}
        >
          <RefreshCw className="w-3 h-3" />
          <span>{hasOverride ? "自动" : todayTemplate === "work" ? "休息" : "上班"}</span>
        </button>
      </div>

      {/* 图例 (含红色概率说明) */}
      <div className="flex items-center gap-3 mb-3 text-[10px] text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-emerald-400" /> 晴</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-blue-400" /> 雨</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-orange-400" /> 雾霾</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-violet-500" /> 雷暴</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-sky-300" /> 雪</span>
        <span className="flex items-center gap-1 ml-2"><span className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[7px] border-l-transparent border-r-transparent border-b-red-500" /> 高概率</span>
        <span className="ml-2 text-gray-300">色深=强度</span>
      </div>

      {/* 节奏块 */}
      <div className="glass-day rounded-2xl divide-y divide-gray-100 p-3 space-y-2">
        {blocks.map((block) => {
          const isActive = (() => {
            if (block.startH <= block.endH) return now >= block.startH && now < block.endH;
            return now >= block.startH || now < block.endH;
          })();

          return (
            <div key={block.key} className="space-y-1.5">
              {/* 块标签 */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">{block.emoji}</span>
                <span className="text-xs font-medium text-gray-600">{block.title}</span>
                <span className="text-[10px] text-gray-400 font-mono ml-auto">
                  {block.startLabel} ~ {block.endLabel}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>

              {/* 色带 */}
              <div className={`relative h-10 rounded-lg overflow-hidden ${isActive ? "ring-2 ring-sky-300" : "border border-gray-100"}`}>
                <div className="absolute inset-0 flex">
                  {block.segments.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <span className="text-[10px] text-gray-300">无数据</span>
                    </div>
                  ) : (
                    block.segments.map((seg, i) => {
                      const totalH = block.endH > block.startH ? block.endH - block.startH : 24 - block.startH + block.endH;
                      const segH = seg.endHour > seg.startHour ? seg.endHour - seg.startHour : 24 - seg.startHour + seg.endHour;
                      const w = Math.max((segH / totalH) * 100, 4);

                      // 概率顶边
                      const borderH = seg.pop >= 70 ? 4 : seg.pop >= 40 ? 3 : seg.pop >= 15 ? 2 : 1;
                      const borderC = seg.pop >= 60 ? "border-t-red-400" : seg.pop >= 30 ? "border-t-amber-400" : "border-t-gray-200";

                      const bg = getWeatherBg(seg.weatherClass, seg.intensity);

                      return (
                        <div
                          key={i}
                          className={`relative ${bg} ${borderC} flex items-center justify-center flex-shrink-0`}
                          style={{ width: `${w}%`, borderTopWidth: `${borderH}px` }}
                          title={`${weatherClassLabel(seg.weatherClass)} · ${seg.tempRange[0]}~${seg.tempRange[1]}° · ${seg.rainAmount}mm · ${seg.pop}%`}
                        >
                          {/* 图标：有降水概率 → 雨/雷/雪图标；否则原生图标 */}
                          {(seg.isTurning || i === 0) && (
                            <WeatherIcon
                              condition={seg.pop > 0 && seg.rainAmount < 0.3
                                ? (seg.weatherClass === "thunder" ? "雷阵雨" : seg.weatherClass === "snow" || seg.weatherClass === "heavy-snow" ? "小雪" : "小雨")
                                : seg.condition}
                              size={14}
                            />
                          )}
                          {/* 宽块内标注：有雨量→mm；仅概率→% */}
                          {seg.rainAmount >= 0.5 && w > 10 && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-700/70">
                              {seg.rainAmount.toFixed(1)}mm
                            </span>
                          )}
                          {seg.rainAmount < 0.5 && seg.pop >= 15 && w > 8 && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-red-500/60">
                              {seg.pop}%
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 当前时刻竖线 */}
                {isActive && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.4)] z-10"
                    style={{
                      left: `${(() => {
                        const elapsed = now >= block.startH ? now - block.startH : 24 - block.startH + now;
                        const total = block.endH > block.startH ? block.endH - block.startH : 24 - block.startH + block.endH;
                        return (elapsed / total) * 100;
                      })()}%`,
                    }}
                  />
                )}
              </div>

              {/* 时间轴刻度 */}
              {block.segments.length > 0 && (
                <div className="relative h-4 mx-1">
                  {(() => {
                    const totalH = block.endH > block.startH ? block.endH - block.startH : 24 - block.startH + block.endH;
                    const hours: { hr: number; leftPct: number }[] = [];
                    for (let h = block.startH; h <= block.startH + totalH; h++) {
                      const displayHr = h % 24;
                      const leftPct = ((h - block.startH) / totalH) * 100;
                      hours.push({ hr: displayHr, leftPct });
                    }
                    return hours.map(({ hr, leftPct }) => (
                      <span
                        key={hr}
                        className="absolute text-[9px] text-gray-400 font-mono"
                        style={{ left: `${leftPct}%`, transform: "translateX(-50%)", top: 0 }}
                      >
                        {String(hr).padStart(2, "0")}
                      </span>
                    ));
                  })()}
                </div>
              )}

              {/* 天气信息行 — 按时间段位置对齐 */}
              {block.segments.length > 0 && (
                <div className="relative" style={{ minHeight: "20px" }}>
                  {(() => {
                    const totalH = block.endH > block.startH ? block.endH - block.startH : 24 - block.startH + block.endH;
                    return block.segments.map((seg, i) => {
                      const segH = seg.endHour > seg.startHour ? seg.endHour - seg.startHour : 24 - seg.startHour + seg.endHour;
                      const segStartPct = seg.startHour >= block.startH
                        ? ((seg.startHour - block.startH) / totalH) * 100
                        : ((24 - block.startH + seg.startHour) / totalH) * 100;
                      const segWidthPct = (segH / totalH) * 100;
                      // 左对齐但不超过右边界的偏移量
                      const offsetPct = Math.min(segStartPct, 100 - segWidthPct);
                      return (
                        <span
                          key={i}
                          className="absolute top-0 inline-flex items-center gap-0.5 text-[10px] text-gray-500 whitespace-nowrap"
                          style={{ left: `${offsetPct}%`, transform: "translateX(0)" }}
                        >
                          <WeatherIcon
                            condition={seg.pop > 0 && seg.rainAmount < 0.3
                              ? (seg.weatherClass === "thunder" ? "雷阵雨" : seg.weatherClass === "snow" || seg.weatherClass === "heavy-snow" ? "小雪" : "小雨")
                              : seg.condition}
                            size={12}
                          />
                          <span className="text-gray-400">{weatherClassLabel(seg.weatherClass)}</span>
                          {seg.rainAmount >= 0.3 && (
                            <span className="text-blue-500 font-medium">{seg.rainAmount.toFixed(1)}mm</span>
                          )}
                          {seg.pop > 0 && (
                            <span className={`font-semibold ${seg.pop >= 60 ? 'text-red-500' : seg.pop >= 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                              {seg.pop}%
                            </span>
                          )}
                        </span>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtHour(h: number): string {
  const floor = Math.floor(h);
  const min = h % 1 !== 0 ? "30" : "00";
  return `${String(floor).padStart(2, "0")}:${min}`;
}
