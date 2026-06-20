import { CloudSun, Activity, Settings } from "lucide-react";
import { useWeatherStore } from "@/lib/store";
import type { PageId } from "@/types/weather";

const tabs: { id: PageId; label: string; icon: typeof CloudSun }[] = [
  { id: "home", label: "天气", icon: CloudSun },
  { id: "sources", label: "数据", icon: Activity },
  { id: "settings", label: "设置", icon: Settings },
];

export default function NavBar() {
  const page = useWeatherStore((s) => s.page);
  const setPage = useWeatherStore((s) => s.setPage);

  return (
    <nav className="relative z-20 safe-area-bottom">
      <div className="mx-4 mb-3 glass rounded-2xl flex justify-around items-center py-2 px-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-5 rounded-xl transition-all duration-200 ${
                active
                  ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10 scale-105"
                  : "text-[var(--color-text-muted)] hover:text-slate-300 active:scale-95"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
