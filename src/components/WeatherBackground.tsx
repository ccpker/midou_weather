import { useMemo } from "react";
import { useWeatherStore } from "@/lib/store";
import { classifyCondition, type WeatherClass } from "@/lib/icons";

/** 动态天气天空背景 — 浅色版 */
export function WeatherBackground() {
  const activeTab = useWeatherStore((s) => s.activeTab);
  const current = useWeatherStore((s) => s[activeTab].current);

  const weatherClass: WeatherClass | null = useMemo(() => {
    if (!current?.condition) return null;
    return classifyCondition(current.condition);
  }, [current?.condition]);

  const isRain = weatherClass === "rain" || weatherClass === "heavy-rain" || weatherClass === "thunder";
  const isSnow = weatherClass === "snow" || weatherClass === "heavy-snow" || weatherClass === "sleet";

  return (
    <div className={`fixed inset-0 gradient-${weatherClass ?? "unknown"} transition-all duration-1500 ease-in-out`}>
      {weatherClass === "sunny" && <SunGlow />}
      {weatherClass === "cloudy" && <CloudLayer />}
      {weatherClass === "overcast" && <OvercastLayer />}
      {isRain && <RainAtmosphere heavy={weatherClass === "heavy-rain"} thunder={weatherClass === "thunder"} />}
      {isSnow && <SnowAtmosphere />}
      {weatherClass === "fog" && <FogLayer />}
      {weatherClass === "haze" && <HazeLayer />}
      {weatherClass === "wind" && <WindStreaks />}
      {weatherClass === "unknown" && <DefaultGlow />}
    </div>
  );
}

function SunGlow() {
  return (
    <>
      <div className="absolute top-[5%] right-[15%] w-32 h-32 rounded-full bg-amber-200/40 blur-2xl" />
      <div className="absolute top-[10%] right-[18%] w-20 h-20 rounded-full bg-orange-200/50 blur-xl" />
      <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-amber-100/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[25%] bg-gradient-to-t from-amber-100/20 to-transparent" />
    </>
  );
}

function CloudLayer() {
  return (
    <>
      <div className="absolute top-[8%] left-[10%] w-40 h-24 rounded-full bg-slate-300/25 blur-3xl" />
      <div className="absolute top-[15%] right-[5%] w-48 h-28 rounded-full bg-slate-400/15 blur-3xl" />
      <div className="absolute top-[5%] left-[40%] w-36 h-20 rounded-full bg-slate-300/20 blur-2xl" />
    </>
  );
}

function OvercastLayer() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-slate-300/20 via-transparent to-slate-200/10" />
  );
}

function RainAtmosphere({ heavy, thunder }: { heavy: boolean; thunder: boolean }) {
  return (
    <>
      <div className={`absolute inset-0 bg-gradient-to-b ${heavy ? "from-slate-400/20 via-slate-300/12 to-slate-400/15" : "from-slate-300/15 via-transparent to-slate-200/10"}`} />
      <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-blue-200/20 to-transparent" />
      {thunder && <ThunderFlash />}
    </>
  );
}

function ThunderFlash() {
  return (
    <>
      <div className="absolute inset-0 bg-purple-200/15 animate-pulse" style={{ animationDuration: "2s" }} />
      <div className="absolute top-[20%] right-[30%] w-1 h-32 bg-purple-400/20 blur-sm rounded-full"
        style={{ animation: "thunder-bolt 4s ease-in-out infinite" }} />
    </>
  );
}

function SnowAtmosphere() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-200/20 via-transparent to-slate-100/15" />
      <div className="absolute top-[5%] left-[20%] w-32 h-32 rounded-full bg-slate-200/25 blur-3xl" />
    </>
  );
}

function FogLayer() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-stone-200/30 via-stone-100/40 to-stone-200/25" />
  );
}

function HazeLayer() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-amber-100/25 via-amber-50/30 to-amber-100/20" />
  );
}

function WindStreaks() {
  return (
    <>
      <div className="absolute top-[20%] left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-300/15 to-transparent blur-sm" />
      <div className="absolute top-[40%] left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-teal-200/12 to-transparent blur-sm" />
      <div className="absolute top-[60%] left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-300/10 to-transparent blur-sm" />
    </>
  );
}

function DefaultGlow() {
  return (
    <>
      <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-sky-100/25 to-transparent" />
      <div className="absolute top-[-20%] left-[-30%] w-[80%] h-[50%] rounded-full bg-blue-100/15 blur-3xl" />
    </>
  );
}
