// 星图云全量对比测试
// Token: c163e921d2f39af815c5598cb991d84a
// 坐标: 长春昌邑区 43.82,126.55

const TOKEN = 'c163e921d2f39af815c5598cb991d84a';
const LAT = 43.82;
const LNG = 126.55;
const LOC = `${LNG},${LAT}`;

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`\n=== ${url.split('?')[0].split('/').pop()} (${res.status}) ===`);
    if (!res.ok) { console.log('  ERROR:', text.substring(0, 200)); return null; }
    const data = JSON.parse(text);
    console.log(JSON.stringify(data, null, 2).substring(0, 3000));
    return data;
  } catch(e) { console.log('  FAIL:', e.message); return null; }
}

// 1. 坐标批量天气（已知端点）
async function test1_batchPoint() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/weather/batch/point?location=${LOC}&token=${TOKEN}`);
}

// 2. 尝试逐日预报
async function test2_daily() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/weather/batch/daily?location=${LOC}&token=${TOKEN}`);
}

// 3. 尝试逐日预报 alt
async function test3_dailyAlt() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/weather/daily?location=${LOC}&token=${TOKEN}`);
}

// 4. 尝试生活指数
async function test4_index() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/weather/index?location=${LOC}&token=${TOKEN}`);
}

// 5. AQI
async function test5_aqi() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/weather/aqi?location=${LOC}&token=${TOKEN}`);
}

// 6. 尝试分钟降水
async function test6_rain() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/weather/rain?location=${LOC}&token=${TOKEN}`);
}

// 7. 尝试 v1 端点
async function test7_v1() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/cn/area/basic?token=${TOKEN}&location=WTX_CH101060101`);
}

// 8. 尝试15天预报
async function test8_15d() {
  return fetchJSON(`https://api.open.geovisearth.com/v2/weather/daily15?location=${LOC}&token=${TOKEN}`);
}

async function main() {
  console.log('=== 星图云 API 全量端点探测 ===');
  console.log(`坐标: ${LAT},${LNG} | Token: ${TOKEN.substring(0,8)}...\n`);
  
  await test1_batchPoint();
  await test2_daily();
  await test3_dailyAlt();
  await test4_index();
  await test5_aqi();
  await test6_rain();
  await test7_v1();
  await test8_15d();
  
  console.log('\n=== 探测完成 ===');
}

main();
