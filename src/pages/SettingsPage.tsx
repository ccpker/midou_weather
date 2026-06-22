/**
 * 设置页 V3 — 毛玻璃移动端设计
 */

import { useState } from "react";
import { useWeatherStore } from "@/lib/store";
import type { SourceId, SourceState, SourceStats } from "@/types/weather";
import {
  Settings, MapPin, Bell, Download, Info,
  Activity, ToggleLeft, ToggleRight,
  TrendingUp, TrendingDown, Minus, Gauge, Zap, ShieldAlert,
} from "lucide-react";
import UpdateBanner from "@/components/UpdateBanner";

const SOURCE_META: Record<SourceId, { label: string; desc: string }> = {
  qweather:  { label: "和风天气", desc: "国家级授权，权威稳定" },
  openmeteo: { label: "Open-Meteo", desc: "全球开放气象，无Key" },
  amap:      { label: "高德天气", desc: "定位精准，逆地理强" },
  caiyun:    { label: "彩云天气", desc: "AI降水预测，2h精度" },
  cma:       { label: "国家气象局", desc: "官方数据，覆盖全国" },
};

export default function SettingsPage() {
  const sources = useWeatherStore((s) => s.sources);
  const snapshots = useWeatherStore((s) => s.snapshots);
  const sourceStats = useWeatherStore((s) => s.sourceStats);
  const config = useWeatherStore((s) => s.config);
  const cities = useWeatherStore((s) => s.cities);
  const toggleSource = useWeatherStore((s) => s.toggleSource);
  const setSourceWeight = useWeatherStore((s) => s.setSourceWeight);
  const [showSources, setShowSources] = useState(true);
  const [showGeneral, setShowGeneral] = useState(false);

  const enabledCount = Object.values(sources).filter((s) => s.enabled).length;

  return (
    <div className="px-5 pt-2 pb-6 space-y-4">
      <div className="flex items-center gap-2 animate-fade-in-up">
        <Settings className="w-5 h-5 text-[var(--color-accent)]" />
        <h2 className="text-lg font-semibold text-white">设置</h2>
      </div>

      {/* ═══ 更新检查 ═══ */}
      <div className="animate-fade-in-up delay-50">
        <UpdateBanner />
      </div>

      {/* ═══ 数据源管理 ═══ */}
      <div className="animate-fade-in-up delay-100">
        <div className="glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-2 w-full p-4 text-sm font-medium text-gray-700"
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <span>数据源管理</span>
              <span className="text-xs text-gray-400 ml-2">({enabledCount}/5 启用)</span>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{showSources ? "收起 ▲" : "展开 ▼"}</span>
          </button>
          {showSources && (
            <div className="px-4 pb-4 space-y-2">
              {(Object.entries(sources) as [SourceId, SourceState][]).map(([id, src]) => (
                <SourceRowGlow
                  key={id}
                  id={id}
                  src={src}
                  stats={sourceStats[id]}
                  latency={snapshots[id]?.slice(-1)[0]?.responseMs ?? src.lastResponseMs}
                  onToggle={() => toggleSource(id)}
                  onWeight={(w) => setSourceWeight(id, w)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 通用设置 ═══ */}
      <div className="animate-fade-in-up delay-200">
        <div className="glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowGeneral(!showGeneral)}
            className="flex items-center gap-2 w-full p-4 text-sm font-medium text-gray-700"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-gray-500" />
            </div>
            <span className="flex-1 text-left">通用</span>
            <span className="text-xs text-gray-400 shrink-0">{showGeneral ? "收起 ▲" : "展开 ▼"}</span>
          </button>
          {showGeneral && (
            <div className="px-4 pb-3 space-y-0.5">
              <SettingRow icon={<MapPin className="w-4 h-4" />} label="城市管理" value={`${cities.length} 个城市`} />
              <SettingRow icon={<Bell className="w-4 h-4" />} label="下雨提醒" value="开启" />
              <SettingRow icon={<Download className="w-4 h-4" />} label="远程配置" value={config ? `v${config.version.name}` : "未连接"} />
            </div>
          )}
        </div>
      </div>

      {/* ═══ 关于 ═══ */}
      <div className="animate-fade-in-up delay-300">
        <div className="glass rounded-2xl p-4 space-y-0.5">
          <SettingRow icon={<Info className="w-4 h-4" />} label="版本" value="米豆天气 v4.2.0" />
          <SettingRow icon={<Activity className="w-4 h-4" />} label="引擎" value="6源加权融合 + 水位学习" />
          <SettingRow icon={<ShieldAlert className="w-4 h-4" />} label="免责" value="仅作参考，以气象台为准" last />
        </div>
      </div>
    </div>
  );
}

// ═══ 设置行 ═══

function SettingRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${last ? "" : "border-b border-white/5"}`}>
      <span className="text-[var(--color-accent)] shrink-0">{icon}</span>
      <span className="flex-1 text-sm text-gray-600">{label}</span>
      <span className="text-xs text-gray-400">{value}</span>
    </div>
  );
}

// ═══ 数据源行 (毛玻璃版) ═══

function SourceRowGlow({
  id, src, stats, latency,
  onToggle, onWeight,
}: {
  id: SourceId; src: SourceState; stats?: SourceStats; latency: number | null;
  onToggle: () => void; onWeight: (w: number) => void;
}) {
  const meta = SOURCE_META[id];
  const waterlineIcon =
    src.waterline >= 3 ? <TrendingUp className="w-3 h-3 text-green-400" /> :
    src.waterline <= -3 ? <TrendingDown className="w-3 h-3 text-red-400" /> :
    <Minus className="w-3 h-3 text-gray-400" />;

  return (
    <div className={`rounded-xl p-3 ${src.enabled ? "bg-gray-50" : "bg-gray-50/50 opacity-60"}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-700 truncate">{meta.label}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">{meta.desc}</p>
        </div>
        <button onClick={onToggle} className="ml-2 shrink-0">
          {src.enabled ? (
            <ToggleRight className="w-7 h-7 text-[var(--color-accent)]" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-gray-200" />
          )}
        </button>
      </div>

      {/* 状态条 */}
      <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2.5">
        <span className="flex items-center gap-0.5">
          <Gauge className="w-3 h-3" />{waterlineIcon}
          <span className={`font-mono font-medium ${src.waterline > 0 ? "text-green-400" : src.waterline < 0 ? "text-red-400" : ""}`}>
            {src.waterline > 0 ? "+" : ""}{src.waterline}
          </span>
        </span>
        <span className="flex items-center gap-0.5">
          <Zap className="w-3 h-3" />{latency ?? "--"}ms
        </span>
        {stats && stats.totalFeedbacks > 0 && (
          <span>准确率 {stats.accuracy}%</span>
        )}
      </div>

      {/* 权重滑块 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 shrink-0">权重</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={src.weight}
          onChange={(e) => onWeight(Number(e.target.value))}
          disabled={!src.enabled}
          className="flex-1 h-1 accent-[var(--color-accent)] disabled:opacity-20"
        />
        <span className="text-xs font-mono text-gray-500 w-7 text-right">{src.weight}</span>
      </div>
    </div>
  );
}
