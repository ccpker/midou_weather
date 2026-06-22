/**
 * 节奏配置 hook — 读写 localStorage + React 状态
 */

import { useState, useCallback, useEffect } from "react";
import type { RhythmConfig } from "./rhythmConfig";
import {
  loadRhythmConfig,
  saveRhythmConfig,
  resolveTodayTemplate,
  getDayLabel,
} from "./rhythmConfig";

export function useRhythmConfig() {
  const [config, setConfig] = useState<RhythmConfig>(loadRhythmConfig);

  useEffect(() => {
    saveRhythmConfig(config);
  }, [config]);

  const updateConfig = useCallback((patch: Partial<RhythmConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.templates) {
        next.templates = { ...prev.templates, ...patch.templates };
      }
      return next;
    });
  }, []);

  const todayTemplate = resolveTodayTemplate(config);
  const dayLabel = getDayLabel(config);

  /** 手动覆盖/清除今日板块：点一次→切到对面；再点→回到自动 */
  const toggleOverride = useCallback(() => {
    const dateKey = new Date().toISOString().slice(0, 10);
    setConfig((prev) => {
      if (prev.overrides[dateKey]) {
        // 已有覆盖 → 清除，回到自动模式
        const next = { ...prev.overrides };
        delete next[dateKey];
        return { ...prev, overrides: next };
      }
      // 无覆盖 → 取自动模式的对面
      const auto = resolveTodayTemplate(prev);
      return {
        ...prev,
        overrides: { ...prev.overrides, [dateKey]: auto === "work" ? "rest" : "work" },
      };
    });
  }, []);

  /** 清除今天的覆盖 */
  const clearOverride = useCallback(() => {
    const dateKey = new Date().toISOString().slice(0, 10);
    setConfig((prev) => {
      const next = { ...prev.overrides };
      delete next[dateKey];
      return { ...prev, overrides: next };
    });
  }, []);

  return {
    config,
    updateConfig,
    todayTemplate,
    dayLabel,
    toggleOverride,
    clearOverride,
    hasOverride: !!config.overrides[new Date().toISOString().slice(0, 10)],
  };
}
