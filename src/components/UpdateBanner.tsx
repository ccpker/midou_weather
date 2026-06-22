import { useState, useEffect } from "react";
import { Download, ExternalLink, RefreshCw, ArrowUpCircle } from "lucide-react";
import { checkUpdate, downloadAndInstall, type UpdateInfo } from "@/lib/updater";

export default function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // auto-check on mount
  useEffect(() => {
    doCheck();
  }, []);

  async function doCheck() {
    setChecking(true);
    setError(null);
    try {
      const result = await checkUpdate();
      setInfo(result);
      if (result && !result.hasUpdate) {
        setError(null); // no error, just no update
      }
    } catch {
      setError("网络不可达");
    } finally {
      setChecking(false);
    }
  }

  async function handleDownload() {
    if (!info?.apkUrl) return;
    await downloadAndInstall(info.apkUrl);
  }

  // no update available or still checking
  const showBanner = info?.hasUpdate;

  return (
    <div className="w-full">
      {/* check button — always visible */}
      <button
        onClick={doCheck}
        disabled={checking}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-white/80 rounded-2xl border border-gray-100 shadow-sm hover:bg-white transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          {checking ? (
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          ) : (
            <ArrowUpCircle className="w-4 h-4 text-blue-500" />
          )}
        </div>
        <span className="flex-1 text-left">
          {checking ? "检查中..." : "检查更新"}
        </span>
        {info && !info.hasUpdate && !checking && (
          <span className="text-xs text-green-500 shrink-0">已是最新</span>
        )}
        {info?.hasUpdate && !checking && (
          <span className="text-xs text-amber-500 font-semibold shrink-0">有新版本!</span>
        )}
        {error && !checking && (
          <span className="text-xs text-red-400 shrink-0">{error}</span>
        )}
      </button>

      {/* update detail banner */}
      {showBanner && info && (
        <div className="mt-2 bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden animate-fade-in-up">
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-amber-800">
                  v{info.latest} 可用
                </span>
                <span className="text-xs text-amber-500 ml-2">
                  当前 v{info.current}
                </span>
              </div>
              {info.publishedAt && (
                <span className="text-[10px] text-amber-400">
                  {new Date(info.publishedAt).toLocaleDateString("zh-CN")}
                </span>
              )}
            </div>

            {/* changelog */}
            {info.body && (
              <>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[11px] text-amber-600 underline underline-offset-2"
                >
                  {expanded ? "收起更新日志" : "查看更新日志"}
                </button>
                {expanded && (
                  <pre className="text-[10px] text-amber-700/80 bg-amber-100/50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {info.body}
                  </pre>
                )}
              </>
            )}
          </div>

          {/* action buttons */}
          <div className="flex border-t border-amber-200">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-amber-800 bg-amber-100/70 hover:bg-amber-100 active:bg-amber-200/50 transition-colors"
            >
              <Download className="w-4 h-4" />
              下载更新
            </button>
            <button
              onClick={() => window.open(info.releaseUrl, "_blank")}
              className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs text-amber-500 hover:bg-amber-100/50 active:bg-amber-100 transition-colors border-l border-amber-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
