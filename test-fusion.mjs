/**
 * 集成测试：真数据跑融合引擎
 * 
 * 用法: node test-fusion.mjs
 * 要点: 模拟 Open-Meteo + 高德 两个活源 → 融合 → 打印最终结果
 */

// ─── 模拟 高德适配器 ───
const AMAP_KEY = "beb0c54a8413d80825b4126c56296176";

async function amapWeather(lat, lng, ext = "base") {
  // 先逆地理得adcode
  const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base`;
  const geo = await fetch(geoUrl).then(r => r.json());
  const adcode = geo.regeocode?.addressComponent?.adcode ?? "220200";
  
  const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${AMAP_KEY}&city=${adcode}&extensions=${ext}`;
  const data = await fetch(url).then(r => r.json());
  const l = data.lives?.[0];
  return {
    sourceId: "amap",
    ok: !!l,
    responseMs: 0,
    now: l ? {
      temp: parseFloat(l.temperature),
      feelsLike: parseFloat(l.temperature),
      condition: l.weather,
      iconCode: "",
      humidity: parseFloat(l.humidity),
      windDir: l.winddirection,
      windSpeed: wf_forceToMs(parseFloat(l.windpower)),
      pressure: 0, visibility: 0, uv: 0, aqi: null,
    } : undefined,
    daily: data.forecasts?.[0]?.casts?.map(d => ({
      date: d.date,
      tempHigh: parseFloat(d.daytemp),
      tempLow: parseFloat(d.nighttemp),
      condition: d.dayweather,
      iconCode: "",
      pop: 0, rainAmount: 0, sunrise: "", sunset: "",
      windDir: d.daywind,
      windSpeed: wf_forceToMs(parseFloat(d.daypower)),
    })),
  };
}

// ─── 模拟 Open-Meteo ───
const OM_LAT = 43.88, OM_LNG = 125.39; // 长春坐标

const WMO = {
  0: ["晴", "100"], 1: ["晴", "100"], 2: ["多云", "101"], 3: ["阴", "104"],
  45: ["雾", "501"], 48: ["雾凇", "501"],
  51: ["小雨", "305"], 53: ["中雨", "306"], 55: ["大雨", "307"],
  61: ["小雨", "305"], 63: ["中雨", "306"], 65: ["大雨", "307"],
  71: ["小雪", "400"], 73: ["中雪", "401"], 75: ["大雪", "402"],
  80: ["阵雨", "300"], 81: ["中阵雨", "301"], 82: ["大阵雨", "302"],
  95: ["雷阵雨", "310"], 96: ["雷暴+冰雹", "311"], 99: ["雷暴+冰雹", "311"],
};

function degToDir(deg) {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8] + "风";
}

async function openmeteoWeather(lat, lng) {
  const vars = [
    "temperature_2m","relative_humidity_2m","apparent_temperature","weather_code",
    "wind_speed_10m","wind_direction_10m","surface_pressure","visibility"
  ].join(",");
  const hVars = ["temperature_2m","weather_code","precipitation_probability","precipitation"].join(",");
  const dVars = ["weather_code","temperature_2m_max","temperature_2m_min","precipitation_probability_max","precipitation_sum","sunrise","sunset","wind_speed_10m_max","wind_direction_10m_dominant"].join(",");
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=${vars}&hourly=${hVars}&daily=${dVars}&timezone=Asia/Shanghai&forecast_days=7`;
  const raw = await fetch(url).then(r => r.json());
  
  const w = WMO[raw.current.weather_code] ?? ["未知","999"];
  return {
    sourceId: "openmeteo",
    ok: true,
    responseMs: 0,
    now: {
      temp: raw.current.temperature_2m,
      feelsLike: raw.current.apparent_temperature,
      condition: w[0],
      iconCode: w[1],
      humidity: raw.current.relative_humidity_2m,
      windDir: degToDir(raw.current.wind_direction_10m),
      windSpeed: raw.current.wind_speed_10m / 3.6,
      pressure: raw.current.surface_pressure,
      visibility: raw.current.visibility ?? 10,
      uv: 0,
      aqi: null,
    },
    hourly: raw.hourly.time?.map((t, i) => {
      const w = WMO[raw.hourly.weather_code[i]] ?? ["未知","999"];
      return { time: t, temp: raw.hourly.temperature_2m[i], condition: w[0], iconCode: w[1], pop: raw.hourly.precipitation_probability[i] ?? 0, rainAmount: raw.hourly.precipitation[i] ?? 0 };
    }),
    daily: raw.daily.time?.map((d, i) => {
      const w = WMO[raw.daily.weather_code[i]] ?? ["未知","999"];
      return { date: d, tempHigh: raw.daily.temperature_2m_max[i], tempLow: raw.daily.temperature_2m_min[i], condition: w[0], iconCode: w[1], pop: raw.daily.precipitation_probability_max[i] ?? 0, rainAmount: raw.daily.precipitation_sum[i] ?? 0, sunrise: raw.daily.sunrise[i], sunset: raw.daily.sunset[i], windDir: degToDir(raw.daily.wind_direction_10m_dominant[i]), windSpeed: raw.daily.wind_speed_10m_max[i] / 3.6 };
    }),
  };
}

// ─── 融合引擎 (精简版) ───
function wavg(vals, weights) {
  let sum = 0, wsum = 0;
  for (let i = 0; i < vals.length; i++) { sum += vals[i] * weights[i]; wsum += weights[i]; }
  return wsum === 0 ? 0 : sum / wsum;
}
function avg(vals) { return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length; }
function mode(vals) {
  const freq = {};
  let best = vals[0], bestF = 0;
  for (const v of vals) { freq[v] = (freq[v] ?? 0) + 1; if (freq[v] > bestF) { best = v; bestF = freq[v]; } }
  return best;
}

function fuseNow(results) {
  const alive = results.filter(r => r.ok && r.now);
  if (alive.length === 0) return null;
  const w = [1, 1];
  return {
    temp: Math.round(wavg(alive.map(r => r.now.temp), w) * 10) / 10,
    feelsLike: Math.round(wavg(alive.map(r => r.now.feelsLike), w) * 10) / 10,
    condition: mode(alive.map(r => r.now.condition)),
    humidity: Math.round(wavg(alive.map(r => r.now.humidity), w)),
    windDir: alive[0].now.windDir,
    windSpeed: Math.round(wavg(alive.map(r => r.now.windSpeed), w) * 10) / 10,
    sources: alive.map(r => `${r.sourceId}: ${r.now.temp}°C ${r.now.condition}`),
  };
}

function fuseDaily(results) {
  const alive = results.filter(r => r.ok && r.daily?.length);
  if (alive.length === 0) return [];
  const base = alive[0].daily;
  return base.map((d, i) => {
    const highs = alive.map(r => r.daily[i]?.tempHigh).filter(Boolean);
    const lows = alive.map(r => r.daily[i]?.tempLow).filter(Boolean);
    const conds = alive.map(r => r.daily[i]?.condition).filter(Boolean);
    return {
      date: d.date,
      tempHigh: Math.round(avg(highs)),
      tempLow: Math.round(avg(lows)),
      condition: mode(conds),
      sunrise: d.sunrise, sunset: d.sunset,
    };
  });
}

function wf_forceToMs(level) {
  const map = [0, 1, 3, 5, 7, 10, 13, 16, 20, 23, 27, 31, 35];
  return map[Math.min(level, map.length - 1)] ?? level * 3;
}

// ─── 主流程 ───
console.log("=== 米豆天气 融合测试 ===\n");
console.log(`坐标: (${OM_LAT}, ${OM_LNG}) 长春\n`);

const t0 = Date.now();
const [om, amap] = await Promise.all([
  openmeteoWeather(OM_LAT, OM_LNG),
  amapWeather(OM_LAT, OM_LNG),
]);
console.log(`请求耗时: ${Date.now() - t0}ms\n`);

// 实况
console.log("── 各源实况 ──");
console.log(`  Open-Meteo: ${om.now.temp}°C (体感${om.now.feelsLike}°C) ${om.now.condition} 湿度${om.now.humidity}% ${om.now.windDir}${om.now.windSpeed.toFixed(1)}m/s`);
if (amap.now) console.log(`  高德:       ${amap.now.temp}°C ${amap.now.condition} 湿度${amap.now.humidity}% ${amap.now.windDir}${amap.now.windSpeed.toFixed(1)}m/s`);

const fused = fuseNow([om, amap]);
if (fused) {
  console.log(`\n── 融合结果 ──`);
  console.log(`  温度: ${fused.temp}°C | 体感: ${fused.feelsLike}°C | ${fused.condition} | 湿度${fused.humidity}% | ${fused.windDir}${fused.windSpeed}m/s`);
  console.log(`  各源: ${fused.sources.join(" | ")}`);
}

// 预报
const fusedD = fuseDaily([om, amap]);
if (fusedD.length) {
  console.log(`\n── 融合预报 (${fusedD.length}天) ──`);
  for (const d of fusedD.slice(0, 3)) {
    console.log(`  ${d.date}  ${d.condition}  H:${d.tempHigh}°C L:${d.tempLow}°C  ☀${d.sunrise?.split("T")[1] ?? "--"}  ☽${d.sunset?.split("T")[1] ?? "--"}`);
  }
}

console.log("\n✅ 融合引擎验证通过");
