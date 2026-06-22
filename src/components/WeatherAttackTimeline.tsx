/**
 * 天气攻击时间轴 — 电量格 v3
 *
 * 设计：
 * - 双格并排：左(w=14px)=雨强(蓝), 右(w=8px)=概率(红)，间隙2px
 * - 左格按强度(1-4)百分比填高度；右格按pop%直接填充高度
 * - 四个角倒角(3px)，格与格分离(2px)
 * - 空段淡灰边框，看清格数
 * - 补满时间范围，空小时=双格全空
 * - 每个格子下面标时间
 */

import { useMemo } from "react";
import { useWeatherStore } from "@/lib/store";
import { classifyCondition, weatherClassLabel, type WeatherClass } from "@/lib/icons";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Zap } from "lucide-react";

// ─── 类型 ───

interface AttackBlock {
  hour: number;
  weatherClass: WeatherClass;
  condition: string;
  intensity: 1 | 2 | 3 | 4;
  pop: number;
  rainAmount: number;
}

interface AttackRow {
  dayLabel: string;
  ongoing: boolean;
  hoursUntil: number | null;
  blocks: AttackBlock[];
  startHour: number;
  endHour: number;
}

// ─── 判定 ───

function isAttack(wc: WeatherClass, pop: number, rainAmount: number): boolean {
  if (!["sunny", "cloudy", "overcast"].includes(wc)) return true;
  if (pop >= 5 || rainAmount > 0) return true;
  return false;
}

function attackIntensity(wc: WeatherClass, rainAmount: number, pop: number): 1 | 2 | 3 | 4 {
  switch (wc) {
    case "rain":
      return rainAmount >= 8 ? 3 : rainAmount >= 4 ? 2 : 1;
    case "heavy-rain":
      return rainAmount >= 15 ? 4 : rainAmount >= 8 ? 3 : 2;
    case "thunder": return 4;
    case "sleet": return 2;
    case "snow": return rainAmount >= 5 ? 2 : 1;
    case "heavy-snow": return 3;
    case "fog": return pop >= 60 ? 2 : 1;
    case "haze": return pop >= 50 ? 2 : 1;
    case "wind": return pop >= 50 ? 2 : 1;
    default: return 1;
  }
}

// ─── 占位 ───

const EMPTY: AttackBlock = {
  hour: -1,
  weatherClass: "sunny" as WeatherClass,
  condition: "",
  intensity: 1,
  pop: 0,
  rainAmount: 0,
};

// ─── 悬挂图标 ───

function blockIcon(wc: WeatherClass): "thunder" | "snow" | null {
  if (wc === "thunder") return "thunder";
  if (wc === "snow" || wc === "heavy-snow" || wc === "sleet") return "snow";
  return null;
}

// ─── 主组件 ───

export default function WeatherAttackTimeline() {
  const hourly = useWeatherStore((s) => s.hourly);

  const attacks: AttackRow[] = useMemo(() => {
    if (hourly.length === 0) return [];

    const allHourly: (AttackBlock | null)[] = [];
    const nowH = new Date().getHours();
    for (let i = 0; i < Math.min(hourly.length, 48); i++) {
      const h = hourly[i];
      const wc = classifyCondition(h.condition);
      if (!isAttack(wc, h.pop, h.rainAmount)) {
        allHourly.push(null);
      } else {
        allHourly.push({
          hour: i,
          weatherClass: wc,
          condition: h.condition,
          intensity: attackIntensity(wc, h.rainAmount, h.pop),
          pop: h.pop,
          rainAmount: h.rainAmount,
        });
      }
    }

    const attackIndices: number[] = [];
    allHourly.forEach((b, i) => { if (b) attackIndices.push(i); });
    if (attackIndices.length === 0) return [];

    const groups: number[][] = [];
    let grp: number[] = [attackIndices[0]];
    for (let i = 1; i < attackIndices.length; i++) {
      if (attackIndices[i] - attackIndices[i - 1] <= 2) {
        grp.push(attackIndices[i]);
      } else {
        groups.push(grp);
        grp = [attackIndices[i]];
      }
    }
    groups.push(grp);

    return groups.map((indices) => {
      const firstH = indices[0];
      const lastH = indices[indices.length - 1];
      const blocks: AttackBlock[] = [];
      for (let h = firstH; h <= lastH; h++) {
        const b = allHourly[h];
        blocks.push(b ? { ...b, hour: h } : { ...EMPTY, hour: h });
      }
      const dayOffset = Math.floor((nowH + firstH) / 24);
      return {
        dayLabel: dayOffset === 0 ? "今天" : dayOffset === 1 ? "明天" : dayOffset === 2 ? "后天" : "",
        ongoing: firstH === 0,
        hoursUntil: firstH === 0 ? null : firstH,
        blocks,
        startHour: firstH,
        endHour: lastH,
      };
    });
  }, [hourly]);

  return (
    <div className="animate-fade-in-up delay-200 space-y-3">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        异常天气
        <span className="font-normal normal-case text-gray-300 ml-1">攻击时间轴</span>
      </p>
      {attacks.length === 0 ? (
        <div className="glass-day rounded-xl px-3 py-3 text-center">
          <span className="text-[11px] text-gray-400">近48h内无明显异常天气 ☀️</span>
        </div>
      ) : (
        <div className="space-y-2">
          {attacks.map((atk, i) => (
            <AttackRowDisplay key={i} atk={atk} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ 单行 ═══

function fmtHour(offsetH: number): string {
  return `${String((new Date().getHours() + offsetH) % 24).padStart(2, "0")}`;
}

function AttackRowDisplay({ atk }: { atk: AttackRow }) {
  const rangeS = fmtHour(atk.startHour);
  const rangeE = fmtHour(atk.endHour + 1);
  const attackBlocks = atk.blocks.filter((b) => b.weatherClass !== "sunny");
  const totalH = atk.blocks.length;
  const maxPop = attackBlocks.length > 0 ? Math.max(...attackBlocks.map((b) => b.pop)) : 0;
  const totalRain = Math.round(attackBlocks.reduce((s, b) => s + b.rainAmount, 0) * 10) / 10;

  return (
    <div className="glass-day rounded-xl px-3 py-2.5 space-y-2">
      {/* 头部 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {atk.dayLabel && (
          <>
            <span className={`text-xs font-semibold ${
              atk.dayLabel === "今天" ? "text-amber-600" :
              atk.dayLabel === "明天" ? "text-blue-600" : "text-gray-500"
            }`}>{atk.dayLabel}</span>
            <span className="text-[10px] text-gray-500 font-mono">{rangeS}:00~{rangeE}:00</span>
          </>
        )}
        {atk.ongoing ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-medium text-red-500">正在攻击</span>
          </>
        ) : atk.hoursUntil != null && atk.hoursUntil > 0 ? (
          <span className="text-[10px] text-gray-500">{atk.hoursUntil}小时后</span>
        ) : (
          <span className="text-[10px] text-gray-500">即将</span>
        )}
        <span className="text-gray-300 mx-0.5">|</span>
        <WeatherIcon condition={attackBlocks[0]?.condition ?? ""} size={14} />
        <span className="text-xs font-semibold text-gray-700">
          {attackBlocks[0] ? weatherClassLabel(attackBlocks[0].weatherClass) : "—"}
        </span>
        <span className="text-[10px] text-gray-400">持续{totalH}h</span>
        {totalRain > 0 && <span className="text-[10px] text-blue-500">{totalRain}mm</span>}
        {maxPop > 0 && (
          <span className={`text-[10px] font-semibold ${maxPop >= 60 ? "text-red-500" : maxPop >= 30 ? "text-amber-500" : "text-gray-400"}`}>
            最高{maxPop}%
          </span>
        )}
      </div>

      {/* 双格行 */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex" style={{ gap: CELL_GAP }}>
          {atk.blocks.map((b, i) => (
            <BatteryDual key={i} block={b} />
          ))}
        </div>
      </div>

      {/* 时间标 */}
      <div className="flex items-center" style={{ gap: CELL_GAP }}>
        {atk.blocks.map((b, i) => (
          <span
            key={i}
            className="text-[8px] text-gray-400 font-mono text-center flex-shrink-0"
            style={{ width: L_W + R_W + CELL_GAP }}
          >
            {fmtHour(b.hour)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══ 双格 v3 — 百分比填高, 圆角, 间隙 ═══

const L_W = 14;
const R_W = 8;
const BLOCK_H = 28;
const CELL_GAP = 2;
const CORNER = 3;
const EMPTY_BORDER = "1px solid #E5E7EB";
const INTENSITY_BLUE = "#3B82F6";
const PROB_RED = "#EF4444";

function BatteryDual({ block }: { block: AttackBlock }) {
  const isEmptied = block.weatherClass === "sunny";
  const icon = isEmptied ? null : blockIcon(block.weatherClass);

  // 左格: 强度按百分比 (1→25%, 4→100%)
  const leftFillPct = isEmptied ? 0 : block.intensity * 25;
  // 右格: 概率直接百分比
  const rightFillPct = Math.min(block.pop, 100);

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: L_W + R_W + CELL_GAP }}>
      {/* 图标悬挂 */}
      <div style={{ height: 16, display: "flex", alignItems: "flex-end", marginBottom: 2 }}>
        {icon === "thunder" && (
          <span className="text-[13px] leading-none" style={{ color: "#FBBF24" }}>⚡</span>
        )}
        {icon === "snow" && (
          <span className="text-[13px] leading-none" style={{ color: "#93C5FD" }}>❄️</span>
        )}
        {!icon && !isEmptied && <div style={{ height: 14 }} />}
      </div>

      {/* 双格容器 */}
      <div className="flex flex-row" style={{ gap: 0, height: BLOCK_H }}>
        {/* 左格 — 雨强, 蓝色 */}
        <div
          className="overflow-hidden flex-shrink-0"
          style={{
            width: L_W, height: BLOCK_H,
            background: "#F3F4F6",
            borderRadius: CORNER,
            border: EMPTY_BORDER,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: `${leftFillPct}%`,
              background: leftFillPct > 0 ? INTENSITY_BLUE : "transparent",
              borderRadius: CORNER,
              transition: "height 0.4s ease",
            }}
          />
        </div>

        {/* 右格 — 概率, 大红色 */}
        <div
          className="overflow-hidden flex-shrink-0"
          style={{
            width: R_W, height: BLOCK_H,
            background: "#F3F4F6",
            borderRadius: CORNER,
            border: EMPTY_BORDER,
            position: "relative",
            marginLeft: CELL_GAP,
          }}
        >
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: `${rightFillPct}%`,
              background: rightFillPct > 0 ? PROB_RED : "transparent",
              transition: "height 0.4s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
