/**
 * 天气图标统一映射
 * 
 * 各源 iconCode 归一化为统一分类，再由 WeatherIcon 组件渲染
 */

// ─── 统一天气分类 ───
export type WeatherClass =
  | "sunny" | "cloudy" | "overcast"
  | "rain" | "heavy-rain" | "thunder"
  | "snow" | "heavy-snow" | "sleet"
  | "fog" | "haze" | "wind"
  | "unknown";

/** 条件中文 → 统一分类 */
export function classifyCondition(condition: string): WeatherClass {
  const c = condition.toLowerCase();

  if (/晴/.test(c)) return "sunny";
  if (/少云/.test(c)) return "sunny";
  if (/多云/.test(c)) return "cloudy";
  if (/阴/.test(c)) return "overcast";

  if (/雷/.test(c)) return "thunder";

  if (/暴雨|大暴雨/.test(c)) return "heavy-rain";
  if (/大雨/.test(c)) return "heavy-rain";
  if (/中雨/.test(c)) return "rain";
  if (/小雨|阵雨|毛毛雨/.test(c)) return "rain";
  if (/雨/.test(c)) return "rain";

  if (/暴雪/.test(c)) return "heavy-snow";
  if (/大雪/.test(c)) return "heavy-snow";
  if (/中雪/.test(c)) return "snow";
  if (/小雪|阵雪/.test(c)) return "snow";
  if (/雪/.test(c)) return "snow";

  if (/雨夹雪|冻雨/.test(c)) return "sleet";

  if (/雾/.test(c)) return "fog";
  if (/霾|浮尘|扬沙|沙尘/.test(c)) return "haze";
  if (/风/.test(c)) return "wind";

  return "unknown";
}

/** 统一分类 → 显示文本 */
export function weatherClassLabel(cls: WeatherClass): string {
  const map: Record<WeatherClass, string> = {
    sunny: "晴",
    cloudy: "多云",
    overcast: "阴",
    rain: "小雨",
    "heavy-rain": "大雨",
    thunder: "雷暴",
    snow: "雪",
    "heavy-snow": "大雪",
    sleet: "雨夹雪",
    fog: "雾",
    haze: "霾",
    wind: "大风",
    unknown: "未知",
  };
  return map[cls];
}
