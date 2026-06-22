# 彩云天气 API 参考文档（免费版）

> 整理时间: 2026-06-20  
> 数据来源: https://docs.caiyunapp.com  
> API 版本: v2.6（常规天气）+ v3（模式预报）+ v1（可视化）

---

## 目录

1. [API 概览](#1-api-概览)
2. [认证与鉴权](#2-认证与鉴权)
3. [实况数据 Realtime](#3-实况数据-realtime)
4. [分钟级降水 Minutely](#4-分钟级降水-minutely)
5. [小时级预报 Hourly](#5-小时级预报-hourly)
6. [天级预报 Daily](#6-天级预报-daily)
7. [预警数据 Alert](#7-预警数据-alert)
8. [综合接口](#8-综合接口)
9. [天气现象代码 Skycon](#9-天气现象代码-skycon)
10. [降水强度阈值](#10-降水强度阈值)
11. [生活指数](#11-生活指数)
12. [模式预报 v3（企业版）](#12-模式预报-v3企业版)
13. [可视化图层 v1（企业版）](#13-可视化图层-v1企业版)
14. [错误码](#14-错误码)

---

## 1. API 概览

| 数据类型 | 更新频率 | 空间分辨率 | 时间范围 |
|----------|---------|-----------|---------|
| 实况数据 | 1 分钟 | 1km×1km | 当前 |
| 分钟级降水 | 1 分钟 | 1km×1km | 未来 2 小时 |
| 逐小时数据 | 15 分钟 | 5km×5km | 未来 15 天 |
| 逐日数据 | 2 小时 | 12km×12km | 未来 15 天 |
| 空气质量 | 1 小时 | — | 未来 15 天 |
| 预警信息 | 中央气象台同步 | 行政区划 | 按发布 |

**数据覆盖**: 常规预报支持全球；分钟级预报覆盖中国+欧洲+大洋洲+亚洲+北美+南美多国；雾霾实况限中国大陆/印度/日本/美国。

**Base URL**: `https://api.caiyunapp.com/v2.6/{token}/{lng},{lat}/{endpoint}`

---

## 2. 认证与鉴权

- 所有接口需要 API Token，通过 URL 路径传递
- 免费额度有限，付费套餐联系彩云商务
- 速率限制见计费文档
- 支持 `lang=zh_CN`（简中）/ `en`（英文）
- 默认 `unit=metric`；可 `unit=metric:v2` 切换降水强度→降水量

---

## 3. 实况数据 Realtime

```
GET /v2.6/{token}/{lng},{lat}/realtime
```

### 响应字段

| 路径 | 说明 | 单位 |
|------|------|------|
| `realtime.temperature` | 地表 2 米气温 | ℃ |
| `realtime.apparent_temperature` | 体感温度 | ℃ |
| `realtime.pressure` | 地面气压 | Pa |
| `realtime.humidity` | 地表 2 米相对湿度 | 0-1 |
| `realtime.cloudrate` | 总云量 | 0-1 |
| `realtime.skycon` | 天气现象 | 见 [Skycon 表](#9-天气现象代码-skycon) |
| `realtime.visibility` | 地表水平能见度 | km |
| `realtime.dswrf` | 向下短波辐射通量 | W/m² |
| `realtime.wind.speed` | 地表 10 米风速 | m/s |
| `realtime.wind.direction` | 地表 10 米风向 | 0-360° |
| `realtime.precipitation.local.intensity` | 本地降水强度 | 见 [强度表](#10-降水强度阈值) |
| `realtime.precipitation.local.datasource` | 数据源 | radar |
| `realtime.precipitation.nearest.distance` | 最近降水带距离 | m |
| `realtime.precipitation.nearest.intensity` | 最近降水带强度 | — |
| `realtime.air_quality.pm25` | PM2.5 | μg/m³ |
| `realtime.air_quality.pm10` | PM10 | μg/m³ |
| `realtime.air_quality.o3` | 臭氧 | μg/m³ |
| `realtime.air_quality.so2` | 二氧化硫 | μg/m³ |
| `realtime.air_quality.no2` | 二氧化氮 | μg/m³ |
| `realtime.air_quality.co` | 一氧化碳 | mg/m³ |
| `realtime.air_quality.aqi.chn` | 国标 AQI | — |
| `realtime.air_quality.aqi.usa` | 美标 AQI | — |
| `realtime.air_quality.description.chn` | 国标空气质量描述 | 如 "良" |
| `realtime.life_index.ultraviolet.index` | 紫外线指数 | 0-11 |
| `realtime.life_index.ultraviolet.desc` | 紫外线描述 | 见 [生活指数](#11-生活指数) |
| `realtime.life_index.comfort.index` | 舒适度指数 | 0-13 |
| `realtime.life_index.comfort.desc` | 舒适度描述 | 见 [生活指数](#11-生活指数) |

---

## 4. 分钟级降水 Minutely

```
GET /v2.6/{token}/{lng},{lat}/minutely
```

> ⚠️ 增值服务，仅企业套餐可用

### 响应字段

| 路径 | 说明 |
|------|------|
| `minutely.status` | 预报状态 |
| `minutely.datasource` | 数据源（radar） |
| `minutely.precipitation_2h` | 未来 2 小时每分钟雷达降水强度（120 个值） |
| `minutely.precipitation` | 未来 1 小时每分钟雷达降水强度（60 个值） |
| `minutely.probability` | 未来 2 小时每半小时降水概率（4 个值，0-1） |
| `minutely.description` | 预报自然语言描述 |
| `forecast_keypoint` | 近 2 小时关键天气变化 |

---

## 5. 小时级预报 Hourly

```
GET /v2.6/{token}/{lng},{lat}/hourly?hourlysteps={1-360}
```

- `hourlysteps`: 返回小时数，范围 [1, 360]，默认 48

### 响应字段（均为时序数组，每项含 datetime + value）

| 路径 | 说明 | 单位 |
|------|------|------|
| `hourly.temperature[].value` | 气温 | ℃ |
| `hourly.apparent_temperature[].value` | 体感温度 | ℃ |
| `hourly.pressure[].value` | 气压 | Pa |
| `hourly.humidity[].value` | 湿度 | 0-1 |
| `hourly.cloudrate[].value` | 云量 | 0-1 |
| `hourly.skycon[].value` | 天气现象 | 代码 |
| `hourly.visibility[].value` | 能见度 | km |
| `hourly.dswrf[].value` | 短波辐射 | W/m² |
| `hourly.wind[].speed` | 风速 | m/s |
| `hourly.wind[].direction` | 风向 | 0-360° |
| `hourly.precipitation[].value` | 降水量 | — |
| `hourly.precipitation[].probability` | 降水概率 | % (0-100) |
| `hourly.air_quality.aqi[].value.chn` | 国标 AQI | — |
| `hourly.air_quality.aqi[].value.usa` | 美标 AQI | — |
| `hourly.air_quality.pm25[].value` | PM2.5 | μg/m³ |
| `hourly.description` | 未来 24h 自然语言描述 | — |

---

## 6. 天级预报 Daily

```
GET /v2.6/{token}/{lng},{lat}/daily?dailysteps={1-15}
```

- `dailysteps`: 返回天数 [1, 15]

### 响应字段

全天 / 白天(08-20h) / 夜晚(20-次日08h) 三个时段，`xxx` / `xxx_08h_20h` / `xxx_20h_32h`：

| 路径 | 说明 | 值类型 |
|------|------|--------|
| `daily.temperature[*].max/min/avg` | 气温 | ℃ |
| `daily.pressure[*].max/min/avg` | 气压 | Pa |
| `daily.humidity[*].max/min/avg` | 湿度 | 0-1 |
| `daily.cloudrate[*].max/min/avg` | 云量 | 0-1 |
| `daily.visibility[*].max/min/avg` | 能见度 | km |
| `daily.dswrf[*].max/min/avg` | 短波辐射 | W/m² |
| `daily.wind[*].max/min/avg.{speed,direction}` | 风速风向 | m/s, ° |
| `daily.precipitation[*].max/min/avg/probability` | 降水 | — |
| `daily.skycon[*].value` | 全天主要天气现象 | 代码 |
| `daily.skycon_08h_20h[*].value` | 白天天气 | 代码 |
| `daily.skycon_20h_32h[*].value` | 夜晚天气 | 代码 |
| `daily.astro[*].sunrise.time` | 日出 | HH:MM（当地时区） |
| `daily.astro[*].sunset.time` | 日落 | HH:MM |
| `daily.air_quality.aqi[*].max/min/avg.{chn,usa}` | AQI | — |
| `daily.air_quality.pm25[*].max/min/avg` | PM2.5 | μg/m³ |

### 生活指数（天级别特有）

| 路径 | 说明 |
|------|------|
| `daily.life_index.ultraviolet[*].index` | 紫外线 1-5 |
| `daily.life_index.ultraviolet[*].desc` | "最弱"~"很强" |
| `daily.life_index.carWashing[*].index` | 洗车 1-4 |
| `daily.life_index.carWashing[*].desc` | "适宜"~"不适应" |
| `daily.life_index.dressing[*].index` | 穿衣 0-8 |
| `daily.life_index.dressing[*].desc` | "极热"~"极冷" |
| `daily.life_index.comfort[*].index` | 舒适度 0-13 |
| `daily.life_index.comfort[*].desc` | 见 [生活指数表](#11-生活指数) |
| `daily.life_index.coldRisk[*].index` | 感冒 1-4 |
| `daily.life_index.coldRisk[*].desc` | "少发"~"极易发" |

---

## 7. 预警数据 Alert

可在任意天气接口追加 `?alert=true` 获取，也可独立调用 v3 预警 API。

### 字段

| 路径 | 说明 |
|------|------|
| `alert.content[].province` | 省份 |
| `alert.content[].city` | 城市 |
| `alert.content[].county` | 县区 |
| `alert.content[].title` | 标题，如 "海淀区气象台发布大风蓝色预警[IV/一般]" |
| `alert.content[].description` | 预警描述正文 |
| `alert.content[].code` | 预警代码（前2位类型+后2位级别） |
| `alert.content[].status` | "预警中" 等 |
| `alert.content[].pubtimestamp` | 发布时间 Unix 戳 |
| `alert.content[].alertId` | 预警唯一 ID |
| `alert.content[].source` | "国家预警信息发布中心" |
| `alert.content[].adcode` | 行政区划代码 |
| `alert.adcodes[]` | 行政区划层级信息 |

### 预警类型编码

| 类型 | 编码 | 类型 | 编码 |
|------|------|------|------|
| 台风 | 01 | 暴雨 | 02 |
| 暴雪 | 03 | 寒潮 | 04 |
| 大风 | 05 | 沙尘暴 | 06 |
| 高温 | 07 | 干旱 | 08 |
| 雷电 | 09 | 冰雹 | 10 |
| 霜冻 | 11 | 大雾 | 12 |
| 霾 | 13 | 道路结冰 | 14 |
| 森林火险 | 15 | 雷雨大风 | 16 |
| 沙尘趋势预警 | 17 | 沙尘 | 18 |

### 预警级别编码

| 级别 | 编码 |
|------|------|
| 白色 | 00 |
| 蓝色 | 01 |
| 黄色 | 02 |
| 橙色 | 03 |
| 红色 | 04 |

---

## 8. 综合接口

```
GET /v2.6/{token}/{lng},{lat}/weather?alert=true&dailysteps=1&hourlysteps=24
```

打包返回 `realtime` + `minutely` + `hourly` + `daily` + `alert`。

### 关键区分

| 字段 | 含义 |
|------|------|
| `result.hourly.description` | 未来 24 小时天气变化描述 |
| `result.forecast_keypoint` | 短期（未来 2 小时）关键天气提示，用于 UI 突出显示 |
| `result.primary` | 主要数据源标识 |

---

## 9. 天气现象代码 Skycon

**优先级规则**: 降雪 > 降雨 > 雾 > 沙尘 > 浮尘 > 雾霾 > 大风 > 阴 > 多云 > 晴

| 代码 | 说明 | 判定条件 |
|------|------|----------|
| `CLEAR_DAY` | 晴（白天） | cloudrate < 0.2 |
| `CLEAR_NIGHT` | 晴（夜间） | cloudrate < 0.2 |
| `PARTLY_CLOUDY_DAY` | 多云（白天） | 0.2 < cloudrate ≤ 0.8 |
| `PARTLY_CLOUDY_NIGHT` | 多云（夜间） | 0.2 < cloudrate ≤ 0.8 |
| `CLOUDY` | 阴 | cloudrate > 0.8 |
| `LIGHT_HAZE` | 轻度雾霾 | PM2.5 100~150 |
| `MODERATE_HAZE` | 中度雾霾 | PM2.5 150~200 |
| `HEAVY_HAZE` | 重度雾霾 | PM2.5 > 200 |
| `LIGHT_RAIN` | 小雨 | 见降水强度表 |
| `MODERATE_RAIN` | 中雨 | 见降水强度表 |
| `HEAVY_RAIN` | 大雨 | 见降水强度表 |
| `STORM_RAIN` | 暴雨 | 见降水强度表 |
| `FOG` | 雾 | 能见度低+湿度高+风速低+温度低 |
| `LIGHT_SNOW` | 小雪 | 见降水强度表 |
| `MODERATE_SNOW` | 中雪 | 见降水强度表 |
| `HEAVY_SNOW` | 大雪 | 见降水强度表 |
| `STORM_SNOW` | 暴雪 | 见降水强度表 |
| `DUST` | 浮尘 | AQI>150, PM10>150, 湿度<30%, 风速<6m/s |
| `SAND` | 沙尘 | AQI>150, PM10>150, 湿度<30%, 风速>6m/s |
| `WIND` | 大风 | — |

---

## 10. 降水强度阈值

API 默认返回**雷达降水强度**。加 `unit=metric:v2` 可切换为降水量。

| 天气现象 | 雷达降水强度 | 逐小时降水量 (mm/h) | 分钟降水量 (mm/min) |
|----------|-------------|-------------------|-------------------|
| 无雨/雪 | < 0.031 | < 0.0606 | < 0.08 |
| 小雨/雪 | 0.031~0.25 | 0.0606~0.8989 | 0.08~3.44 |
| 中雨/雪 | 0.25~0.35 | 0.8989~2.87 | 3.44~11.33 |
| 大雨/雪 | 0.35~0.48 | 2.87~12.86 | 11.33~51.30 |
| 暴雨/雪 | ≥ 0.48 | ≥ 12.86 | ≥ 51.30 |

- 雨雪相态通过 SKYCON 判断（RAIN 雨，SNOW 雪）
- 逐日判断用 `avg降水 × 2` 再按逐小时阈值判定

---

## 11. 生活指数

### 紫外线 ultraviolet

**实况级（0-11）**: 0=无, 1-2=很弱, 3-4=弱, 5-6=中等, 7-9=强, 10=很强, 11=极强  
**天级（1-5）**: 1=最弱, 2=弱, 3=中等, 4=强, 5=很强

### 穿衣 dressing

| 等级 | 描述 | 等级 | 描述 |
|------|------|------|------|
| 0 | 极热 | 1 | 极热 |
| 2 | 很热 | 3 | 热 |
| 4 | 温暖 | 5 | 凉爽 |
| 6 | 冷 | 7 | 寒冷 |
| 8 | 极冷 | | |

### 舒适度 comfort

| 等级 | 描述 | 等级 | 描述 |
|------|------|------|------|
| 0 | 闷热 | 1 | 酷热 |
| 2 | 很热 | 3 | 热 |
| 4 | 温暖 | 5 | 舒适 |
| 6 | 凉爽 | 7 | 冷 |
| 8 | 很冷 | 9 | 寒冷 |
| 10 | 极冷 | 11 | 刺骨的冷 |
| 12 | 湿冷 | 13 | 干冷 |

### 感冒 coldRisk

| 等级 | 描述 |
|------|------|
| 1 | 少发 |
| 2 | 较易发 |
| 3 | 易发 |
| 4 | 极易发 |

### 洗车 carWashing

| 等级 | 描述 |
|------|------|
| 1 | 适宜 |
| 2 | 较适宜 |
| 3 | 较不适宜 |
| 4 | 不适应 |

---

## 12. 模式预报 v3（企业版）

> ⚠️ 增值服务，仅企业套餐可用  
> 端点: `https://singer.caiyunhub.com/v3/nwc/china/nc?token={token}`

### 覆盖
- 范围: 15-55°N, 70-150°E
- 空间分辨率: 2km
- 时间: 每日 UTC 00:00 / 12:00 起报，未来 72h 逐小时
- 支持全量 NC 文件和单变量 NC 下载

### 支持变量

| 变量 | 说明 | 单位 |
|------|------|------|
| `vis_0m` | 地表能见度 | km |
| `sp_0m` | 海平面气压 | hPa |
| `st_0m` | 地表温度 | ℃ |
| `t_2m` | 近地面 2m 气温 | ℃ |
| `td_2m` | 近地面 2m 露点温度 | ℃ |
| `rh_2m` | 近地面 2m 相对湿度 | % |
| `wd_10m` | 10m 风向 | 0-360° |
| `ws_10m` | 10m 风速 | m/s |
| `rain_0m` | 地面降水量 | mm |
| `cape_0m` | 对流有效位能 | — |
| `tcc_0m` | 总云量 | % |

---

## 13. 可视化图层 v1（企业版）

> ⚠️ 增值服务，仅企业套餐可用  
> 端点: `http://api.caiyunapp.com/v1/radar/images`

### 雷达实况图

```
GET /v1/radar/images?lon={lng}&lat={lat}&level={1|2}&token=TOKEN
```

| 参数 | 说明 |
|------|------|
| `level=1` | 单站雷达，过去 20 帧，4~6 分钟/帧 |
| `level=2` | 拼图（全国），20 帧，5 分钟/帧；加 `world_map=true` 切换新版 |

### 雷达预报图

```
GET /v1/radar/forecast_images?lon={lng}&lat={lat}&level={1|2}&token=TOKEN
```

- 最新实况 1 帧 + 未来 2 小时预报 20 帧，共 25 帧
- level=1: 单站；level=2: 拼图

### 响应格式

```json
{
  "status": "ok",
  "station": "NMIC_AZ9010",
  "images": [
    ["图片URL", 时间戳Unix, [southLat, westLng, northLat, eastLng]],
    ...
  ]
}
```

- 图片边界为 WGS84 经纬度
- 叠加 GCJ-02 底图（高德）需转换四角坐标
- 拼图 level=2 使用 EPSG:3857 / Web Mercator

### 实况栅格图（另行商务联系）

提供降水强度图、可用区域 mask 图、雨雪类型 mask 图，每 5 分钟更新，近 10 帧。

---

## 14. 错误码

| HTTP Status | 含义 |
|-------------|------|
| 200 | 成功 |
| 400 | Token 不存在 |
| 401 | Token 无权限 |
| 422 | 参数错误 |
| 429 | Token 额度已用完 |
| 500 | 服务器错误 |

> ⚠️ 网关层面可能返回 HTML/TXT 格式错误，务必检查 HTTP Status Code。

---

## 附录：快速参考

### 常用请求

```bash
# 实况
curl "https://api.caiyunapp.com/v2.6/{TOKEN}/{lng},{lat}/realtime"

# 综合（含预警+15天逐日+24h逐时）
curl "https://api.caiyunapp.com/v2.6/{TOKEN}/{lng},{lat}/weather?alert=true&dailysteps=15&hourlysteps=48"

# 降水量模式（代替默认雷达强度）
curl "https://api.caiyunapp.com/v2.6/{TOKEN}/{lng},{lat}/weather?unit=metric:v2"
```

### 关键设计要点（用于天气 APP 集成）

1. **免费可用**: 实况、小时级、天级、预警（综合接口打包）
2. **付费不可用**: 分钟级降水、模式预报数据、雷达可视化图层
3. **skycon 优先级**: 降雪>降雨>雾>沙尘>浮尘>雾霾>大风>阴>多云>晴
4. **时段拆分**: 全天 / 08-20白天 / 20-08夜晚
5. **description vs forecast_keypoint**: 前者是长描述，后者是短期突出提示
6. **预警 code 解析**: 前两位=类型，后两位=级别（如 0901 = 雷电+蓝色）
