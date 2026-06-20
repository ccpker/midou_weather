/**
 * 设置页 V2 — 数据源管理 + 通用设置
 *
 * 布局:
 * 1. 数据源管理 (开关/权重/水位/延迟)
 * 2. 通用设置 (城市/提醒/配置)
 * 3. 关于
 */

import { useState } from "react";
import { useWeatherStore } from "@/lib/store";
import type { SourceId, SourceState, SourceStats } from "@/types/weather";
import {
  Settings, MapPin, Bell, Download, Info,
  Activity, ToggleLeft, ToggleRight, SlidersHorizontal,
  TrendingUp, TrendingDown, Minus, Gauge, Zap, ShieldAlert,
} from "lucide-react";

const SOURCE_META: Record<SourceId, { label: string; desc: string }> = {
  qweather:  { label: "和风天气", desc: "国家级授权，权威稳定" },
  seniverse: { label: "心知天气", desc: "分钟级降水，彩云源" },
  amap:      { label: "高德天气", desc: "定位精准，逆地理强" },
  caiyun:    { label: "彩云天气", desc: "AI降水预测，2h精度" },
  cma:       { label: "国家气象局", desc: "官方数据，覆盖全国" },
  api_box:   { label: "API盒子", desc: "多源聚合，备用兜底" },
};

export default function SettingsPage() {
  const sources = useWeatherStore((s) => s.sources);
  const snapshots = useWeatherStore((s) => s.snapshots);
  const sourceStats = useWeatherStore((s) => s.sourceStats);
  const config = useWeatherStore((s) => s.config);
  const cities = useWeatherStore((s) => s.cities);
  const toggleSource = useWeatherStore((s) => s.toggleSource);
  const setSourceWeight = useWeatherStore((s) => s.setSourceWeight);
  const [activeSection, setActiveSection] = useState<"sources" | "general" | null>("sources");

  const enabledCount = Object.values(sources).filter((s) => s.enabled).length;

  return (
    <div className="px-4 pt-6 pb-20 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="w-5 h-5 text-[var(--color-accent)]" />
        设置
      </h2>

      {/* ═══ 数据源管理 — 折叠卡片 ═══ */}
      <div className="bg-[var(--color-card)] rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveSection(activeSection === "sources" ? null : "sources")}
          className="flex items-center gap-2 w-full p-4 text-sm font-medium"
        >
          <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent)]" />
          数据源管理
          <span className="text-xs text-[var(--color-text-muted)] ml-1">({enabledCount}/6 启用)</span>
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            {activeSection === "sources" ? "收起 ▲" : "展开 ▼"}
          </span>
        </button>
        {activeSection === "sources" && (
          <div className="px-4 pb-3 space-y-2">
            {(Object.entries(sources) as [SourceId, SourceState][]).map(([id, src]) => (
              <SourceRow
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

      {/* ═══ 通用设置 ═══ */}
      <div className="bg-[var(--color-card)] rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveSection(activeSection === "general" ? null : "general")}
          className="flex items-center gap-2 w-full p-4 text-sm font-medium"
        >
          <Settings className="w-4 h-4 text-[var(--color-text-muted)]" />
          通用
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            {activeSection === "general" ? "收起 ▲" : "展开 ▼"}
          </span>
        </button>
        {activeSection === "general" && (
          <div className="px-4 pb-3 space-y-1">
            <SettingItem icon={<MapPin className="w-3.5 h-3.5" />} label="城市管理" value={`${cities.length} 个城市`} />
            <SettingItem icon={<Bell className="w-3.5 h-3.5" />} label="下雨提醒" value="开启" />
            <SettingItem icon={<Download className="w-3.5 h-3.5" />} label="远程配置" value={config ? `v${config.version.name}` : "未连接"} />
          </div>
        )}
      </div>

      {/* ═══ 关于 ═══ */}
      <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-1">
        <SettingItem icon={<Info className="w-3.5 h-3.5" />} label="版本" value="米豆天气 v4.0.0" />
        <SettingItem icon={<Activity className="w-3.5 h-3.5" />} label="引擎" value="6源加权融合 + 水位学习" />
        <SettingItem icon={<ShieldAlert className="w-3.5 h-3.5" />} label="免责" value="仅作参考，以气象台为准" />
      </div>
    </div>
  );
}

// ─── 通用设置项 ───

function SettingItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-[var(--color-accent)]">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{value}</span>
    </div>
  );
}

// ─── 数据源行 (开关 + 权重滑块 + 水位 + 延迟) ───

function SourceRow({
  id, src, stats, latency,
  onToggle, onWeight,
}: {
  id: SourceId;
  src: SourceState;
  stats?: SourceStats;
  latency: number | null;
  onToggle: () => void;
  onWeight: (w: number) => void;
}) {
  const meta = SOURCE_META[id];
  const waterlineIcon =
    src.waterline >= 3 ? <TrendingUp className="w-3 h-3 text-[var(--color-success)]" /> :
    src.waterline <= -3 ? <TrendingDown className="w-3 h-3 text-[var(--color-danger)]" /> :
    <Minus className="w-3 h-3 text-[var(--color-text-muted)]" />;

  return (
    <div className={`rounded-lg p-3 ${src.enabled ? "bg-[var(--color-bg)]" : "bg-[var(--color-bg)]/50 opacity-60"}`}>
      {/* 头部: 名称 + 开关 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Activity className={`w-3.5 h-3.5 ${src.enabled ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`} />
            <span className="text-sm font-medium truncate">{meta.label}</span>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{meta.desc}</p>
        </div>
        <button onClick={onToggle} className="ml-2 shrink-0">
          {src.enabled ? (
            <ToggleRight className="w-7 h-7 text-[var(--color-accent)]" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-[var(--color-text-muted)]" />
          )}
        </button>
      </div>

      {/* 状态条: 水位 + 延迟 + 准确率 */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] mb-2">
        <span className="flex items-center gap-0.5" title="水位(可信度)">
          <Gauge className="w-3 h-3" />{waterlineIcon}
          <span className={`font-mono ${src.waterline > 0 ? "text-[var(--color-success)]" : src.waterline < 0 ? "text-[var(--color-danger)]" : ""}`}>
            {src.waterline > 0 ? "+" : ""}{src.waterline}
          </span>
        </span>
        <span className="flex items-center gap-0.5">
          <Zap className="w-3 h-3" />
          {latency ?? "--"}ms
        </span>
        {stats && stats.totalFeedbacks > 0 && (
          <span className="flex items-center gap-0.5">
            准确率 {stats.accuracy}%
          </span>
        )}
      </div>

      {/* 权重滑块 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">权重</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={src.weight}
          onChange={(e) => onWeight(Number(e.target.value))}
          disabled={!src.enabled}
          className="flex-1 h-1 accent-[var(--color-accent)] disabled:opacity-30"
        />
        <span className="text-xs font-mono w-8 text-right">{src.weight}</span>
      </div>
    </div>
  );
}
