# Android 标准开发流程

> 编程主管 | 2026-06-20 | v1.0  
> 适用：本 workspace 所有移动端 Web App（React + Vite / Tauri / Capacitor 项目）

---

## 1. 目标设备基准

| 参数 | 值 |
|------|----|
| 参考机型 | 真我 GT7 Pro |
| 屏幕宽度 | 390px（ Tailwind `sm` 基准） |
| 屏幕比例 | 约 19.5:9 |
| 主题 | 黑暗模式优先（OLED 省电 + 视觉质感） |
| 交互 | 触摸优先，最小触控区域 44×44px |

---

## 2. 开发闭环

```
编码 → Vite HMR → phone-preview.html 预览 → 截图自检 → 提交
```

每一步产出都必须经过 **手机预览验证**，不依赖浏览器 DevTools 模拟器。

### 2.1 编码阶段

- 所有组件以 `max-w-[390px] mx-auto` 包裹，模拟真机视口
- Tailwind `sm:` 断点 = 640px，移动端优先写默认样式
- 颜色变量统一定义在 `tailwind.config` / CSS 变量中

### 2.2 预览阶段（强制）

每次 UI 变更后必须执行：

```powershell
# 1. 启动 Vite dev server（如未启动）
Start-Process powershell -ArgumentList '-NoExit','-Command','cd D:\workspaces\dev\projects\weather-app; npx vite --host 0.0.0.0'

# 2. 打开手机预览页
& node C:\Users\midou(office)\.qclaw\skills\xbrowser\scripts\xb.cjs run --browser edge open "http://100.102.100.45:5173/phone-preview.html"

# 3. 截图验证
& node C:\Users\midou(office)\.qclaw\skills\xbrowser\scripts\xb.cjs run --browser edge screenshot
```

### 2.3 截图标准

- **手机必须居中**：不靠左、不偏右，浏览器窗口正中间
- **手机必须亮屏**：内容可辨、不暗如节能模式
- **外框风格**：白银钛金属质感，带圆角和阴影
- **背景**：大白/浅蓝渐变，衬托手机框

---

## 3. phone-preview.html 标准模板

每个移动端项目根目录放置 `phone-preview.html`，模板如下：

- 真机尺寸外框（390×844 或等比缩放）
- 白银钛金属边框（多层渐变 + box-shadow）
- 屏幕区域 `<iframe>` 嵌入 Vite dev server
- 屏幕呼吸发光光晕（可选，提升预览质感）
- 底部提示文字「鼠标滚轮滑动 · 点击操作」
- 自动注入 `?mock=1` 加载 mock 数据（如果项目支持）

---

## 4. Mock 数据策略

开发阶段不依赖真实 API Key，必须提供 Mock 模式：

1. `src/lib/mock-data.ts` — Mock 数据生成器
2. `useMock` store flag — 通过 `?mock=1` URL 参数激活
3. `phone-preview.html` iframe src 自动带 `?mock=1`
4. Mock 数据应覆盖所有 UI 状态：空态、加载态、正常、异常

---

## 5. 质量标准

| 维度 | 标准 |
|------|------|
| 视觉 | 黑暗主题 + 毛玻璃 + 微动画，不依赖外部图片 |
| 性能 | Vite build < 300KB JS (gzip < 100KB) |
| 触控 | 所有可点击区域 ≥ 44×44px |
| 预览 | 每次交付前截图确认手机预览效果 |
| 代码 | TypeScript 严格模式，ESLint 零警告 |

---

## 6. 与 PC 端差异

| 项 | 移动端 | PC 端 |
|----|--------|-------|
| 视口 | 390px 固定 | 自适应 |
| 导航 | 底部 Tab Bar | 侧边栏 |
| 交互 | Touch + swipe | Click + hover |
| 主题 | 暗黑优先 | 跟随系统 |
| 数据密度 | 低（一屏一内容） | 高（信息面板） |

---

## 7. 检查清单

每次 PR / commit 前：

- [ ] phone-preview.html 截图确认视觉效果
- [ ] 手机框居中、亮屏
- [ ] Mock 数据覆盖所有状态
- [ ] Vite build 通过
- [ ] TypeScript 类型检查通过
- [ ] 无 console 报错

---

*文档随项目实践迭代，每次发现问题更新此标准。*
