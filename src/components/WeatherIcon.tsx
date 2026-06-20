import {
  Sun, Cloud, CloudSun, CloudRain, CloudLightning,
  CloudSnow, CloudFog, Wind, CloudDrizzle,
} from "lucide-react";
import { classifyCondition, type WeatherClass } from "@/lib/icons";

interface WeatherIconProps {
  condition: string;
  className?: string;
  size?: number;
}

/** 天气图标 — 根据中文条件渲染 Lucide 图标 */
export function WeatherIcon({ condition, className = "", size = 28 }: WeatherIconProps) {
  const cls = classifyCondition(condition);
  const IconComp = ICON_MAP[cls] ?? Cloud;

  return <IconComp className={`text-[var(--color-accent)] ${className}`} style={{ width: size, height: size }} />;
}

const ICON_MAP: Record<WeatherClass, typeof Sun> = {
  sunny: Sun,
  cloudy: CloudSun,
  overcast: Cloud,
  rain: CloudRain,
  "heavy-rain": CloudDrizzle,
  thunder: CloudLightning,
  snow: CloudSnow,
  "heavy-snow": CloudSnow,
  sleet: CloudSnow,       // 雨夹雪也用雪花图标
  fog: CloudFog,
  haze: CloudFog,
  wind: Wind,
  unknown: Cloud,
};
