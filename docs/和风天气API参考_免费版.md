# 和风天气 API 深度调研

> 调研时间：2026-06-20  
> 文档站：https://dev.qweather.com/docs/api/  
> API Host：免费版 `devapi.qweather.com` / 商业版 `api.qweather.com`  
> 文档版本：v7

---

## 1. 定价与额度

**免费版（开发版）**
- 每天 **1000 次**调用（2022年11月从 5 万次/天大幅砍降）
- 每分钟 **3000 次**（QPM 限制），触发 429 后走指数退避
- 协议客户可提升至每分钟 50000 次
- 需要注册账号 → 创建项目 → 获取 API Key 或 JWT 凭据

**商业版**
- 按订阅包月，超额付费
- 更高 QPM、更多数据项（如格点天气、更长预报天数）
- 超额后返回错误码 `OVER MONTHLY LIMIT`（HTTP 429）

⚠️ **关键限制**：免费版每天只有 1000 次调用，融合引擎最多同时调 4 个源（和风+彩云+Open-Meteo+高德），每天理论上能支撑 ~250 次全量刷新。对于个人天气 APP 够用，但不能高频轮询。

---

## 2. 认证方式

### 旧版：API Key（v1 风格）
```
https://devapi.qweather.com/v7/weather/now?location=101010100&key=YOUR_KEY
```

### 新版：JWT（推荐，v2 风格）
```bash
curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  'https://your_api_host/v7/weather/now?location=101010100'
```
需要先创建 Ed25519 公私钥对，上传公钥到控制台，用私钥签发 JWT。

---

## 2.1 Gzip 压缩处理

**所有 Web API 响应默认 Gzip 压缩**。SDK 已内置解压，HTTP 客户端需自行处理：

| 语言 | 库 |
|------|----|
| TypeScript/JS | `fetch` + `Content-Encoding: gzip`（浏览器自动解压） |
| Python | `gzip` 标准库 |
| Go | `compress/gzip` |
| Java | `GZIPInputStream` |
| C# | `System.IO.Compression.GZipStream` |

> Capacitor HTTP 插件需要手动设置 `Accept-Encoding: gzip` 并解压响应体。

---

## 2.2 时间格式

- 统一使用 **ISO 8601** 格式（含时区），如 `2025-10-24T11:19+08:00`
- **夏令时已自动调整**，开发者无需额外转换
- 日出日落/月升月落使用 `HH:mm` 格式

---

## 2.3 城市列表仓库

GitHub: [qwd/LocationList](https://github.com/qwd/LocationList)

内含：
- `China-City-List-latest.csv` — 中国城市 LocationID 表
- `POI-Air-Monitoring-Station-List-latest.csv` — 空气质量监测站
- `POI-Scenic-List-latest.csv` — 景点 POI
- `POI-Tide-Station-List-latest.csv` — 潮汐站
- `iso3166.csv` — 国家代码

⚠️ 不建议离线使用这些 CSV。官方推荐用 GeoAPI 实时查询以保持数据最新。

---

## 3. 核心 API 端点

### 3.1 实时天气 `/v7/weather/now`

| 参数 | 必选 | 说明 |
|------|------|------|
| location | ✅ | LocationID 或 `经度,纬度`（最多两位小数） |
| lang | | 多语言，如 `zh` |
| unit | | `m`（公制，默认）/ `i`（英制） |

**返回字段**（`now` 对象）：

| 字段 | 类型 | 说明 |
|------|------|------|
| obsTime | string | 观测时间 ISO8601 |
| temp | string | 温度（℃） |
| feelsLike | string | 体感温度（℃） |
| icon | string | 天气图标代码，如 `100`=晴, `305`=小雨 |
| text | string | 天气文字描述 |
| wind360 | string | 风向360角度 |
| windDir | string | 风向方位（中文返回"东南风"等） |
| windScale | string | 风力等级（蒲福风级） |
| windSpeed | string | 风速（km/h） |
| humidity | string | 相对湿度（%） |
| precip | string | 过去1小时降水量（mm） |
| pressure | string | 大气压强（hPa） |
| vis | string | 能见度（km） |
| cloud | string | 云量（%），可能为空 |
| dew | string | 露点温度（℃），可能为空 |

> ⚠️ **注意**：所有数值字段返回 **string 类型**，不是 number！前端需 `parseFloat()`。

### 3.2 逐小时预报 `/v7/weather/{hours}`

`hours` 可选：`24h` / `72h` / `168h`（最大7天逐小时）

**返回字段**（`hourly[]` 每个元素）：

| 字段 | 类型 | 说明 |
|------|------|------|
| fxTime | string | 预报时间 ISO8601 |
| temp | string | 温度（℃） |
| icon | string | 天气图标 |
| text | string | 天气描述 |
| wind360 | string | 风向角度 |
| windDir | string | 风向方位 |
| windScale | string | 风力等级 |
| windSpeed | string | 风速（km/h） |
| humidity | string | 湿度（%） |
| pop | string | **降水概率**（%），可能为空 ← 融合引擎核心字段 |
| precip | string | 降水量（mm） |
| pressure | string | 气压（hPa） |
| cloud | string | 云量（%），可能为空 |
| dew | string | 露点温度（℃），可能为空 |

> 和风有 `pop`（降水概率）字段，与彩云的分钟级降水形成互补。彩云擅长分钟级降雨量预测（有无雨），和风擅长概率估算。

### 3.3 逐天预报 `/v7/weather/{days}`

`days` 可选：`3d` / `7d` / `10d` / `15d` / `30d`

**返回字段**（`daily[]` 每个元素）：

| 字段 | 类型 | 说明 |
|------|------|------|
| fxDate | string | 日期 `YYYY-MM-DD` |
| sunrise / sunset | string | 日出/日落时间 `HH:mm`，高纬度可能为空 |
| moonrise / moonset | string | 月升/月落时间，可能为空 |
| moonPhase | string | 月相名称（如"盈凸月"） |
| moonPhaseIcon | string | 月相图标代码（800-807） |
| tempMax / tempMin | string | 最高/最低温度（℃） |
| iconDay / iconNight | string | 白天/夜间天气图标 |
| textDay / textNight | string | 白天/夜间天气描述 |
| wind360Day / wind360Night | string | 白/夜风向角度 |
| windDirDay / windDirNight | string | 白/夜风向方位 |
| windScaleDay / windScaleNight | string | 白/夜风力等级 |
| windSpeedDay / windSpeedNight | string | 白/夜风速（km/h） |
| humidity | string | 湿度（%） |
| precip | string | 总降水量（mm） |
| pressure | string | 气压（hPa） |
| vis | string | 能见度（km） |
| cloud | string | 云量（%），可能为空 |
| uvIndex | string | 紫外线指数 |

> 有日出日落、月相、紫外线，比彩云的天级预报丰富得多。

### 3.4 分钟级降水 `/v7/minutely/5m`

| 参数 | 必选 | 说明 |
|------|------|------|
| location | ✅ | **仅支持经纬度坐标**（经纬度，最多两位小数）。**不支持 LocationID** |

**返回字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| summary | string | 降水描述文案（如"95分钟后雨就停了"） |
| minutely[].fxTime | string | 预报时间 |
| minutely[].precip | string | 5分钟累计降水量（mm） |
| minutely[].type | string | `rain` 或 `snow` |

> 与彩云分钟级降水对比：和风只有未来 2 小时每 5 分钟，彩云也类似。和风多了 `type` 区分雨/雪，彩云多了 `probability`。两者互补。

### 3.5 天气预警 `/weatheralert/v1/current/{lat}/{lon}`

**端点路径与其他 API 不同**，不在 `/v7/` 下。

| 参数 | 必选 | 说明 |
|------|------|------|
| latitude / longitude | ✅ | 路径参数，最多两位小数 |
| localTime | | `true`=本地时间，`false`=UTC（默认） |

**返回关键字段**：

| 字段 | 说明 |
|------|------|
| alerts[].id | 预警唯一标识 |
| alerts[].senderName | 发布机构 |
| alerts[].eventType.name / .code | 事件类型（台风/暴雨/大风等） |
| alerts[].severity | 严重程度：`minor` / `moderate` / `severe` / `extreme` |
| alerts[].urgency | 紧迫程度（可能为空） |
| alerts[].certainty | 确定性（可能为空） |
| alerts[].color.code | 预警颜色：`blue` / `yellow` / `orange` / `red` |
| alerts[].color.red/green/blue/alpha | RGBA 精确颜色值 |
| alerts[].effectiveTime / onsetTime / expireTime | 生效/开始/失效时间 |
| alerts[].headline | 预警标题 |
| alerts[].description | 详细描述 |
| alerts[].criteria | 触发标准 |
| alerts[].instruction | 防御指南 |
| alerts[].messageType.code | `new` / `update` / `cancel` |

> 这是最完整的预警 API，含颜色、防御指南、严重程度。比彩云的预警信息更结构化。

### 3.6 天气生活指数 `/v7/indices/1d`（或 `3d`）

| 参数 | 说明 |
|------|------|
| location | LocationID 或经纬度 |
| type | 指数类型：`0`=全部（不能和其他指数同时请求），`1`=运动，`2`=洗车，`3`=穿衣，`4`=钓鱼，`5`=紫外线，`6`=旅游，`7`=花粉过敏，`8`=舒适度，`9`=感冒，`10`=空气污染扩散，`11`=空调开启，`12`=太阳镜，`13`=化妆，`14`=晾晒，`15`=交通，`16`=防晒 |

**指数类型与等级**：

| 指数 | 等级范围 | 说明 |
|------|---------|------|
| 穿衣 | 1(寒冷)-7(炎热) | 用户最常用 |
| 紫外线 | 1(最弱)-5(很强) | |
| 舒适度 | 1(舒适)-7(非常不舒适) | |
| 感冒 | 1(少发)-4(极易发) | |
| 洗车 | 1(适宜)-4(不宜) | |
| 运动 | 1(适宜)-3(较不宜) | |

> 16 种指数，但仅中国支持全部。海外仅支持运动、洗车、穿衣、紫外线、钓鱼。

### 3.7 GeoAPI 城市搜索

**城市搜索**：`/v2/city/lookup?location=北京&key=xxx`

返回 LocationID（如 `101010100`），后续天气接口可用此 ID。

**热门城市**：`/v2/city/top?key=xxx`

**POI 搜索**：`/v2/poi/lookup?location=116.41,39.92&type=scenic&key=xxx`

> **关键注意**：免费版 GeoAPI 也消耗调用次数。建议首次查询后缓存 LocationID。

---

## 4. 天气图标代码

和风使用 3 位数字代码，白天/夜晚有不同代码：

### 主要代码映射

| 代码 | 天气 | 昼夜支持 |
|------|------|---------|
| 100 | 晴 | 仅白天 |
| 101 | 多云 | 仅白天 |
| 102 | 少云 | 仅白天 |
| 103 | 晴间多云 | 仅白天 |
| 104 | 阴 | 全天 |
| 150 | 晴（夜） | 仅夜间 |
| 151 | 多云（夜） | 仅夜间 |
| 152 | 少云（夜） | 仅夜间 |
| 153 | 晴间多云（夜） | 仅夜间 |
| 300-318 | 阵雨/雷阵雨 | 部分仅白天 |
| 350-351 | 阵雨/强阵雨（夜） | 仅夜间 |
| 399 | 雨 | 全天 |
| 400-410 | 雪类 | 全天/部分仅白天 |
| 456-457 | 阵雨夹雪/阵雪（夜） | 仅夜间 |
| 499 | 雪 | 全天 |
| 500-515 | 雾/霾/沙尘 | 全天 |
| 900 | 热 | 全天 |
| 901 | 冷 | 全天 |
| 999 | 未知 | 全天 |

> ⚠️ 文档明确警告："图标代码会不断更新，必须适配变化"。

---

## 5. 错误码体系

### v2（新，HTTP Status Code 对应）

| HTTP 状态 | 错误类型 | 说明 |
|-----------|---------|------|
| 400 | INVALID PARAMETER | 参数错误 |
| 400 | MISSING PARAMETER | 缺少必选参数 |
| 400 | NO SUCH LOCATION | 不支持的位置 |
| 400 | DATA NOT AVAILABLE | 数据暂不可用 |
| 401 | AUTHENTICATION FAILED | 认证失败 |
| 403 | NO CREDIT | 额度不足 |
| 403 | OVERDUE | 有逾期账单 |
| 403 | SECURITY RESTRICTION | 违反请求限制 |
| 403 | INVALID HOST | 错误的 API Host |
| 403 | ACCOUNT SUSPENSION | 账号冻结 |
| 404 | NOT FOUND | 资源不存在 |
| 405 | METHOD NOT ALLOWED | 非 GET 方法 |
| 429 | TOO MANY REQUESTS | 超 QPM |
| 429 | OVER MONTHLY LIMIT | 超月限额 |
| 500 | UNKNOWN ERROR | 服务端故障 |

响应格式（v2）：`application/problem+json`，含 `error.type`（URL 标识）、`error.invalidParams`（具体错误参数）。

### v1（code 字段，HTTP 200）

简单数字码：`200`=成功, `204`=无数据, `400`=参数错误, `401`=认证失败, `402`=超次数, `403`=无权限, `404`=不存在, `429`=超QPM, `500`=服务异常。

> 目前两套共存，需要兼容处理。

---

## 6. 风向 / 风速 / 风级

### 风向
- **国际**：16 方位（N, NNE, NE, ENE, E, ...）
- **中国城市**：8 方位 + 特殊值（旋转风=-999，无持续风向=-1）
- 语言=中文时返回中文方位名，否则返回方位代码

### 风力等级（蒲福风级）
- 0-12 标准级，13-17 扩展级（热带气旋）
- `windScale` 字符串，如 `"3-4"` 表示 3-4 级风
- 公式：V = 0.836 × B^(3/2)（m/s）

### 风速
- 单位：公里/小时
- 地面 10 米高度风速

---

## 7. 格点天气（Grid Weather）

独立的 API 族，基于数值模式，分辨率 3-5km：

| 端点 | 说明 |
|------|------|
| 格点实时天气 | 任意坐标实时天气 |
| 格点逐天预报 | 1-7 天 |
| 格点逐小时预报 | 1-72 小时 |

> 路径不同于城市预报，免费版有额外限制。目前不是必须接入的。

---

## 8. 空气质量 API (⚠️ 之前遗漏，已修正)

路径：`/docs/api/air-quality/`

### 8.1 实时空气质量 `/v7/air/current`

精度 1×1km，覆盖全球100+国家。返回 AQI、污染物浓度（PM2.5/PM10/SO2/NO2/O3/CO）、分指数、健康建议。

### 8.2 空气质量小时预报 `/v7/air/hourly`

未来 24 小时逐小时 AQI + 污染物浓度。

### 8.3 空气质量每日预报 `/v7/air/daily`

未来 3 天 AQI 预报 + 污染物浓度值。

### 8.4 监测站数据 `/v7/air/station`

各国监测站污染物浓度原始值。

> 和风空气质量 API 有独立端点，不是仅靠生活指数。

---

## 9. 和风 vs 彩云 对比总结（修正版）

| 维度 | 和风天气 | 彩云天气 |
|------|---------|---------|
| 免费额度 | 1000次/天 | 1000次/天 |
| QPM | 3000/分钟 | 8（免费）/ 100（付费） |
| 认证方式 | JWT(新)/API Key(旧) | API Token |
| 实时天气 | ✅ 15字段 | ✅ 含 AQI |
| 逐小时 | 24/72/168h | 48h |
| 逐天 | 3/7/10/15/30d | 15d |
| 分钟降水 | ✅ 2h/5min | ✅ 2h/min |
| 天气预警 | ✅ 完整（含防御指南） | ✅ |
| 生活指数 | ✅ 16种 | ❌ |
| 日出日落 | ✅ | ❌ |
| 月相 | ✅ | ❌ |
| 空气质量 | ✅ 实况/预报/监测站 | ✅ 实况AQI |
| 历史天气 | ✅ 时光机(10天) | ❌ |
| 台风 | ✅ | ❌ |
| 数值类型 | **全部 string** | 混合 number/string |
| 图标体系 | 100-999 (3位) | 自己的图标名 |
| LocationID | ✅ 有 | ❌ 仅经纬度 |
| Gzip | ✅ 默认 | — |

---

## 10. 缓存建议（官方推荐）

| 数据类型 | 推荐缓存时间 | 和风更新频率 |
|---------|------------|-----------|
| 实时天气 | 10-30 分钟 | 5-10 分钟 |
| 逐小时预报 | 30-60 分钟 | 60 分钟 |
| 逐天预报 | 1-6 小时 | 60 分钟 |
| 天气预警 | 5-20 分钟 | 3 分钟 |
| 天气指数 | 6-12 小时 | 60 分钟 |
| 分钟降水 | 5-10 分钟 | 5 分钟 |
| 实时空气质量 | 30-60 分钟 | 30-60 分钟 |
| 空气质量逐天预报 | 8-12 小时 | 1-6 小时 |
| 台风（活跃期） | 20 分钟 | 10-60 分钟 |

⚠️ 缓存规则：
1. 跨小时/跨天必须刷新，否则数据变成前一天/少一天
2. 官方推荐的最长时间是更新频率的 2-3 倍
3. 应用内应提供「清除缓存」功能，方便应急
4. **GeoAPI 数据严禁缓存/批量存储**（违反许可协议，可能面临法律风险）

---

## 11. 其他 API 族（未在核心计划内，但可用）

| API 族 | 文档路径 | 主要功能 |
|--------|---------|---------|
| 时光机 | `/docs/api/time-machine/` | 最近 10 天历史天气/AQI 再分析数据 |
| 热带气旋(台风) | `/docs/api/tropical-cyclone/` | 台风列表、路径、预报（中国） |
| 海洋数据 | `/docs/api/ocean/` | 潮汐预报 1-10 天（全球） |
| 太阳辐射 | `/docs/api/solar-radiation/` | DNI/DHI/GHI + 气象数据，15min 间隔，1km |
| 天文 | `/docs/api/astronomy/` | 日出日落/月升月落/月相，未来 60 天 |
| 控制台 API | `/docs/api/console/` | 账户财务/用量统计（仅供账户所有者） |

---

## 12. 数据更新频率总览

来源：`/docs/features/service-and-data/`

| 数据项目 | 更新频率 | 时间范围 | 覆盖 |
|---------|--------|--------|------|
| 实况天气 | 15 分钟 | 实时 | 全球 |
| 逐天预报 | 8 小时 | 1-30 天 | 全球 |
| 逐小时预报 | 1 小时 | 1-168 小时 | 全球 |
| 分钟级降水 | 5 分钟 | 1-2 小时 | 中国 |
| 实时空气质量 | 1 小时 | 实时 | 全球 |
| 空气质量小时预报 | 1 小时 | 1-72 小时 | 全球 |
| 空气质量每日预报 | 1 小时 | 1-7 天 | 全球 |
| 灾害预警 | 5 分钟 | 实时 | 全球 |
| 台风（活跃期） | 1 小时 | 365 天 | 中国 |

---

## 13. 融合引擎建议

### 各源角色分配（更新）

| 源 | 角色 | 提供数据 |
|----|------|---------|
| **和风天气** | 🥇 主力 | 实时/24h/Daily/预警/生活指数/分钟降水/**空气质量** |
| **Open-Meteo** | 🥈 校验 | 实时/Daily/Hourly（免费，无Key） |
| **彩云天气** | 🥉 降水专家 | 分钟级降水+概率/短临预报 |
| **高德地图** | 兜底 | 基础天气+地理编码（30万次/天，很宽广） |

### 关键融合点

1. **温度**：和风(主力) + Open-Meteo(校验偏差 > 3℃ 标记)
2. **降水概率**：和风 `pop` + 彩云分钟级 `probability`
3. **AQI**：和风优先（空气质量 API 独立端点），彩云补充
4. **预警**：和风优先（含防御指南），彩云补充
5. **生活指数**：仅和风有（16种），独占比
6. **数值类型**：和风全部 string 需 parseFloat()，彩云混合类型

---

## 14. 数据陷阱

1. **string 类型**：和风所有数值字段返回 string，前端适配器必须转换
2. **cloud/dew 可为空**：需判空处理
3. **图标代码会变**：不能硬编码映射表，需设计可更新的图标映射
4. **两套错误码并存**：v1 返回 HTTP 200 + code 字段；v2 返回真实 HTTP Status Code
5. **分钟降水仅支持经纬度**：不支持 LocationID
6. **高纬度日出日落可为空**：像漠河冬天极夜时无日出
7. **中国城市风向仅8方位**：海外城市16方位
8. **免费版 API Host 不同**：`devapi.qweather.com` vs `api.qweather.com`
9. **Gzip 必解压**：默认压缩，否则响应为乱码
10. **GeoAPI 数据禁止缓存/批量存储**：法律风险
