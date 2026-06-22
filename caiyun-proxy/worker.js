// 彩云天气 CORS 代理 — Cloudflare Worker
// Token 硬编码在 Worker 服务端，浏览器永远不可见
// 前端调用：https://<worker>.workers.dev/<lon>,<lat>/<endpoint>?<query>
// Worker 内部转发：https://api.caiyunapp.com/v2.6/<TOKEN>/<lon>,<lat>/<endpoint>?<query>

const CAIYUN_TOKEN = "1byFbhxs1oMOWCYy";
const CAIYUN_BASE = "https://api.caiyunapp.com";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 预检请求（OPTIONS）
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // 路径格式：/lon,lat/endpoint?query
    // 拼接为：api.caiyunapp.com/v2.6/TOKEN/lon,lat/endpoint?query
    const cleanPath = url.pathname.replace(/^\/+/, "");
    const targetUrl = `${CAIYUN_BASE}/v2.6/${CAIYUN_TOKEN}/${cleanPath}${url.search}`;

    try {
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: { "Host": "api.caiyunapp.com" },
      });

      // 克隆响应并注入 CORS 头
      const body = res.body;
      const headers = new Headers(res.headers);
      Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));

      return new Response(body, { status: res.status, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: "proxy_error", detail: e.message }), {
        status: 502,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}
