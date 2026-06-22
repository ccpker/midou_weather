/**
 * 三源融合集成测试 — 和风 + Open-Meteo + 高德
 * node test-fusion-v3.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读 .env
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

const LAT = 43.88, LON = 125.39;
const LOCATION = "101060101"; // 长春 cityId

console.log("═".repeat(60));
console.log("天气APP 三源融合测试");
console.log(`位置: 长春 (${LAT}, ${LON}) | cityId: ${LOCATION}`);
console.log(`和风Host: ${QWEATHER_HOST}`);
console.log("═".repeat(60));

// ═══ 1. 和风天气 ═══
console.log("\n[1] 和风天气");
const qwNow = await fetch(`${QWEATHER_BASE}/v7/weather/now?location=${LOCATION}&key=${QWEATHER_KEY}`)
  .then(r => r.json());
const qwTemp = parseFloat(qwNow.now?.temp ?? "0");
const qwFeels = parseFloat(qwNow.now?.feelsLike ?? "0");
const qwHum = parseFloat(qwNow.now?.humidity ?? "0");
const qwText = qwNow.now?.text ?? "";
console.log(`  实时: ${qwTemp}°C 体感${qwFeels}°C ${qwText} 湿度${qwHum}%`);

const qw7d = await fetch(`${QWEATHER_BASE}/v7/weather/7d?location=${LOCATION}&key=${QWEATHER_KEY}`)
  .then(r => r.json());
console.log(`  7天预报: code=${qw7d.code} 条数=${qw7d.daily?.length ?? 0}`);

// ═══ 2. Open-Meteo ═══
console.log("\n[2] Open-Meteo");
const omParams = new URLSearchParams({
  latitude: LAT, longitude: LON,
  current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation",
  hourly: "temperature_2m,precipitation_probability,weather_code",
  daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset",
  timezone: "Asia/Shanghai",
  forecast_days: "7"
});
const omResp = await fetch(`https://api.open-meteo.com/v1/forecast?${omParams}`).then(r => r.json());
const omNow = omResp.current;
const omTemp = omNow.temperature_2m;
const omFeels = omNow.apparent_temperature;
const omHum = omNow.relative_humidity_2m;
console.log(`  实时: ${omTemp}°C 体感${omFeels}°C 湿度${omHum}% 天气码=${omNow.weather_code}`);
console.log(`  hourly: ${omResp.hourly?.time?.length ?? 0}条  daily: ${omResp.daily?.time?.length ?? 0}条`);

// ═══ 3. 高德地图 ═══
console.log("\n[3] 高德地图");
// Step 1: 逆地理 → adcode
const regeoResp = await fetch(`https://restapi.amap.com/v3/geocode/regeo?location=${LON},${LAT}&key=${AMAP_KEY}`)
  .then(r => r.json());
const adcode = regeoResp.regeocode?.addressComponent?.adcode;
const district = regeoResp.regeocode?.addressComponent?.district;
console.log(`  逆地理: ${district ?? "?"} adcode=${adcode}`);

// Step 2: 天气
const amapNow = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${AMAP_KEY}&extensions=base`)
  .then(r => r.json());
let amapTemp = null, amapHum = null, amapText = "";
if (amapNow.status === "1" && amapNow.lives?.[0]) {
  const live = amapNow.lives[0];
  amapTemp = parseFloat(live.temperature);
  amapHum = parseFloat(live.humidity);
  amapText = live.weather;
  console.log(`  实时: ${amapTemp}°C ${amapText} 湿度${amapHum}%`);
} else {
  console.log(`  天气查询失败: ${JSON.stringify(amapNow)}`);
}

// ═══ 4. 三源融合 ═══
console.log("\n[4] 三源加权融合");

let fusedTemp, fusedHum;
if (amapTemp !== null) {
  // 三源融合：和风 0.45 Open-Meteo 0.35 高德 0.20
  fusedTemp = (qwTemp * 0.45 + omTemp * 0.35 + amapTemp * 0.20).toFixed(1);
  fusedHum = (qwHum * 0.45 + omHum * 0.35 + amapHum * 0.20).toFixed(1);
  console.log(`  温度: 和风${qwTemp}×0.45 + OM${omTemp}×0.35 + 高德${amapTemp}×0.20 = ${fusedTemp}°C`);
  console.log(`  湿度: 和风${qwHum}×0.45 + OM${omHum}×0.35 + 高德${amapHum}×0.20 = ${fusedHum}%`);
} else {
  // 退化为双源
  fusedTemp = (qwTemp * 0.55 + omTemp * 0.45).toFixed(1);
  fusedHum = (qwHum * 0.55 + omHum * 0.45).toFixed(1);
  console.log(`  [高德缺失，退化为双源融合]`);
  console.log(`  温度: 和风${qwTemp}×0.55 + OM${omTemp}×0.45 = ${fusedTemp}°C`);
  console.log(`  湿度: 和风${qwHum}×0.55 + OM${omHum}×0.45 = ${fusedHum}%`);
}

// ═══ 5. 一致性评估 ═══
console.log("\n[5] 源间一致性评估");
const sources = [];
if (qwTemp) sources.push({ name: "和风", temp: qwTemp, hum: qwHum });
sources.push({ name: "Open-Meteo", temp: omTemp, hum: omHum });
if (amapTemp !== null) sources.push({ name: "高德", temp: amapTemp, hum: amapHum });

const temps = sources.map(s => s.temp);
const hums = sources.map(s => s.hum);
const tempRange = Math.max(...temps) - Math.min(...temps);
const humRange = Math.max(...hums) - Math.min(...hums);

const grade = tempRange <= 1 ? "A-高度一致" : tempRange <= 3 ? "B-基本一致" : "C-差异较大";
console.log(`  源数: ${sources.length} | 温度极差: ${tempRange.toFixed(1)}°C → ${grade}`);
console.log(`  各源温度：${sources.map(s => `${s.name} ${s.temp}°C`).join("  ")}`);

console.log("\n✅ 三源融合测试完成");
