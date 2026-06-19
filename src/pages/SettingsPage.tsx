import { Settings, Bell, MapPin, Download, Info } from "lucide-react";
import { useWeatherStore } from "@/lib/store";

export default function SettingsPage() {
  const config = useWeatherStore((s) => s.config);
  const cities = useWeatherStore((s) => s.cities);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h2 className="text-lg font-semibold">设置</h2>

      <div className="space-y-2">
        <SettingRow icon={<MapPin className="w-4 h-4" />} label="城市管理" value={`${cities.length} 个城市`} />
        <SettingRow icon={<Bell className="w-4 h-4" />} label="下雨提醒" value="开启" />
        <SettingRow icon={<Download className="w-4 h-4" />} label="更新" value={config ? `v${config.version.name}` : "---"} />
        <SettingRow icon={<Info className="w-4 h-4" />} label="关于" value="米豆天气 v4.0" />
      </div>
    </div>
  );
}

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-card)]">
      <span className="text-[var(--color-accent)]">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{value}</span>
    </div>
  );
}
