# SourcesPage CORS 修复 — 2026-06-21 16:56

## 问题

SourcesPage 显示"可用源 1/6"，源详情卡片大量 "--"，请求字段全带错误。

## 根因

`client.ts` 只用裸 `fetch()`，无 CORS 策略：

| 环境 | 原因 |
|------|------|
| Vite dev | 浏览器 enforce CORS，和风/高德/彩云/CMA 不返回 CORS 头 → 拦截 |
| APK 生产 | WebView 默认 origin `capacitor://localhost` → 对 HTTPS API 跨域全拦截 |
| 注释写了 CapacitorHttp | `@capacitor/http` 已废弃，从未实现 |

## 修复

### 1. Vite proxy（dev 模式）
5 条 proxy 路由：`/api/qweather` → `k77h2tb3b6.re.qweatherapi.com`、`/api/openmeteo`、`/api/amap`、`/api/caiyun`、`/api/cma`

### 2. Capacitor `androidScheme: "https"`（APK 模式）
WebView origin 变为 `https://localhost`，允许对 HTTPS API 的跨域 fetch

### 3. Config 双模式 URL
`import.meta.env.DEV` 切换 proxy 路径 vs 真实 URL

### 4. Seniverse 清理
config.ts / .env 移除心知天气死码

## 改动文件

- `vite.config.ts` — +5 proxy
- `capacitor.config.ts` — androidScheme 启用
- `src/lib/config.ts` — IS_DEV 双模式 + 移除 seniverse
- `src/lib/api/client.ts` — 注释更新
- `.env` — 移除 seniverse keys

## 构建

- TypeScript: 0 errors
- Vite build: 2.28s ✓
- Gradle: 9s, BUILD SUCCESSFUL
- APK: 4.77MB → `Z:\002soft\002own\001米豆天气\midou-weather-v4.1-debug.apk`
