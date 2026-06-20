/**
 * HTTP 客户端基类
 * 开发模式用 fetch，生产环境走 CapacitorHttp 绕过 WebView SSL 限制
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

  /** GET 请求（开发模式用 fetch） */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        headers: this.defaultHeaders,
        signal: controller.signal,
      });
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
    const url = new URL(path, this.baseUrl);
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
