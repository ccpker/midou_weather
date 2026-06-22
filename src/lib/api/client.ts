/**
 * HTTP 客户端基类
 * 透明支持两种模式:
 * - 开发: Vite proxy 代理所有 API (绕过 CORS)
 * - 生产: 直接 fetch (APK WebView 通过 androidScheme:"https" 解除同源限制)
 */

export interface FetchOptions {
  url: string;
  headers?: Record<string, string>;
  timeout?: number; // ms
}

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(baseUrl: string, headers: Record<string, string> = {}, timeout = 10000) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = headers;
    this.timeout = timeout;
  }

  /** GET 请求 */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Capacitor 原生平台：优先用 CapacitorHttp 绕过 CORS
      let res: Response;
      try {
        res = await fetch(url, {
          headers: this.defaultHeaders,
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        // fetch 失败（CORS / 网络不通）时，尝试 XHR 绕过
        res = await _xhrGet(url, this.defaultHeaders);
      }
      if (!res.ok) throw new HTTPError(res.status, await res.text().catch(() => ""));
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** POST */
  async post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...this.defaultHeaders, ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new HTTPError(res.status, await res.text().catch(() => ""));
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    // 去除 path 前导 /，让 new URL 正确拼接到 baseUrl 路径下
    const cleanPath = path.replace(/^\/+/, '');
    // 确保 baseUrl 以 / 结尾，使 new URL 按子目录解析
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
    const url = new URL(cleanPath, base);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return url.toString();
  }
}

export class HTTPError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

// Capacitor/XHR CORS 回退 → 见 _xhrGet 导出
declare global {
  interface Window {
    Capacitor?: { isNativePlatform: () => boolean };
  }
}

/** XHR GET — 绕过 WebView CORS，外部可用 */
export function _xhrGet(url: string, headers: Record<string, string> = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    Object.entries(headers).forEach(([k, v]) => {
      try { xhr.setRequestHeader(k, v); } catch { /* ignore */ }
    });
    xhr.timeout = 10000;
    xhr.onload = () => {
      const body = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => JSON.parse(body),
        text: async () => body,
      } as Response);
    };
    xhr.onerror = () => reject(new Error('XMLHttpRequest failed'));
    xhr.ontimeout = () => reject(new Error('XMLHttpRequest timeout'));
    xhr.send();
  });
}
