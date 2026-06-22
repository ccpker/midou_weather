/**
 * 节奏配置 — 自定义作息板块 & 切换模式
 */

export interface BlockDef {
  key: string;
  startH: number;
  endH: number;
  title: string;
  emoji: string;
}

export interface ScheduleTemplate {
  name: string;
  blocks: BlockDef[];
}

export type RhythmMode = "always-work" | "fixed-weekdays" | "legal-holidays";

export interface RhythmConfig {
  mode: RhythmMode;
  fixedRestDays: number[]; // 0=周日, 1=周一...6=周六
  templates: {
    work: ScheduleTemplate;
    rest: ScheduleTemplate;
  };
  /** ISO date string → template override */
  overrides: Record<string, "work" | "rest">;
}

export const DEFAULT_WORK_TEMPLATE: ScheduleTemplate = {
  name: "上班板块",
  blocks: [
    { key: "sleep",    startH: 22, endH: 6,   title: "睡眠",     emoji: "😴" },
    { key: "commute",  startH: 6,  endH: 8,   title: "通勤",     emoji: "🚇" },
    { key: "morning",  startH: 8,  endH: 12,  title: "上午办公", emoji: "💼" },
    { key: "afternoon",startH: 12, endH: 17,  title: "下午办公", emoji: "☕" },
    { key: "evening",  startH: 17, endH: 18.5,title: "下班",     emoji: "🚗" },
    { key: "night",    startH: 18.5, endH: 22,title: "晚间活动", emoji: "🌙" },
  ],
};

export const DEFAULT_REST_TEMPLATE: ScheduleTemplate = {
  name: "休息板块",
  blocks: [
    { key: "rest_sleep",     startH: 22, endH: 9,  title: "懒觉",     emoji: "🛌" },
    { key: "rest_morning",   startH: 9,  endH: 12, title: "上午休闲", emoji: "🌿" },
    { key: "rest_afternoon", startH: 12, endH: 18, title: "下午休闲", emoji: "🎮" },
    { key: "rest_night",     startH: 18, endH: 22, title: "晚间活动", emoji: "🎬" },
  ],
};

export const DEFAULT_RHYTHM_CONFIG: RhythmConfig = {
  mode: "legal-holidays",
  fixedRestDays: [0, 6],
  templates: {
    work: DEFAULT_WORK_TEMPLATE,
    rest: DEFAULT_REST_TEMPLATE,
  },
  overrides: {},
};

const STORAGE_KEY = "weather-rhythm-config";

export function loadRhythmConfig(): RhythmConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RHYTHM_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_RHYTHM_CONFIG,
      ...parsed,
      templates: {
        work: { ...DEFAULT_WORK_TEMPLATE, ...parsed.templates?.work },
        rest: { ...DEFAULT_REST_TEMPLATE, ...parsed.templates?.rest },
      },
      overrides: parsed.overrides ?? {},
    };
  } catch {
    return DEFAULT_RHYTHM_CONFIG;
  }
}

export function saveRhythmConfig(cfg: RhythmConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/** 判断今天应该用哪个板块 */
export function resolveTodayTemplate(cfg: RhythmConfig): "work" | "rest" {
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);

  // 手动覆盖
  if (cfg.overrides[dateKey]) return cfg.overrides[dateKey];

  const day = today.getDay();

  switch (cfg.mode) {
    case "always-work":
      return "work";
    case "fixed-weekdays":
      return cfg.fixedRestDays.includes(day) ? "rest" : "work";
    case "legal-holidays":
      // TODO: 接入法定假日 API
      return day === 0 || day === 6 ? "rest" : "work";
  }
}

/** 今日节奏描述标签 */
export function getDayLabel(cfg: RhythmConfig): { text: string; isRest: boolean } {
  const template = resolveTodayTemplate(cfg);
  const isRest = template === "rest";
  const today = new Date();
  const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dayName = names[today.getDay()];

  switch (cfg.mode) {
    case "always-work":
      return { text: "工作日", isRest: false };
    case "fixed-weekdays":
      return { text: `${dayName} · ${isRest ? "休息日" : "工作日"}`, isRest };
    case "legal-holidays":
      return { text: `${dayName} · ${isRest ? "休息日" : "工作日"}`, isRest };
  }
}
