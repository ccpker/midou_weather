/**
 * 中国气象局 (CMA) 适配器
 * 注意: d1.weather.com.cn 检测 OkHttp TLS 指纹，标准 fetch 可能被拦截
 * 生产环境需走 CmaWeather 原生 Java 插件 (HttpURLConnection + 浏览器UA)
 * 这里提供降级方案：CORS 代理或直接 fetch
 */
import { SOURCE_CONFIG } from "@/lib/config";
import type { SourceFetchResult, NormalizedNow } from "./types";

export const cmaAdapter = {
  id: "cma" as const,

  async fetchNow(_lat: number, _lng: number): Promise<SourceFetchResult> {
    const t0 = Date.now();
    try {
      // 气象局 JSONP 格式: fetch?callback=dataSK 返回 "dataSK({...})"
      // 实际 fetch 可能被 TLS 指纹拦截，此处提供骨架
      const res = await fetch(
        `${SOURCE_CONFIG.cma.baseUrl}/${SOURCE_CONFIG.cma.cityCode}.html?_=${Date.now()}`
      );
      const text = await res.text();

      // 解析 JSONP: var dataSK={...}
      const match = text.match(/dataSK\s*=\s*({[\s\S]+?})\s*$/m);
      if (!match) throw new Error("CMA JSONP parse failed");

      const sk = JSON.parse(match[1]);
      const now: NormalizedNow = {
        temp: parseFloat(sk.temp),
        feelsLike: parseFloat(sk.temp),
        condition: sk.weather ?? "",
        iconCode: sk.weathercode ?? "",
        humidity: _parseFloatFromPercent(sk.SD),
        windDir: sk.WD ?? "",
        windSpeed: parseFloat(sk.WS ?? "0"),
        pressure: parseFloat(sk.qy ?? "0"),
        visibility: 0,
        uv: 0,
        aqi: null,
      };
      return { sourceId: "cma", ok: true, responseMs: Date.now() - t0, now };
    } catch (e: any) {
      return { sourceId: "cma", ok: false, responseMs: Date.now() - t0, error: e.message };
    }
  },
};

function _parseFloatFromPercent(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace("%", ""));
}
