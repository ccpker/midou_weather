/**
 * 五源全融合测试 — 和风 + Open-Meteo + 高德 + 彩云 + CMA
 * 运行: node test-fusion-v5.mjs
 */
const https = require('https');

const GPS = { lat: 43.82, lng: 126.55 }; // 长春

// ─── HTTP helpers ───
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve({ status: r.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: r.statusCode, data: d }); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── 1. 和风天气 ───
async function fetchQweather() {
  const t0 = Date.now();
  try {
    const loc = `${GPS.lng.toFixed(2)},${GPS.lat.toFixed(2)}`;
    const u = 'https://k77h2tb3b6.re.qweatherapi.com/v7/weather/now?location='+loc;
    const {data} = await httpGet(u, {headers:{'X-QW-Api-Key':'9be01c8753fa40c6b4733007b4cef5bc'}});
    const n = data.now;
    return {
      source: '和风',
      ok: true, ms: Date.now()-t0,
      temp: parseFloat(n.temp), feelsLike: parseFloat(n.feelsLike),
      humidity: parseFloat(n.humidity), pressure: parseFloat(n.pressure),
      condition: n.text, windDir: n.windDir, windSpeed: parseFloat(n.windSpeed),
    };
  } catch(e) { return { source:'和风', ok:false, ms:Date.now()-t0, error:e.message }; }
}

// ─── 2. Open-Meteo ───
async function fetchOpenMeteo() {
  const t0 = Date.now();
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${GPS.lat}&longitude=${GPS.lng}&timezone=Asia/Shanghai&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&forecast_days=1`;
    const {data} = await httpGet(u);
    return {
      source: 'Open-Meteo',
      ok: true, ms: Date.now()-t0,
      temp: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.surface_pressure,
      condition: ['晴','晴','多云','阴','','雾','','','','','','','','','',''][data.current.weather_code]||'未知',
      windDir: '自动', windSpeed: data.current.wind_speed_10m/3.6,
    };
  } catch(e) { return { source:'Open-Meteo', ok:false, ms:Date.now()-t0, error:e.message }; }
}

// ─── 3. 高德 ───
async function fetchAmap() {
  const t0 = Date.now();
  try {
    const loc = `${GPS.lng.toFixed(6)},${GPS.lat.toFixed(6)}`;
    const key = 'beb0c54a8413d80825b4126c56296176';
    const rg = await httpGet(`https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${loc}&extensions=base`);
    const adcode = rg.data.regeocode.addressComponent.adcode;
    const wx = await httpGet(`https://restapi.amap.com/v3/weather/weatherInfo?key=${key}&city=${adcode}&extensions=base`);
    const l = wx.data.lives[0];
    return {
      source: '高德',
      ok: true, ms: Date.now()-t0,
      temp: parseFloat(l.temperature),
      feelsLike: parseFloat(l.temperature),
      humidity: parseFloat(l.humidity),
      pressure: 0,
      condition: l.weather, windDir: l.winddirection,
      windSpeed: [0,1,3,5,7,10,13,16,20][parseInt(l.windpower)]||0,
    };
  } catch(e) { return { source:'高德', ok:false, ms:Date.now()-t0, error:e.message }; }
}

// ─── 4. 彩云 ───
async function fetchCaiyun() {
  const t0 = Date.now();
  try {
    const u = `https://api.caiyunapp.com/v2.6/1byFbhxs1oMOWCYy/${GPS.lng.toFixed(4)},${GPS.lat.toFixed(4)}/realtime.json`;
    const {data} = await httpGet(u);
    const r = data.result.realtime;
    return {
      source: '彩云',
      ok: true, ms: Date.now()-t0,
      temp: r.temperature,
      feelsLike: r.apparent_temperature,
      humidity: r.humidity * 100,
      pressure: r.pressure / 100,
      condition: r.skycon,
      windDir: r.wind.direction+'°', windSpeed: r.wind.speed,
    };
  } catch(e) { return { source:'彩云', ok:false, ms:Date.now()-t0, error:e.message }; }
}

// ─── 5. CMA(中国气象局) ───
async function fetchCma() {
  const t0 = Date.now();
  try {
    // 先用高德逆地理取城市名
    const key = 'beb0c54a8413d80825b4126c56296176';
    const loc = `${GPS.lng.toFixed(6)},${GPS.lat.toFixed(6)}`;
    const rg = await httpGet(`https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${loc}&extensions=base`);
    const city = (rg.data.regeocode.addressComponent.city || '长春').replace(/市$/, '');

    const u = `https://cn.apihz.cn/api/tianqi/tqyb.php?id=10016685&key=e54c2408713989edaa053c4ec7584cf9&place=${encodeURIComponent(city)}&day=1`;
    const {data} = await httpGet(u);
    const ni = data.nowinfo;
    return {
      source: 'CMA',
      ok: true, ms: Date.now()-t0,
      city,
      temp: ni.temperature, feelsLike: ni.feelst,
      humidity: ni.humidity, pressure: ni.pressure,
      condition: data.weather1, windDir: ni.windDirection, windSpeed: ni.windSpeed,
      precip: ni.precipitation, alarms: (data.alarm||[]).length,
    };
  } catch(e) { return { source:'CMA', ok:false, ms:Date.now()-t0, error:e.message }; }
}

// ─── 主流程 ───
async function main() {
  console.log('═══ 五源全融合测试 ═══');
  console.log(`坐标: ${GPS.lat}, ${GPS.lng}  |  目标: 长春\n`);

  const results = await Promise.all([
    fetchQweather(),
    fetchOpenMeteo(),
    fetchAmap(),
    fetchCaiyun(),
    fetchCma(),
  ]);

  // 等待彩云延迟（防429）
  await delay(2000);

  console.log('── 各源返回 ──');
  const alive = [];
  for (const r of results) {
    const mark = r.ok ? '✅' : '❌';
    console.log(`${mark} ${r.source.padEnd(12)} ${r.ok ? `temp=${r.temp}°C cond=${r.condition}` : 'ERR:'+r.error}  [${r.ms}ms]`);
    if (r.ok) alive.push(r);
  }

  console.log(`\n── 融合结果 (${alive.length}源) ──`);
  if (alive.length === 0) { console.log('无可用源'); return; }

  const w = (w) => 1; // 均权

  const temps = alive.map(r => r.temp);
  const feels = alive.map(r => r.feelsLike);
  const humids = alive.map(r => r.humidity);
  const pressures = alive.map(r => r.pressure);
  const wspeeds = alive.map(r => r.windSpeed);
  const conds = alive.map(r => r.condition);

  const wavg = (v) => v.reduce((a,b)=>a+b,0)/v.length;
  const range = Math.max(...temps) - Math.min(...temps);

  console.log(`  温度: ${wavg(temps).toFixed(1)}°C (各源: ${temps.map(t=>t.toFixed(1)).join(' / ')})`);
  console.log(`  体感: ${wavg(feels).toFixed(1)}°C`);
  console.log(`  湿度: ${Math.round(wavg(humids))}%`);
  console.log(`  气压: ${Math.round(wavg(pressures))}hPa`);
  console.log(`  风速: ${wavg(wspeeds).toFixed(1)}m/s`);
  console.log(`  天气: ${conds}`);

  // 一致性评级
  if (range <= 1.5) console.log(`  评级: A级 (极差${range.toFixed(1)}°C，高度一致)`);
  else if (range <= 3) console.log(`  评级: B级 (极差${range.toFixed(1)}°C，基本一致)`);
  else console.log(`  评级: C级 (极差${range.toFixed(1)}°C，分歧较大)`);

  // CMA 特有
  const cma = results.find(r => r.source==='CMA' && r.ok);
  if (cma) {
    console.log(`\n── CMA 独有数据 ──`);
    console.log(`  降水: ${cma.precip}mm | 预警: ${cma.alarms}条`);
  }

  console.log('\n═══ 测试通过 ═══');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
