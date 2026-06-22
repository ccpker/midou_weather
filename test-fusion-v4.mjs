/**
 * 四源融合集成测试 — 和风 + Open-Meteo + 高德 + 彩云
 * node test-fusion-v4.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { setTimeout } from "timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, ".env"), "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const m = line.match(/^VITE_(\w+)=(.+)/);
  if (m) env[m[1]] = m[2].trim();
});

const QWEATHER_KEY = env.QWEATHER_KEY;
const QWEATHER_HOST = env.QWEATHER_HOST ?? "devapi.qweather.com";
const QWEATHER_BASE = `https://${QWEATHER_HOST}`;
const AMAP_KEY = env.AMAP_KEY;
const CAIYUN_KEY = env.CAIYUN_KEY;

const LAT = 43.88, LON = 125.39;
const LOCATION = "101060101";

console.log("═".repeat(65));
console.log("天气APP 四源全融合测试");
console.log(`位置: 长春 (${LAT}, ${LON}) | cityId: ${LOCATION}`);
console.log("═".repeat(65));

// ═══ 1. 和风 ═══
console.log("\n[1] 和风天气");
const qw = await fetch(`${QWEATHER_BASE}/v7/weather/now?location=${LOCATION}&key=${QWEATHER_KEY}`).then(r => r.json());
const qwTemp = parseFloat(qw.now?.temp ?? "0");
const qwHum = parseFloat(qw.now?.humidity ?? "0");
const qwText = qw.now?.text ?? "";
console.log(`  ${qwTemp}°C 体感${qw.now?.feelsLike}°C ${qwText} 湿度${qwHum}%`);

// ═══ 2. Open-Meteo ═══
console.log("\n[2] Open-Meteo");
const om = await fetch(`https://api.open-meteo.com/v1/forecast?${
  new URLSearchParams({
    latitude: LAT, longitude: LON,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset",
    timezone: "Asia/Shanghai", forecast_days: "7"
  })
}`).then(r => r.json());
const omTemp = om.current.temperature_2m;
const omHum = om.current.relative_humidity_2m;
console.log(`  ${omTemp}°C 体感${om.current.apparent_temperature}°C 湿度${omHum}%`);

// ═══ 3. 高德 ═══
console.log("\n[3] 高德地图");
const rg = await fetch(`https://restapi.amap.com/v3/geocode/regeo?location=${LON},${LAT}&key=${AMAP_KEY}`).then(r => r.json());
const adcode = rg.regeocode?.addressComponent?.adcode;
const district = rg.regeocode?.addressComponent?.district;
const am = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${AMAP_KEY}&extensions=base`).then(r => r.json());
let amTemp = null, amHum = null, amText = "";
if (am.status === "1" && am.lives?.[0]) {
  amTemp = parseFloat(am.lives[0].temperature);
  amHum = parseFloat(am.lives[0].humidity);
  amText = am.lives[0].weather;
}
console.log(`  ${district ?? "?"}(adcode=${adcode}) ${amTemp}°C ${amText} 湿度${amHum}%`);

// ═══ 4. 彩云 ═══
console.log("\n[4] 彩云天气");
let cyTemp = null, cyHum = null, cySkycon = "", cyAqi = null;
const cy = await fetch(`https://api.caiyunapp.com/v2.6/TAkhjf8d1XV4fRXa/${LON},${LAT}/realtime.json?token=${CAIYUN_KEY}`).then(r => r.json());
if (cy.status === "ok" && cy.result?.realtime) {
  const rt = cy.result.realtime;
  cyTemp = rt.temperature;
  cyHum = rt.humidity * 100;
  cySkycon = rt.skycon;
  cyAqi = rt.air_quality?.aqi?.chn ?? rt.air_quality?.aqi;
  console.log(`  ${cyTemp}°C ${cySkycon} 湿度${cyHum.toFixed(0)}% AQI:${cyAqi} PM2.5:${rt.air_quality?.pm25}`);
  console.log(`  降水: local=${rt.precipitation?.local?.intensity}mm/h 能见度:${rt.visibility}km 气压:${(rt.pressure/100).toFixed(1)}hPa`);
} else {
  console.log(`  FAIL: ${JSON.stringify(cy)}`);
}

// ═══ 5. 四源加权融合 ═══
console.log("\n[5] 四源加权融合");
// 预设权重归一化（去心知）
const RAW = { qweather: 0.30, amap: 0.25, caiyun: 0.20, openmeteo: 0.15 };
const active = {};
let totalW = 0;
if (qwTemp) { active.qweather = { w: RAW.qweather, temp: qwTemp, hum: qwHum }; totalW += RAW.qweather; }
if (amTemp !== null) { active.amap = { w: RAW.amap, temp: amTemp, hum: amHum }; totalW += RAW.amap; }
if (cyTemp !== null) { active.caiyun = { w: RAW.caiyun, temp: cyTemp, hum: cyHum }; totalW += RAW.caiyun; }
active.openmeteo = { w: RAW.openmeteo, temp: omTemp, hum: omHum }; totalW += RAW.openmeteo;

const fusedTemp = (Object.values(active).reduce((s, a) => s + a.temp * a.w, 0) / totalW).toFixed(1);
const fusedHum = (Object.values(active).reduce((s, a) => s + a.hum * a.w, 0) / totalW).toFixed(1);

for (const [k, v] of Object.entries(active)) {
  const norm = (v.w / totalW * 100).toFixed(0);
  console.log(`  ${k.padEnd(10)} ${v.temp}°C × ${norm}%`);
}
console.log(`  → 融合温度: ${fusedTemp}°C`);
console.log(`  → 融合湿度: ${fusedHum}%`);

// ═══ 6. 一致性 ═══
console.log("\n[6] 四源一致性评估");
const temps = Object.values(active).map(a => a.temp);
const tRange = Math.max(...temps) - Math.min(...temps);
const grade = tRange <= 1 ? "A-高度一致" : tRange <= 3 ? "B-基本一致" : "C-差异较大";
console.log(`  温度: ${temps.join("/")}°C 极差=${tRange.toFixed(1)}°C → ${grade}`);
if (cyTemp) console.log(`  彩云降水: ${cySkycon} | 和风: ${qwText} | 高德: ${amText}`);

// ═══ 7. 延时预报 ═══
console.log("\n[7] 延时预报（等待2s避429）...");
await setTimeout(2000);
try {
  const cyH = await fetch(`https://api.caiyunapp.com/v2.6/TAkhjf8d1XV4fRXa/${LON},${LAT}/hourly.json?hourlysteps=24&token=${CAIYUN_KEY}`).then(r => r.json());
  console.log(`  彩云24h: status=${cyH.status} 条数=${cyH.result?.hourly?.temperature?.length ?? 0}`);
} catch (e) {
  console.log(`  彩云24h: 429 限流，跳过`);
}

const qw24 = await fetch(`${QWEATHER_BASE}/v7/weather/24h?location=${LOCATION}&key=${QWEATHER_KEY}`).then(r => r.json());
console.log(`  和风24h: code=${qw24.code} 条数=${qw24.hourly?.length ?? 0}`);

console.log("\n✅ 四源全融合测试完成");
