/**
 * 数据源面板 V3 — 移动端毛玻璃卡片设计
 */

import { useMemo, useState } from "react";
import { useWeatherStore } from "@/lib/store";
import { WeatherIcon } from "@/components/WeatherIcon";
import type { SourceId, SourceState, SourceStats, SourceSnapshot, DimKey, DimStatus } from "@/types/weather";
import {
  Activity, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Zap, Clock, Target, Gauge, WifiOff,
  ChevronDown, ChevronRight, ListTree, Stethoscope, Copy, X,
} from "lucide-react";

const emptyStats: SourceStats = {
  totalFetches: 0, errors: 0, avgResponseMs: 0,
  totalFeedbacks: 0, hits: 0, falseAlarms: 0, misses: 0, correctNeg: 0, accuracy: 0,
};

export default function SourcesPage() {
  const sources = useWeatherStore((s) => s.sources);
  const snapshots = useWeatherStore((s) => s.snapshots);
  const sourceStats = useWeatherStore((s) => s.sourceStats);
  const feedbacks = useWeatherStore((s) => s.feedbacks);
  const current = useWeatherStore((s) => s.current);
  const location = useWeatherStore((s) => s.location);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [copied, setCopied] = useState(false);

  const entries = useMemo(
    () => (Object.entries(sources) as [SourceId, SourceState][]).sort(([, a], [, b]) => b.waterline - a.waterline),
    [sources],
  );

  // 温度对标
  const tempComparison = useMemo(() => {
    if (!current?.sourceBreakdown) return [];
    return (Object.entries(current.sourceBreakdown) as [string, { temp: number; condition: string }][])
      .map(([id, v]) => ({ id: id as SourceId, temp: v.temp, condition: v.condition, name: sources[id as SourceId]?.name ?? id }));
  }, [current, sources]);

  const tempRange = useMemo(() => {
    const temps = tempComparison.map((t) => t.temp).filter((t) => isFinite(t));
    if (temps.length === 0) return { min: 0, max: 40, range: 40 };
    const min = Math.min(...temps) - 2;
    const max = Math.max(...temps) + 2;
    return { min, max, range: Math.max(max - min, 1) };
  }, [tempComparison]);

  // 诊断文本生成
  const diagnosticText = useMemo(() => {
    const lines: string[] = [];
    lines.push("══════════════════════");
    lines.push(" 米豆天气 V4.1 诊断报告");
    lines.push("══════════════════════");
    lines.push(`时间: ${new Date().toLocaleString("zh-CN")}`);
    if (location) {
      lines.push(`位置: ${location.address} (${location.lat.toFixed(4)},${location.lng.toFixed(4)})`);
      lines.push(`定位: ${location.precision} ±${location.accuracyMeters ?? "?"}m`);
    } else {
      lines.push("位置: 未获取");
    }
    lines.push("");

    for (const [id, src] of entries) {
      const dims = src.dims ?? {};
      const dimKeys = (Object.keys(dims) as DimKey[]).filter((k) => k in dims);
      lines.push(`[${src.name}] 水位:${src.waterline > 0 ? "+" : ""}${src.waterline} 网格:${src.spatialPrecisionLabel}`);
      if (dimKeys.length === 0) {
        lines.push("  (无维度数据)");
      } else {
        for (const k of dimKeys) {
          const d = dims[k]!;
          const ok = d.ok ? "✅" : d.error ? "❌" : "⚪";
          const ms = d.responseMs > 0 ? `${d.responseMs}ms` : "--";
          const status = d.ok ? "OK" : d.error || "--";
          lines.push(`  ${ok} ${DIM_LABELS[k].padEnd(6)} ${ms.padEnd(8)} ${status}`);
        }
      }
      lines.push("");
    }

    lines.push("══════════════════════");
    return lines.join("\n");
  }, [entries, location]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = diagnosticText;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="px-5 pt-2 pb-6 space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--color-accent)]" />
          <h2 className="text-lg font-semibold text-gray-700">数据源面板</h2>
        </div>
        <button
          onClick={() => setShowDiagnostic(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-white text-xs font-medium active:scale-95 transition-transform"
        >
          <Stethoscope className="w-3.5 h-3.5" />
          一键诊断
        </button>
      </div>

      {/* 实时对标 */}
      {tempComparison.length > 0 && (
        <div className="animate-fade-in-up delay-100 space-y-2">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider pl-1">实时对标 · 各源读数</p>
          <div className="glass rounded-2xl p-4 space-y-2">
            {tempComparison.map((src) => {
              const leftPct = tempRange.range > 0 ? ((src.temp - tempRange.min) / tempRange.range) * 100 : 50;
              return (
                <div key={src.id} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-500 truncate">{src.name}</span>
                  <div className="flex-1 h-7 bg-gray-50 rounded-full relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500/50 to-orange-500/50"
                      style={{ width: `${Math.min(leftPct, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-gray-800">
                      {src.temp.toFixed(1)}°
                    </span>
                  </div>
                  <span className="w-12 text-xs text-gray-400 text-right">{src.condition}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 源详情卡片 */}
      <div className="animate-fade-in-up delay-200 space-y-2">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider pl-1">数据源详情</p>
        {entries.map(([id, src], idx) => (
          <div key={id} className="animate-fade-in-up" style={{ animationDelay: `${0.25 + idx * 0.05}s` }}>
            <SourceCardGlow
              id={id}
              src={src}
              stats={sourceStats[id] ?? emptyStats}
              latestSnapshot={snapshots[id]?.slice(-1)[0] ?? null}
            />
          </div>
        ))}
      </div>

      {/* 一致性评估 */}
      {current && (
        <div className="animate-fade-in-up delay-400">
          <ConsensusGlow current={current} sources={sources} />
        </div>
      )}

      {/* 最近反馈 */}
      {feedbacks.length > 0 && (
        <div className="animate-fade-in-up delay-500 space-y-2">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider pl-1">
            最近校准 ({feedbacks.length})
          </p>
          <div className="glass rounded-2xl p-4 space-y-1.5">
            {feedbacks.slice(-10).reverse().map((f, i) => (
              <div key={i} className="text-xs text-gray-500 flex gap-2 items-center">
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

      {/* 诊断弹窗 */}
      {showDiagnostic && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowDiagnostic(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-xl mb-16 sm:mb-0" onClick={(e) => e.stopPropagation()}>
            {/* 头部栏 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-sm font-semibold text-gray-800">诊断报告</span>
              </div>
              <button onClick={() => setShowDiagnostic(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* 文本区 */}
            <div className="flex-1 overflow-auto px-5 py-3">
              <pre className="text-[11px] font-mono text-gray-700 whitespace-pre-wrap select-all leading-relaxed">{diagnosticText}</pre>
            </div>
            {/* 复制按钮 */}
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  copied ? "bg-emerald-500 text-white" : "bg-[var(--color-accent)] text-white active:bg-[var(--color-accent)]/80"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    已复制到剪贴板
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    一键复制
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ 源详情毛玻璃卡片 (含诊断面板) ═══

const DIM_LABELS: Record<DimKey, string> = { now: "实况", hourly: "逐时", daily: "逐日", rain: "分钟降水" };
const DIM_ORDER: DimKey[] = ["now", "hourly", "daily", "rain"];

function SourceCardGlow({ id, src, stats, latestSnapshot }: {
  id: SourceId; src: SourceState; stats: SourceStats; latestSnapshot: SourceSnapshot | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const waterlineIcon =
    src.waterline > 3 ? <TrendingUp className="w-3.5 h-3.5 text-[var(--color-success)]" /> :
    src.waterline < -3 ? <TrendingDown className="w-3.5 h-3.5 text-[var(--color-danger)]" /> :
    <Minus className="w-3.5 h-3.5 text-gray-400" />;

  const dims = src.dims ?? {};
  const dimKeys = DIM_ORDER.filter((k) => k in dims);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${src.enabled ? "text-[var(--color-accent)]" : "text-gray-400"}`} />
          <span className="font-medium text-sm text-gray-800">{src.name}</span>
          {src.lastError && <WifiOff className="w-3.5 h-3.5 text-red-400" />}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400" title="水位(可信度)">
          <Gauge className="w-3 h-3" />
          {waterlineIcon}
          <span className={`font-mono font-medium ${src.waterline > 0 ? "text-green-400" : src.waterline < 0 ? "text-red-400" : ""}`}>
            {src.waterline > 0 ? "+" : ""}{src.waterline}
          </span>
        </div>
      </div>

      {/* 指标网格 */}
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric
          icon={<Target className="w-3 h-3" />}
          label="温度"
          value={latestSnapshot?.temp != null ? `${latestSnapshot.temp.toFixed(1)}°` : "--"}
        />
        <MiniMetric
          icon={<Zap className="w-3 h-3" />}
          label="延迟"
          value={src.lastResponseMs != null ? `${src.lastResponseMs}ms` : "--"}
          sub={stats.avgResponseMs > 0 ? `avg ${stats.avgResponseMs}ms` : undefined}
        />
        <MiniMetric
          icon={<CheckCircle className="w-3 h-3" />}
          label="准确率"
          value={stats.totalFeedbacks > 0 ? `${stats.accuracy}%` : "--"}
          sub={stats.totalFeedbacks > 0 ? `${stats.totalFeedbacks}次` : undefined}
        />
        <MiniMetric icon={<Clock className="w-3 h-3" />} label="请求" value={`${stats.totalFetches}`} sub={stats.errors > 0 ? `${stats.errors} 错` : undefined} />
        <MiniMetric icon={<Target className="w-3 h-3" />} label="命中" value={stats.totalFeedbacks > 0 ? `${stats.hits}` : "--"} />
        <MiniMetric icon={<AlertTriangle className="w-3 h-3" />} label="误报" value={stats.totalFeedbacks > 0 ? `${stats.falseAlarms}` : "--"} sub={stats.misses > 0 ? `${stats.misses} 漏` : undefined} />
      </div>

      {src.lastError && (
        <div className="text-xs text-red-400 bg-red-400/10 rounded-xl px-3 py-1.5 truncate">
          {src.lastError}
        </div>
      )}

      {/* 诊断折叠区 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors w-full"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <ListTree className="w-3 h-3" />
        <span>诊断 ({dimKeys.length}维度)</span>
      </button>

      {expanded && (
        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {dimKeys.length === 0 ? (
            <div className="px-3 py-3 text-[10px] text-gray-400 text-center">暂无维度数据</div>
          ) : (
            dimKeys.map((k) => {
              const d = dims[k]!;
              return (
                <div key={k} className="flex items-center gap-3 px-3 py-2">
                  {/* 状态灯 */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    d.ok ? "bg-emerald-400" : d.error ? "bg-red-400" : "bg-gray-300"
                  }`} />
                  <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">{DIM_LABELS[k]}</span>
                  <span className={`text-[10px] font-mono flex-shrink-0 w-12 text-right ${
                    d.responseMs > 1000 ? "text-amber-500" : "text-gray-500"
                  }`}>
                    {d.responseMs > 0 ? `${d.responseMs}ms` : "--"}
                  </span>
                  <span className={`text-[10px] truncate flex-1 text-right ${
                    d.ok ? "text-emerald-600" : d.error ? "text-red-400" : "text-gray-400"
                  }`}>
                    {d.ok ? "OK" : d.error || "--"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MiniMetric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-sm font-mono font-semibold text-gray-700">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ═══ 一致性评估 ═══

function ConsensusGlow({ current, sources }: { current: NonNullable<ReturnType<typeof useWeatherStore.getState>["current"]>; sources: Record<SourceId, SourceState> }) {
  const breakdown = current.sourceBreakdown;
  if (!breakdown) return null;

  const entries = Object.entries(breakdown) as [string, { temp: number; condition: string }][];
  const temps = entries.map(([, v]) => v.temp);
  const tempRange = Math.max(...temps) - Math.min(...temps);

  const conditionCounts: Record<string, number> = {};
  for (const [, v] of entries) conditionCounts[v.condition] = (conditionCounts[v.condition] ?? 0) + 1;
  const mostCommon = Object.entries(conditionCounts).sort(([, a], [, b]) => b - a)[0];
  const conditionAgreement = mostCommon ? Math.round((mostCommon[1] / entries.length) * 100) : 0;

  const consensusLevel = tempRange <= 2 ? "high" : tempRange <= 5 ? "medium" : "low";
  const levelLabel = { high: "高共识", medium: "中分歧", low: "⚠ 严重分歧" }[consensusLevel];
  const levelColor = consensusLevel === "high" ? "text-green-400" : consensusLevel === "medium" ? "text-yellow-400" : "text-red-400";

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">多源一致性</p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">共识等级</span>
        <span className={`text-lg font-bold ${levelColor}`}>{levelLabel}</span>
      </div>
      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>温度分歧</span>
          <span className="font-mono">{tempRange.toFixed(1)}°C</span>
        </div>
        <div className="flex items-center justify-between">
          <span>天气一致</span>
          <span>{conditionAgreement}% 认为 {mostCommon?.[0] ?? "--"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>可用源</span>
          <span className="font-mono">{entries.length}/6</span>
        </div>
      </div>
    </div>
  );
}
