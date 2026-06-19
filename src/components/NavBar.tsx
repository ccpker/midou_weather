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
    <nav className="flex justify-around items-center py-2 px-4 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = page === id;
        return (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
              active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
