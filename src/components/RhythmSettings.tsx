/**
 * 节奏设置 — 自定义作息板块 + 切换模式
 */

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import type { RhythmConfig, RhythmMode, ScheduleTemplate, BlockDef } from "@/lib/rhythmConfig";
import { useRhythmConfig } from "@/lib/useRhythmConfig";

const MODE_LABELS: Record<RhythmMode, string> = {
  "always-work": "天天上班 — 始终使用上班板块",
  "fixed-weekdays": "固定周几 — 自定义每周休息日",
  "legal-holidays": "法定模式 — 周末+法定假日休息（暂未接入API，等同周末）",
};

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export function RhythmSettings() {
  const { config, updateConfig } = useRhythmConfig();
  const [showWork, setShowWork] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [showModeDetail, setShowModeDetail] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-white/25 uppercase tracking-wider">节奏配置</p>

      {/* 模式选择 */}
      <div className="glass rounded-xl p-3 space-y-2">
        <button
          onClick={() => setShowModeDetail(!showModeDetail)}
          className="flex items-center justify-between w-full text-xs text-white/60"
        >
          <span>切换模式</span>
          <span className="flex items-center gap-1 text-white/40">
            <span className="text-white/70">{MODE_LABELS[config.mode].split(" — ")[0]}</span>
            {showModeDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        </button>
        {showModeDetail && (
          <div className="space-y-1.5 pt-1">
            {(Object.entries(MODE_LABELS) as [RhythmMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => updateConfig({ mode })}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  config.mode === mode
                    ? "bg-[var(--color-accent)]/15 text-white/90"
                    : "text-white/45 hover:bg-white/5"
                }`}
              >
                <span className="font-medium">{label.split(" — ")[0]}</span>
                <span className="text-white/30 ml-2">— {label.split(" — ")[1]}</span>
              </button>
            ))}
          </div>
        )}

        {/* 固定周几 → 选日子 */}
        {config.mode === "fixed-weekdays" && (
          <div className="pt-1">
            <p className="text-[10px] text-white/30 mb-1.5">休息日</p>
            <div className="flex gap-1">
              {DAY_NAMES.map((name, i) => {
                const active = config.fixedRestDays.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const next = active
                        ? config.fixedRestDays.filter((d) => d !== i)
                        : [...config.fixedRestDays, i].sort();
                      updateConfig({ fixedRestDays: next });
                    }}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                        : "bg-white/5 text-white/35 border border-white/5 hover:bg-white/10"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 上班板块编辑 */}
      <TemplateEditor
        title="上班板块"
        template={config.templates.work}
        expanded={showWork}
        onToggle={() => setShowWork(!showWork)}
        onUpdate={(t) => updateConfig({ templates: { ...config.templates, work: t } })}
      />

      {/* 休息板块编辑 */}
      <TemplateEditor
        title="休息板块"
        template={config.templates.rest}
        expanded={showRest}
        onToggle={() => setShowRest(!showRest)}
        onUpdate={(t) => updateConfig({ templates: { ...config.templates, rest: t } })}
      />
    </div>
  );
}

// ═══ 板块编辑器 ═══

function TemplateEditor({
  title,
  template,
  expanded,
  onToggle,
  onUpdate,
}: {
  title: string;
  template: ScheduleTemplate;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (t: ScheduleTemplate) => void;
}) {
  const addBlock = () => {
    const newBlock: BlockDef = {
      key: `block_${Date.now()}`,
      startH: 8,
      endH: 12,
      title: "新区块",
      emoji: "📌",
    };
    onUpdate({ ...template, blocks: [...template.blocks, newBlock] });
  };

  const removeBlock = (idx: number) => {
    onUpdate({ ...template, blocks: template.blocks.filter((_, i) => i !== idx) });
  };

  const updateBlock = (idx: number, patch: Partial<BlockDef>) => {
    const next = [...template.blocks];
    next[idx] = { ...next[idx], ...patch };
    onUpdate({ ...template, blocks: next });
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-3 text-xs text-white/60"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-white/35" />
          <span className="text-white/80 font-medium">{title}</span>
          <span className="text-white/25">({template.blocks.length}块)</span>
        </div>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {template.blocks.map((b, i) => (
            <div key={b.key} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-2.5 py-2">
              {/* emoji */}
              <input
                value={b.emoji}
                onChange={(e) => updateBlock(i, { emoji: e.target.value })}
                className="w-7 h-6 text-center text-sm bg-transparent rounded"
                maxLength={2}
              />
              {/* 名称 */}
              <input
                value={b.title}
                onChange={(e) => updateBlock(i, { title: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-xs text-white/70 rounded px-1 py-0.5 outline-none focus:bg-white/10"
              />
              {/* 开始 */}
              <input
                type="number"
                value={b.startH % 1 !== 0 ? b.startH.toFixed(1) : b.startH}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0 && v < 24) updateBlock(i, { startH: v });
                }}
                step={0.5}
                min={0}
                max={23.5}
                className="w-12 text-center bg-transparent text-xs text-white/50 rounded px-0.5 py-0.5 outline-none focus:bg-white/10 tabular-nums"
              />
              <span className="text-white/20 text-[10px]">~</span>
              {/* 结束 */}
              <input
                type="number"
                value={b.endH % 1 !== 0 ? b.endH.toFixed(1) : b.endH}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0 && v <= 24) updateBlock(i, { endH: v });
                }}
                step={0.5}
                min={0}
                max={24}
                className="w-12 text-center bg-transparent text-xs text-white/50 rounded px-0.5 py-0.5 outline-none focus:bg-white/10 tabular-nums"
              />
              <button
                onClick={() => removeBlock(i)}
                className="p-1 text-white/20 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={addBlock}
            className="flex items-center gap-1.5 w-full py-2 text-[10px] text-white/30 hover:text-white/50 transition-colors justify-center"
          >
            <Plus className="w-3 h-3" />
            添加区块
          </button>
        </div>
      )}
    </div>
  );
}
