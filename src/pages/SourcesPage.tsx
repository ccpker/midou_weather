/**
 * 数据源面板 V2 — 多源对标 + 深度统计
 * 
 * 三层:
 * 1. 多源温度对标 (各源分别说了什么)
 * 2. 源详情卡片 (温度/条件/延迟/水位/准确率/错误)
 * 3. 一致性评估
 */

import { useMemo } from "react";
import { useWeatherStore } from "@/lib/store";
import { WeatherIcon } from "@/components/WeatherIcon";
import type { SourceId, SourceState, SourceStats, SourceSnapshot } from "@/types/weather";
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Zap, Clock, Target, Gauge, WifiOff } from "lucide-react";

export default function SourcesPage() {
  const sources = useWeatherStore((s) => s.sources);
  const snapshots = useWeatherStore((s) => s.snapshots);
  const sourceStats = useWeatherStore((s) => s.sourceStats);
  const feedbacks = useWeatherStore((s) => s.feedbacks);
  const current = useWeatherStore((s) => s.current);

  const entries = useMemo(() => {
    const e = (Object.entries(sources) as [SourceId, SourceState][])
      .sort(([, a], [, b]) => b.waterline - a.waterline);
    return e;
  }, [sources]);

  // 温度对标数据
  const tempComparison = useMemo(() => {
    if (!current?.sourceBreakdown) return [];
    return (Object.entries(current.sourceBreakdown) as [string, { temp: number; condition: string }][])
      .map(([id, v]) => ({ id: id as SourceId, temp: v.temp, condition: v.condition, name: sources[id as SourceId]?.name ?? id }));
  }, [current, sources]);

  // 温度范围 (用于条形图对齐)
  const tempRange = useMemo(() => {
    const temps = tempComparison.map((t) => t.temp).filter((t) => isFinite(t));
    if (temps.length === 0) return { min: 0, max: 40, range: 40 };
    const min = Math.min(...temps) - 2;
    const max = Math.max(...temps) + 2;
    return { min, max, range: Math.max(max - min, 1) };
  }, [tempComparison]);

  return (
    <div className="px-4 pt-4 pb-20 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="w-5 h-5 text-[var(--color-accent)]" />
        数据源面板
      </h2>

      {/* ═══ 第一层: 多源温度对标 ═══ */}
      {tempComparison.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            实时对标 · 各源读数
          </h3>
          <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-2">
            {tempComparison.map((src) => {
              const leftPct = tempRange.range > 0
                ? ((src.temp - tempRange.min) / tempRange.range) * 100
                : 50;
              return (
                <div key={src.id} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-xs text-[var(--color-text-muted)] truncate">{src.name}</span>
                  <div className="flex-1 h-6 bg-[var(--color-bg)] rounded-full relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500/60 to-orange-500/60"
                      style={{ width: `${Math.min(leftPct, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-[var(--color-text)] mix-blend-difference z-10">
                      {src.temp.toFixed(1)}°
                    </span>
                  </div>
                  <span className="w-12 text-xs text-[var(--color-text-muted)] text-right">
                    {src.condition}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 第二层: 源详情卡片 ═══ */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          数据源详情
        </h3>
        {entries.map(([id, src]) => (
          <SourceCard
            key={id}
            id={id}
            src={src}
            stats={sourceStats[id] ?? emptyStats}
            latestSnapshot={snapshots[id]?.slice(-1)[0] ?? null}
          />
        ))}
      </div>

      {/* ═══ 第三层: 一致性评估 ═══ */}
      {current && (
        <ConsensusBlock current={current} sources={sources} />
      )}

      {/* 最近反馈 */}
      {feedbacks.length > 0 && (
        <div className="mt-2">
          <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            最近校准 ({feedbacks.length})
          </h3>
          <div className="space-y-1">
            {feedbacks.slice(-10).reverse().map((f, i) => (
              <div key={i} className="text-xs text-[var(--color-text-muted)] flex gap-2 items-center">
                <span>{new Date(f.forecastTime).toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{f.predicted ? "预报有雨" : "预报无雨"}</span>
                <span>→</span>
                <span className={f.actual === f.predicted ? "text-[var(--color-success)] flex items-center gap-1" : "text-[var(--color-danger)] flex items-center gap-1"}>
                  {f.actual === f.predicted ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {f.actual ? "下了" : "没下"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 源详情卡片 ───

const emptyStats: SourceStats = {
  totalFetches: 0, errors: 0, avgResponseMs: 0,
  totalFeedbacks: 0, hits: 0, falseAlarms: 0, misses: 0, correctNeg: 0, accuracy: 0,
};

function SourceCard({ id, src, stats, latestSnapshot }: {
  id: SourceId;
  src: SourceState;
  stats: SourceStats;
  latestSnapshot: SourceSnapshot | null;
}) {
  const waterlineIcon =
    src.waterline > 3 ? <TrendingUp className="w-3.5 h-3.5 text-[var(--color-success)]" /> :
    src.waterline < -3 ? <TrendingDown className="w-3.5 h-3.5 text-[var(--color-danger)]" /> :
    <Minus className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />;

  const lastTemp = latestSnapshot?.temp;

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-2">
      {/* 头部: 名称 + 状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${src.enabled ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`} />
          <span className="font-medium text-sm">{src.name}</span>
          {src.lastError && (
            <WifiOff className="w-3.5 h-3.5 text-[var(--color-danger)]" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          {/* 水位 */}
          <span className="flex items-center gap-1" title="水位(可信度)">
            <Gauge className="w-3 h-3" />
            {waterlineIcon}
            <span className={`font-mono ${src.waterline > 0 ? "text-[var(--color-success)]" : src.waterline < 0 ? "text-[var(--color-danger)]" : ""}`}>
              {src.waterline > 0 ? "+" : ""}{src.waterline}
            </span>
          </span>
        </div>
      </div>

      {/* 指标行 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 温度 */}
        <MetricBox
          icon={<Target className="w-3 h-3" />}
          label="温度"
          value={lastTemp !== null && lastTemp !== undefined ? `${lastTemp.toFixed(1)}°` : "--"}
        />
        {/* 延迟 */}
        <MetricBox
          icon={<Zap className="w-3 h-3" />}
          label="延迟"
          value={src.lastResponseMs !== null ? `${src.lastResponseMs}ms` : "--"}
          sub={stats.avgResponseMs > 0 ? `avg ${stats.avgResponseMs}ms` : undefined}
        />
        {/* 准确率 */}
        <MetricBox
          icon={<CheckCircle className="w-3 h-3" />}
          label="准确率"
          value={stats.totalFeedbacks > 0 ? `${stats.accuracy}%` : "--"}
          sub={stats.totalFeedbacks > 0 ? `${stats.totalFeedbacks}次` : undefined}
        />
        {/* 请求次数 */}
        <MetricBox
          icon={<Clock className="w-3 h-3" />}
          label="请求"
          value={`${stats.totalFetches}`}
          sub={stats.errors > 0 ? `${stats.errors} 错` : undefined}
        />
        {/* 命中/误报 */}
        <MetricBox
          icon={<Target className="w-3 h-3" />}
          label="命中"
          value={stats.totalFeedbacks > 0 ? `${stats.hits}` : "--"}
        />
        {/* 假警/漏报 */}
        <MetricBox
          icon={<AlertTriangle className="w-3 h-3" />}
          label="误报"
          value={stats.totalFeedbacks > 0 ? `${stats.falseAlarms}` : "--"}
          sub={stats.misses > 0 ? `${stats.misses} 漏` : undefined}
        />
      </div>

      {/* 错误信息 */}
      {src.lastError && (
        <div className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 rounded px-2 py-1 truncate">
          {src.lastError}
        </div>
      )}
    </div>
  );
}

function MetricBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] mb-0.5">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-sm font-mono font-semibold">{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-text-muted)]">{sub}</p>}
    </div>
  );
}

// ─── 一致性评估 ───

function ConsensusBlock({ current, sources }: { current: NonNullable<ReturnType<typeof useWeatherStore.getState>["current"]>; sources: Record<SourceId, SourceState> }) {
  const breakdown = current.sourceBreakdown;
  if (!breakdown) return null;

  const entries = Object.entries(breakdown) as [string, { temp: number; condition: string }][];
  const temps = entries.map(([, v]) => v.temp);
  const tempRange = Math.max(...temps) - Math.min(...temps);

  // 条件一致性
  const conditionCounts: Record<string, number> = {};
  for (const [, v] of entries) {
    conditionCounts[v.condition] = (conditionCounts[v.condition] ?? 0) + 1;
  }
  const mostCommonCondition = Object.entries(conditionCounts).sort(([, a], [, b]) => b - a)[0];
  const conditionAgreement = mostCommonCondition
    ? Math.round((mostCommonCondition[1] / entries.length) * 100)
    : 0;

  // 共识等级
  const consensusLevel = tempRange <= 2 ? "high" : tempRange <= 5 ? "medium" : "low";
  const levelLabel = { high: "高", medium: "中", low: "低" }[consensusLevel];
  const levelColor = consensusLevel === "high" ? "text-[var(--color-success)]" :
                     consensusLevel === "medium" ? "text-yellow-500" : "text-[var(--color-danger)]";

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-2">
      <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        多源一致性
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-sm">共识等级</span>
        <span className={`text-lg font-bold ${levelColor}`}>{levelLabel}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>温度分歧</span>
        <span className="font-mono">{tempRange.toFixed(1)}°C</span>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>天气现象一致</span>
        <span>{conditionAgreement}% 认为 {mostCommonCondition?.[0] ?? "--"}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>可用源</span>
        <span className="font-mono">{entries.length}/6</span>
      </div>
    </div>
  );
}
