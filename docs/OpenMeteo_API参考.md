# Open-Meteo API 参考 — 免费天气数据开源标准

> 调研时间：2026-06-20 22:28  
> 官方文档：https://open-meteo.com/en/docs  
> API Host：`api.open-meteo.com`  
> 数据许可：CC BY 4.0（免费非商业），商业需订阅

---

## 1. 定价与配额

| 层级 | 月调用 | 日限制 | 小时限制 | 分钟限制 | 商业使用 |
|------|--------|--------|---------|---------|---------|
| **免费** | 300,000 | 10,000 | 5,000 | 600 | ❌ |
| Standard | 1,000,000 | 无限 | 无限 | 无限 | ✅ |
| Professional | 5,000,000 | 无限 | 无限 | 无限 | ✅ |
| Enterprise | 50,000,000+ | 无限 | 无限 | 无限 | ✅ |

- 免费层已足够个人天气 APP 使用（≈333次/天）
- 无需 API Key（免费），无需注册
- 商业 API 需 `customer-api.open-meteo.com` + API Key
- CORS 支持，浏览器直连无需代理
- 支付：信用卡/Apple Pay/Google Pay，通过 Stripe

---

## 2. 主预报 API `/v1/forecast`

### 2.1 端点与参数

```
https://api.open-meteo.com/v1/forecast?latitude=43.88&longitude=125.39&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=Asia/Shanghai&forecast_days=7
```

| 参数 | 必填 | 说明 |
|------|------|------|
| latitude, longitude | ✅ | WGS84 坐标（支持多组，逗号分隔） |
| current | 可选 | 当前实况变量列表 |
| hourly | 可选 | 逐小时变量列表 |
| daily | 可选 | 逐天变量列表 |
| timezone | 可选 | 时区（如 `Asia/Shanghai`，默认 GMT） |
| forecast_days | 可选 | 预报天数 0-16（默认 7） |
| past_days | 可选 | 历史天数 0-92 |
| forecast_hours | 可选 | 逐小时间隔数 |
| start_date / end_date | 可选 | 日期范围 yyyy-mm-dd |
| models | 可选 | 指定模型（默认 best_match 自动选） |
| cell_selection | 可选 | `land`/`sea`/`nearest` 网格匹配策略 |
| temperature_unit | 可选 | `celsius`(默认) / `fahrenheit` |
| wind_speed_unit | 可选 | `kmh`/`ms`/`mph`/`kn` |
| precipitation_unit | 可选 | `mm`(默认) / `inch` |

### 2.2 实况变量 (current)

| 变量 | 单位 | 说明 |
|------|------|------|
| temperature_2m | °C | 2米气温 |
| relative_humidity_2m | % | 2米相对湿度 |
| apparent_temperature | °C | 体感温度（风冷+湿度+太阳辐射） |
| dew_point_2m | °C | 露点温度 |
| pressure_msl | hPa | 海平面气压 |
| surface_pressure | hPa | 地表气压 |
| cloud_cover | % | 总云量 |
| wind_speed_10m | km/h | 10米风速 |
| wind_direction_10m | ° | 10米风向 |
| wind_gusts_10m | km/h | 10米阵风 |
| precipitation | mm | 前1小时降水量 |
| rain | mm | 前1小时降雨量 |
| showers | mm | 前1小时对流降水 |
| snowfall | cm | 前1小时降雪量 |
| weather_code | WMO码 | 天气现象码 |
| snow_depth | m | 积雪深度 |
| is_day | 0/1 | 是否白天 |
| shortwave_radiation | W/m² | 短波太阳辐射 |
| visibility | m | 能见度 |

**体感温度公式**：综合风冷系数 + 湿度 + 太阳辐射（比单纯温度更贴近真实感受）

### 2.3 逐小时变量 (hourly)

同上所有 instantaneous 变量 + 以下专有：

| 变量 | 说明 |
|------|------|
| precipitation_probability | 降水概率（>0.1mm，基于30次集合模拟） |
| evapotranspiration | 蒸散量（mm） |
| et0_fao_evapotranspiration | FAO参考蒸散量 |
| vapour_pressure_deficit | 饱和水汽压差 (kPa) |
| cape | 对流有效位能 (J/kg) |
| freezing_level_height | 0°C层高度 (m) |
| soil_temperature_0cm~54cm | 不同深度土壤温度 |
| soil_moisture_0_to_1cm~27_to_81cm | 不同深度土壤湿度 |
| direct_radiation | 直接太阳辐射 |
| diffuse_radiation | 散射太阳辐射 |
| global_tilted_irradiance | 倾斜面总辐射（需指定 tilt/azimuth） |

### 2.4 逐天变量 (daily)

| 变量 | 说明 |
|------|------|
| temperature_2m_max / _min | 日最高/最低温 |
| apparent_temperature_max / _min | 体感温度极值 |
| precipitation_sum | 日总降水量 |
| rain_sum / showers_sum / snowfall_sum | 分类降水 |
| precipitation_probability_max | 日最大降水概率 |
| precipitation_hours | 降水时数 |
| wind_speed_10m_max / wind_gusts_10m_max | 风极值 |
| wind_direction_10m_dominant | 主导风向 |
| shortwave_radiation_sum | 日总辐射 |
| sunrise / sunset | 日出日落时间 |
| sunshine_duration | 日照时数(秒) |
| daylight_duration | 白昼长度(秒) |
| uv_index_max | 最大UV指数 |
| weather_code | WMO天气码 |

### 2.5 WMO 天气码对照表（核心码）

| 码 | 描述 | 中文 |
|----|------|------|
| 0 | Clear sky | 晴 |
| 1 | Mainly clear | 少云 |
| 2 | Partly cloudy | 多云 |
| 3 | Overcast | 阴 |
| 45 | Fog | 雾 |
| 48 | Depositing rime fog | 雾凇 |
| 51 | Light drizzle | 毛毛雨 |
| 53 | Moderate drizzle | 中毛毛雨 |
| 55 | Dense drizzle | 浓毛毛雨 |
| 61 | Slight rain | 小雨 |
| 63 | Moderate rain | 中雨 |
| 65 | Heavy rain | 大雨 |
| 71 | Slight snow fall | 小雪 |
| 73 | Moderate snow fall | 中雪 |
| 75 | Heavy snow fall | 大雪 |
| 77 | Snow grains | 米雪 |
| 80 | Slight rain showers | 小阵雨 |
| 81 | Moderate rain showers | 中阵雨 |
| 82 | Violent rain showers | 强阵雨 |
| 85 | Slight snow showers | 小阵雪 |
| 86 | Heavy snow showers | 大阵雪 |
| 95 | Thunderstorm | 雷暴 |
| 96 | Thunderstorm with slight hail | 雷暴+小冰雹 |
| 99 | Thunderstorm with heavy hail | 雷暴+大冰雹 |

### 2.6 天气模型

**默认 `best_match`**：自动为坐标选择最高分辨率模型

| 模型 | 区域 | 分辨率 | 来源 |
|------|------|--------|------|
| GFS 013 | 全球 | 13km | NOAA |
| GFS HRRR | 北美 | 3km | NOAA |
| ECMWF IFS  | 全球 | 9km（付费） | ECMWF |
| DWD ICON | 全球 | 11km | 德国 |
| JMA GSM | 亚洲 | 20km | 日本 |
| KMA GDPS | 亚洲 | 12km | 韩国 |
| MeteoFrance ARPEGE | 欧洲 | 7km | 法国 |
| UK MO | 全球 | 10km | 英国 |
| CMA GRAPES | **中国** | 9km | 中国气象局 |
| DMI | 欧洲 | 3km | 丹麦 |

**中国区域 best_match 自动选择 CMA GRAPES (9km)** — 对中国用户是独有的高分辨率免费模型。

---

## 3. CMA 中国天气模型 API

端点：`https://api.open-meteo.com/v1/cma`（与 forecast 语法相同）

**独有变量**（相比 global forecast）：
- 多高度风速：10/30/50/70/100/120/140/160/180/200m 共 10 层
- 多高度风向：同上
- 多层土壤温度：0-10/10-40/40-100/100-200cm
- 多层土壤湿度：同上
- CAPE + 抬升指数（大气稳定性指标）
- 日照小时数（WMO标准，直接辐射>120W/m²）
- 直接/散射辐射通过 Razo, Müller Witwer 模型近似（GRAPES 不直接提供）

**中国覆盖**：全球坐标，但best_match对中国坐标会选 GRAPES。
分辨率：9km，逐小时。

---

## 4. 空气质量 API `/v1/air-quality`

端点：`https://air-quality-api.open-meteo.com/v1/air-quality`

**数据源**：
- CAMS Europe：0.1°（~11km），逐小时，4天预报
- CAMS Global：0.4°（~45km），3小时，5天预报
- 默认 `domains=auto` 自动合并在欧洲+CAMS全球

**小时级变量**：

| 变量 | 单位 | 说明 |
|------|------|------|
| pm10, pm2_5 | μg/m³ | 颗粒物 |
| carbon_monoxide | μg/m³ | CO |
| nitrogen_dioxide | μg/m³ | NO₂ |
| sulphur_dioxide | μg/m³ | SO₂ |
| ozone | μg/m³ | O₃ |
| carbon_dioxide | ppm | CO₂（全球温室气体） |
| ammonia | μg/m³ | NH₃（仅欧洲） |
| methane | μg/m³ | CH₄ |
| dust | μg/m³ | 撒哈拉沙尘 |
| aerosol_optical_depth | 无量纲 | 气溶胶光学厚度 |
| uv_index / uv_index_clear_sky | 指数 | UV指数 |

**实况变量**：European AQI、US AQI + 所有小时变量

**花粉（仅欧洲，4天预报）**：Alder/Birch/Grass/Mugwort/Olive/Ragweed

**预报天数**：0-7天（默认5天），历史0-92天

**局限性**：中国无本地AQI模型，使用CAMS全球45km粗分辨率。不如和风/彩云的AQI数据精准。

---

## 5. 季节性预报 API `/v1/seasonal`

端点：`https://seasonal-api.open-meteo.com/v1/seasonal`

- 基于 ECMWF 季节预报系统
- 预报 6-7 个月
- 数据粒度：6小时/日/周/月
- 返回 anomaly（距平值）：与气候平均值的偏差
- 每周/月聚合级别：温度/降水/风/气压/土壤等的 mean + anomaly
- 仅46天内有 wave height/direction/period 等海浪变量

---

## 6. 气候变化 API `/v1/climate`

端点：`https://climate-api.open-meteo.com/v1/climate`

- IPCC CMIP6 HighResMip 项目
- 数据：1950-2050，逐日
- 分辨率：20km 模型降尺度到 10km（ERA5-Land参考）
- 气候模型：CMCC(意大利)/FGOALS(中国)/HiRAM(台湾)/MRI(日本)/EC-Earth(欧洲)/NICAM(日本) 等 7+ 个
- 用途：评估气候变化影响，非实际观测
- 场景：接近 RCP8.5（高排放），2050年前各情景差异不大

---

## 7. 海洋天气 API `/v1/marine`

端点：`https://marine-api.open-meteo.com/v1/marine`

**核心变量**：

| 变量 | 说明 |
|------|------|
| wave_height | 有效波高 |
| wave_direction | 波向 |
| wave_period | 波浪周期 |
| wave_peak_period | 峰值周期 |
| wind_wave_height/direction/period | 风浪 |
| swell_wave_height/direction/period | 涌浪 |
| swell_wave_2nd_height/period/direction | 次级涌浪 |
| swell_wave_3rd_height/period/direction | 第三级涌浪（仅GFS） |
| sea_level_height | 含潮汐海面高度 |
| sea_surface_temperature | 海表温度 SST |
| ocean_current_velocity | 表层流速 |
| ocean_current_direction | 表层流向 |

- 数据源：MeteoFrance MFWAM（波） + SMOC（潮/流/SST），0.08°(~8km)
- 预报天数：0-16天（默认7天）
- ⚠️ 沿海精度有限，不替代航海天文历

---

## 8. 洪水 API `/v1/flood`

端点：`https://flood-api.open-meteo.com/v1/flood`

- 数据库：GloFAS v4（5km） + v3（11km）
- 数据：1984年至今+7个月预报
- 变量：河流流量（均值/中位/最大/最小/25分位/75分位/50个集合成员）
- 预报天数：0-210天（默认92天）
- 支持 ensemble 模式（返回50个集合成员）
- ⚠️ 5km分辨率下最近河流可能不准确，建议微调坐标

---

## 9. 地理编码 API `/v1/search`

端点：`https://geocoding-api.open-meteo.com/v1/search`

| 参数 | 说明 |
|------|------|
| name | 搜索字符串（城市名/邮编） |
| count | 返回数量 1-100（默认10） |
| language | 语言（en/zh...） |
| countryCode | ISO-3166-1 alpha2 国家过滤 |

**返回字段**：
- id, name, latitude, longitude, elevation, timezone
- country_code, country, country_id
- admin1~4（省/市/区/街道 + ID）
- population, postcodes
- feature_code（GeoNames分类）

**支持中文搜索**：`&name=长春&language=zh`

---

## 10. 海拔 API `/v1/elevation`

端点：`https://api.open-meteo.com/v1/elevation`

- 数据源：Copernicus DEM GLO-90（90m分辨率）
- 支持批量：`latitude=52.52,48.85&longitude=13.41,2.35`（最多100个）
- 返回：`{"elevation": [38.0, 25.0]}`

---

## 11. 卫星辐射 API

端点：`https://api.open-meteo.com/v1/satellite-radiation`

- 多颗静止卫星融合：DWD MTG (欧非 2.5km)、EUMETSAT MSG (欧非南美 5km)、JMA Himawari (亚洲 5km)
- **亚洲地区使用 Himawari-9**，10分钟更新，30分钟延迟
- 辐射变量：GHI/DNI/DHI/GTI 及其实时值
- 晴空辐射仅限 DWD MTG
- 支持指定面板倾角(tilt)和方位角(azimuth)计算倾斜辐射

---

## 12. 历史天气 API

端点：`https://archive-api.open-meteo.com/v1/archive`

- ERA5：1940年至今，0.25°(~28km)，逐小时
- ERA5-Land：2001年至今，0.1°(~11km)，逐小时（陆地专用）
- CERRA：欧洲1984年至今，5.5km

---

## 13. 模型更新频率总览

| 模型 | 更新间隔 | 中国可用 | 分辨率 |
|------|---------|---------|--------|
| GFS | 1h | ✅ | 13km |
| ECMWF IFS | 6h | ✅（付费） | 9km |
| DWD ICON | 3h | ✅ | 11km |
| CMA GRAPES | 6h | ✅ **专用** | 9km |
| JMA GSM | 6h | ✅ | 20km |
| KMA GDPS | 6h | ✅ | 12km |

> Open-Meteo 采用最终一致分布式架构，模型数据更新后需等约10分钟所有服务器同步。metadata API 可查询各模型的 last_run_availability_time。

---

## 14. 与天气 APP 的适用度总结

### 核心价值

| 维度 | 评价 | 说明 |
|------|------|------|
| 温度/湿度/气压/风 | ⭐⭐⭐⭐⭐ | 全部原生支持，数值类型 |
| 体感温度 | ⭐⭐⭐⭐⭐ | 独家多因子公式 |
| 降水量(mm) | ⭐⭐⭐⭐⭐ | rain+showers+snow 三分项 |
| 降水概率 | ⭐⭐⭐⭐⭐ | 30次集合模拟，>0.1mm |
| WMO天气码 | ⭐⭐⭐⭐⭐ | 数字码，易映射图标 |
| 日出日落 | ⭐⭐⭐⭐⭐ | 原生支持 |
| UV指数 | ⭐⭐⭐⭐ | AQI API提供 |
| CMA中国模型 | ⭐⭐⭐⭐⭐ | 9km，唯一免费CMA接入 |
| 空气质量 | ⭐⭐⭐ | 全球45km粗，中国无本地 |
| 分钟降水 | ❌ | 无分钟级 |
| 天气预警 | ❌ | 无预警 |

### 四源定位（最终版）

| 源 | 角色 | 独有价值 |
|----|------|---------|
| 🥇 和风 | 全能主力 | AQI+预警+指数+分钟降水 |
| 🥈 **Open-Meteo** | **温度/降水校验** | 体感温度+全球模型+降水概率+CMA中国模型+零阻塞 |
| 🥉 彩云 | 降水专家 | 2h分钟级降水 |
| 🗺️ 高德 | 空间基础设施 | 区界+地图渲染 |

**Open-Meteo 的核心检查价值**：
1. 提供**体感温度**（和风/彩云/高德都没有！）
2. **降水概率**基于30次集合模拟（不是0-100%主观估计）
3. rainwater/snow 三分项（与和风互校）
4. **中国CMA GRAPES模型** 9km免费接入
5. 零延迟：无需申请Key，现在就能用真实数据跑融合引擎

---

## 15. 与和风的交叉校验策略

```
温度融合：和风(temperature)×0.4 + Open-Meteo(temperature_2m)×0.3 + 彩云×0.2 + 高德×0.1
体感温度：Open-Meteo(apparent_temperature) 独占 → 彩色圆环对比真实温度
降水概率：Open-Meteo → 显示降水概率%
降水量：和风(qpf)×0.5 + Open-Meteo(precipitation)×0.3 + 彩云×0.2
天气图标：和风(icon)→中文描述 + Open-Meteo(weather_code)→WMO备选
日出日落：Open-Meteo → 纯天文计算
```
