/**
 * 双源融合集成测试 — 和风(真实Key) + Open-Meteo(免费)
 * node test-fusion-v2.mjs
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

const LAT = 43.88, LON = 125.39;
const LOCATION = "101060101"; // 长春

console.log("═".repeat(60));
console.log("天气APP 双源融合测试");
console.log(`位置: 长春 (${LAT}, ${LON}) | adcode: ${LOCATION}`);
console.log(`和风Host: ${QWEATHER_HOST}`);
console.log("═".repeat(60));

// ── 和风天气 ──
console.log("\n[1] 和风天气 → 实时");
const qwNow = await fetch(`${QWEATHER_BASE}/v7/weather/now?location=${LOCATION}&key=${QWEATHER_KEY}`)
  .then(r => r.json());
console.log(`  code=${qwNow.code}  temp=${qwNow.now?.temp}°C  feelsLike=${qwNow.now?.feelsLike}°C  text=${qwNow.now?.text}  humidity=${qwNow.now?.humidity}%`);

console.log("[2] 和风天气 → 24h预报");
const qw24h = await fetch(`${QWEATHER_BASE}/v7/weather/24h?location=${LOCATION}&key=${QWEATHER_KEY}`)
  .then(r => r.json());
console.log(`  code=${qw24h.code}  条数=${qw24h.hourly?.length ?? 0}`);
if (qw24h.hourly?.[0]) {
  const h = qw24h.hourly[0];
  console.log(`  首条: ${h.fxTime} temp=${h.temp}°C text=${h.text}`);
}

console.log("[3] 和风天气 → 7天预报");
const qw7d = await fetch(`${QWEATHER_BASE}/v7/weather/7d?location=${LOCATION}&key=${QWEATHER_KEY}`)
  .then(r => r.json());
console.log(`  code=${qw7d.code}  条数=${qw7d.daily?.length ?? 0}`);

// ── Open-Meteo ──
console.log("\n[4] Open-Meteo → 实时+24h+7d（一次请求）");
const omParams = new URLSearchParams({
  latitude: LAT, longitude: LON,
  current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation",
  hourly: "temperature_2m,precipitation_probability,weather_code",
  daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset",
  timezone: "Asia/Shanghai",
  forecast_days: "7"
});
const omResp = await fetch(`https://api.open-meteo.com/v1/forecast?${omParams}`)
  .then(r => r.json());
const omNow = omResp.current;
console.log(`  temp=${omNow.temperature_2m}°C  feelsLike=${omNow.apparent_temperature}°C  humidity=${omNow.relative_humidity_2m}%  weather_code=${omNow.weather_code}`);
console.log(`  hourly预报: ${omResp.hourly?.time?.length ?? 0}条`);
console.log(`  daily预报: ${omResp.daily?.time?.length ?? 0}条`);

// ── 融合温度 ──
console.log("\n[5] 加权融合");
const qwTemp = parseFloat(qwNow.now?.temp ?? "0");
const omTemp = omNow.temperature_2m;
const fusedTemp = (qwTemp * 0.55 + omTemp * 0.45).toFixed(1); // 和风主力 + Open-Meteo校验
console.log(`  和风: ${qwTemp}°C × 0.55 = ${(qwTemp * 0.55).toFixed(1)}`);
console.log(`  Open-Meteo: ${omTemp}°C × 0.45 = ${(omTemp * 0.45).toFixed(1)}`);
console.log(`  → 融合温度: ${fusedTemp}°C`);

const qwHum = parseFloat(qwNow.now?.humidity ?? "0");
const omHum = omNow.relative_humidity_2m;
const fusedHum = (qwHum * 0.55 + omHum * 0.45).toFixed(1);
console.log(`  → 融合湿度: ${fusedHum}% (和风${qwHum}% | Open-Meteo${omHum}%)`);

console.log("\n✅ 双源真实数据测试完成");
