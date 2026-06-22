/**
 * 全链路集成测试 — 模拟 useWeather → locateUser → weatherService.refresh 全流程
 * 运行: node test-integration.cjs
 */
const https = require('https');

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers, timeout: 10000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve({ ok: r.statusCode < 400, status: r.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ ok: r.statusCode < 400, status: r.statusCode, data: d }); }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══ Step 1: IP定位 ═══
async function step1_locate() {
  const t0 = Date.now();
  try {
    const { data } = await httpGet(`https://restapi.amap.com/v3/ip?key=beb0c54a8413d80825b4126c56296176`);
    if (data.status !== '1') throw new Error('IP locate failed');
    const [sw, ne] = data.rectangle.split(';');
    const [lng1, lat1] = sw.split(',').map(Number);
    const [lng2, lat2] = ne.split(',').map(Number);
    return { ok: true, ms: Date.now() - t0, lat: (lat1+lat2)/2, lng: (lng1+lng2)/2, province: data.province, city: data.city };
  } catch(e) { return { ok: false, ms: Date.now() - t0, error: e.message }; }
}

// ═══ Step 2: 逆地理 ═══
async function step2_regeo(lat, lng) {
  const t0 = Date.now();
  try {
    const { data } = await httpGet(`https://restapi.amap.com/v3/geocode/regeo?key=beb0c54a8413d80825b4126c56296176&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base`);
    if (data.status !== '1') throw new Error('regeo failed');
    const addr = data.regeocode.addressComponent;
    const street = `${addr.district} · ${addr.street || ''} ${addr.streetNumber?.number || ''}号`.replace(/\s+/g, ' ');
    return { ok: true, ms: Date.now() - t0, street, district: addr.district, adcode: addr.adcode };
  } catch(e) { return { ok: false, ms: Date.now() - t0, error: e.message }; }
}

// ═══ Step 3: 五源并发 ═══
async function step3_fetchAll(lat, lng) {
  const loc = `${lng.toFixed(2)},${lat.toFixed(2)}`;
  const amapKey = 'beb0c54a8413d80825b4126c56296176';

  // ── 和风 ──
  async function fetchQweather() {
    const r = await httpGet(`https://k77h2tb3b6.re.qweatherapi.com/v7/weather/now?location=${loc}`,
      { 'X-QW-Api-Key': '9be01c8753fa40c6b4733007b4cef5bc' });
    const n = r.data.now;
    return { source: '和风', ok: true,
      temp: parseFloat(n.temp), feelsLike: parseFloat(n.feelsLike),
      humidity: parseFloat(n.humidity), pressure: parseFloat(n.pressure),
      condition: n.text, windSpeed: parseFloat(n.windSpeed) };
  }

  // ── Open-Meteo ──
  async function fetchOpenMeteo() {
    const r = await httpGet(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&timezone=Asia/Shanghai&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&forecast_days=1`);
    const c = r.data.current;
    const wc = { 0:'晴',1:'晴',2:'多云',3:'阴',45:'雾',51:'小雨',61:'小雨',63:'中雨',65:'大雨',71:'小雪',73:'中雪',75:'大雪',80:'阵雨',95:'雷阵雨' };
    return { source: 'Open-Meteo', ok: true,
      temp: c.temperature_2m, feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m, pressure: c.surface_pressure,
      condition: wc[c.weather_code] || '未知', windSpeed: c.wind_speed_10m/3.6 };
  }

  // ── 高德 ──
  async function fetchAmap() {
    const rg = await httpGet(`https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base`);
    const adcode = rg.data.regeocode.addressComponent.adcode;
    const wx = await httpGet(`https://restapi.amap.com/v3/weather/weatherInfo?key=${amapKey}&city=${adcode}&extensions=base`);
    const l = wx.data.lives[0];
    const wmap = [0,1,3,5,7,10,13,16,20];
    return { source: '高德', ok: true,
      temp: parseFloat(l.temperature), feelsLike: parseFloat(l.temperature),
      humidity: parseFloat(l.humidity), pressure: 0,
      condition: l.weather, windSpeed: wmap[parseInt(l.windpower)] || 0 };
  }

  // ── 彩云 (延时2s防429) ──
  async function fetchCaiyun() {
    await delay(2000);
    const r = await httpGet(`https://api.caiyunapp.com/v2.6/1byFbhxs1oMOWCYy/${lng.toFixed(4)},${lat.toFixed(4)}/realtime.json`);
    const re = r.data.result.realtime;
    return { source: '彩云', ok: true,
      temp: re.temperature, feelsLike: re.apparent_temperature,
      humidity: re.humidity * 100, pressure: re.pressure / 100,
      condition: re.skycon, windSpeed: re.wind.speed };
  }

  // ── CMA ──
  async function fetchCma() {
    const rg = await httpGet(`https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base`);
    const city = (rg.data.regeocode.addressComponent.city || '长春').replace(/市$/, '');
    const r = await httpGet(`https://cn.apihz.cn/api/tianqi/tqyb.php?id=10016685&key=e54c2408713989edaa053c4ec7584cf9&place=${encodeURIComponent(city)}&day=1`);
    const ni = r.data.nowinfo;
    return { source: 'CMA', ok: true,
      temp: ni.temperature, feelsLike: ni.feelst,
      humidity: ni.humidity, pressure: ni.pressure,
      condition: r.data.weather1, windSpeed: ni.windSpeed,
    };
  }

  // ── 并发执行 ──
  const fns = [
    { key: 'qweather', fn: fetchQweather },
    { key: 'openmeteo', fn: fetchOpenMeteo },
    { key: 'amap', fn: fetchAmap },
    { key: 'caiyun', fn: fetchCaiyun },
    { key: 'cma', fn: fetchCma },
  ];

  const results = [];
  const t0 = Date.now();

  for (const { key, fn } of fns) {
    const start = Date.now();
    try {
      const r = await fn();
      results.push({ key, source: r.source, ok: true, ms: Date.now() - start, ...r });
    } catch(e) {
      results.push({ key, source: fns.find(f=>f.key===key)?.fn?.name || key, ok: false, ms: Date.now() - start, error: e.message });
    }
  }

  const totalMs = Date.now() - t0;
  return { results, totalMs };
}

// ═══ Step 4: 融合 ═══
function step4_fusion(results) {
  const alive = results.filter(r => r.ok);
  if (alive.length === 0) return null;

  const wavg = (arr) => arr.reduce((a,b)=>a+b,0)/arr.length;
  const temps = alive.map(r => r.temp);
  const range = Math.max(...temps) - Math.min(...temps);

  return {
    temp: Math.round(wavg(temps) * 10) / 10,
    feelsLike: Math.round(wavg(alive.map(r=>r.feelsLike)) * 10) / 10,
    humidity: Math.round(wavg(alive.map(r=>r.humidity))),
    pressure: Math.round(wavg(alive.map(r=>r.pressure))),
    condition: alive[0].condition,
    sourceCount: alive.length,
    totalCount: results.length,
    tempRange: range,
    consensus: range <= 2 ? 'A级·高度一致' : range <= 5 ? 'B级·基本一致' : 'C级·分歧较大',
  };
}

// ═══ MAIN ═══
async function main() {
  console.log('═══ 全链路集成测试 ═══\n');

  // 1. 定位
  console.log('▶ Step 1: IP定位...');
  const loc = await step1_locate();
  if (!loc.ok) { console.log('❌', loc.error); return; }
  console.log(`  ✅ ${loc.province}${loc.city}  ${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}  [${loc.ms}ms]\n`);

  // 2. 逆地理
  console.log('▶ Step 2: 逆地理...');
  const addr = await step2_regeo(loc.lat, loc.lng);
  if (!addr.ok) { console.log('❌', addr.error); return; }
  console.log(`  ✅ ${addr.street} (adcode=${addr.adcode})  [${addr.ms}ms]\n`);

  // 3. 五源顺序请求（彩云需避429）
  console.log('▶ Step 3: 五源请求（彩云+2s延时）...');
  const { results, totalMs } = await step3_fetchAll(loc.lat, loc.lng);

  console.log(`  ┌${'─'.repeat(65)}┐`);
  for (const r of results) {
    if (r.ok) {
      console.log(`  │ ${r.source.padEnd(12)} ✅ ${String(r.temp).padStart(5)}°C  ${(r.condition||'').padEnd(10)}湿度${String(r.humidity).padStart(3)}% 气压${String(r.pressure).padStart(5)}hPa  [${r.ms}ms] │`);
    } else {
      console.log(`  │ ${r.source.padEnd(12)} ❌ ${(r.error||'').slice(0,45).padEnd(45)} [${r.ms}ms] │`);
    }
  }
  console.log(`  └${'─'.repeat(65)}┘`);
  console.log(`  总耗时: ${totalMs}ms\n`);

  // 4. 融合
  console.log('▶ Step 4: 融合...');
  const fused = step4_fusion(results);
  if (!fused) { console.log('❌ 无可融合数据'); return; }

  console.log(`  温度: ${fused.temp}°C  体感: ${fused.feelsLike}°C  湿度: ${fused.humidity}%  气压: ${fused.pressure}hPa`);
  console.log(`  覆盖: ${fused.sourceCount}/${fused.totalCount}源  极差: ${fused.tempRange}°C  ${fused.consensus}`);
  console.log(`\n═══ 全链路通过 ✅ ═══`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
