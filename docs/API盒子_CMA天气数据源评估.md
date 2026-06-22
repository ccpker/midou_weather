# API盒子 天气预报 数据源评估

> 来源：https://www.apihz.cn/api/tqtqyb.html
> 接口：`cn.apihz.cn/api/tianqi/tqyb.php`
> 数据源：**中国气象局 (CMA)**
> 免费：是（需注册个人ID+KEY，每日调用无上限，仅分钟频限）

---

## 1. 返回数据全景

| 模块 | 字段 | 备注 |
|------|------|------|
| 定位 | guo/sheng/shi/name/lon/lat | ✅ |
| 今日昼夜 | weather1/2, wd1/2(温度), winddirection1/2, windleve1/2, weather图标 | daytime+nighttime |
| **实时 nowinfo** | precipitation/temperature/pressure/humidity/windDirection/windDirectionDegree/windSpeed/windScale/**feelst** | ⭐ 含体感温度 |
| **预警 alarm** | title/signaltype/signallevel/effective/severity | ⭐ 气象灾害预警 |
| **逐时 hour1** | 时间/天气/图标/气温/降水/风速/风向/气压/湿度/**云量** | ⭐ 8时段(每3h)，含云量 |
| **日出日落 suntimes** | sunrise/sunset/civil_twilight_begin_end/astronomical_twilight/nautical_twilight/day_length/night_length | ⭐ 7天全量，极度详细 |
| 多天预报 | weatherday2~7 | 含昼夜温度/天气/风力 |

---

## 2. 与现有四源对比

| 能力 | apihz(CMA) | 和风 | Open-Meteo | 彩云 | 高德 |
|------|:---:|:---:|:---:|:---:|:---:|
| **数据源** | **中国气象局** | 多源融合 | ECMWF/GFS | 自研模型 | 未知 |
| 实况温度 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 湿度 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 气压 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 体感温度 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 降水 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 风速风向 | ✅(度数) | ✅ | ✅ | ✅ | ✅ |
| 7天预报 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 逐时预报 | 8时段 | 24h | 168h | ✅ | ❌ |
| 预警 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 云量 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 日出日落 | ✅(7天极详细) | ✅ | ✅ | ❌ | ❌ |
| AQI | ❌ | ✅ | ❌ | ✅ | ❌ |
| 定位方式 | 地名 | 经纬度 | 经纬度 | 经纬度 | 经纬度 |
| 日配额 | 无上限 | 1000次 | 无 | 1000次 | 5000次/月 |

---

## 3. 核心增量价值

**✅ 强YES，必接。理由：**

1. **CMA 独立数据源** — 中国气象局官方数据，与现有四源的模型体系完全不同。ECMWF/GFS/和风融合/彩云自研 vs CMA 官方，五源互相独立，融合置信度大幅提升。

2. **预警双源** — 和风有预警，CMA也有预警。预警这种关键信息，双源交叉验证比单源靠谱得多。

3. **日出日落极度详细** — 7天含民用/航海/天文晨昏蒙影、昼夜精确秒数，Open-Meteo给不了这么细。对日出日落卡片UI是核武器级数据。

4. **无日配额焦虑** — 其他源有硬日限（和风1000/彩云1000/高德5000月），这个是分钟频限无日上限。

5. **云量数据** — 小时级云量%，Open-Meteo也有但多一个源多一个校验维度。

**弱项（可接受）：**
- 无 AQI（和风+彩云已双覆盖）
- 仅地名定位不支持经纬度（先用高德逆地理转换）
- 逐时只有8时段（vs 24h，够用但非最佳）

---

## 4. 融合角色定位

| 字段 | 源及权重 |
|------|------|
| 温度 | 和风×0.3 + Open-Meteo×0.25 + CMA×0.2 + 彩云×0.15 + 高德×0.1 |
| 湿度 | 和风×0.3 + Open-Meteo×0.25 + CMA×0.25 + 彩云×0.2 |
| 气压 | 和风×0.3 + Open-Meteo×0.3 + CMA×0.2 + 彩云×0.2 |
| 体感温度 | Open-Meteo×0.4 + CMA×0.3 + 和风×0.3 |
| 预警 | 和风 ∪ CMA（并集，不融合） |
| 日出日落 | CMA 优先（最详细） → Open-Meteo 兜底 |
| 云量 | CMA×0.5 + Open-Meteo×0.5 |

---

## 5. 行动项

- [ ] 注册 apihz.cn 获取个人 ID + KEY
- [ ] 写 `cma.ts` 适配器
- [ ] 集成 `test-fusion-v5.mjs` 含 CMA
- [ ] 融合引擎权重更新
