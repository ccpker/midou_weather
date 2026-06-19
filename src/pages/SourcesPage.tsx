import { useWeatherStore } from "@/lib/store";
import type { SourceId } from "@/types/weather";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function SourcesPage() {
  const sources = useWeatherStore((s) => s.sources);
  const feedbacks = useWeatherStore((s) => s.feedbacks);

  const entries = Object.entries(sources) as [SourceId, typeof sources[SourceId]][];

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h2 className="text-lg font-semibold">数据源面板</h2>

      {/* 水位排行 */}
      <div className="space-y-2">
        {entries
          .sort(([, a], [, b]) => b.waterline - a.waterline)
          .map(([id, src]) => (
            <SourceRow key={id} id={id} src={src} activated={src.enabled} />
          ))}
      </div>

      {/* 最近反馈 */}
      {feedbacks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
            最近校准 ({feedbacks.length})
          </h3>
          <div className="space-y-1">
            {feedbacks.slice(-10).reverse().map((f, i) => (
              <div key={i} className="text-xs text-[var(--color-text-muted)] flex gap-2">
                <span>{new Date(f.forecastTime).toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{f.predicted ? "预报有雨" : "预报无雨"}</span>
                <span>→</span>
                <span className={f.actual === f.predicted ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}>
                  {f.actual ? "下了 ✅" : "没下 ❌"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SourceRow({ id, src, activated }: { id: SourceId; src: ReturnType<typeof useWeatherStore.getState>["sources"][SourceId]; activated: boolean }) {
  const icon =
    src.waterline > 3 ? <TrendingUp className="w-4 h-4 text-[var(--color-success)]" /> :
    src.waterline < -3 ? <TrendingDown className="w-4 h-4 text-[var(--color-danger)]" /> :
    <Minus className="w-4 h-4 text-[var(--color-text-muted)]" />;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${activated ? "bg-[var(--color-card)]" : "bg-[var(--color-card)]/40"}`}>
      <Activity className={`w-4 h-4 ${activated ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{src.name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {src.lastResponseMs !== null ? `${src.lastResponseMs}ms` : "未请求"}
          {src.lastError && <span className="text-[var(--color-danger)] ml-2">{src.lastError}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs">
        {icon}
        <span className={`font-mono ${src.waterline > 0 ? "text-[var(--color-success)]" : src.waterline < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
          {src.waterline > 0 ? "+" : ""}{src.waterline}
        </span>
      </div>
      <div className="text-xs text-[var(--color-text-muted)] w-8 text-right">×{src.weight}</div>
    </div>
  );
}
