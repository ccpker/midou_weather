// test-cma-latlng.cjs — 测试 CMA 是否支持 lat/lng
const https = require('https');
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {timeout: 10000}, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('parse: ' + d.slice(0,200))); }
      });
    }).on('error', reject);
  });
}

(async () => {
  // 昌邑区中心坐标
  const lat = 43.85, lng = 126.57;
  
  // 试多种参数名
  const combos = [
    { place: `lat=${lat}&lon=${lng}`, label: 'place内嵌lat/lon' },
    { place: `${lng},${lat}`, label: 'lng,lat逗号分隔' },
    { place: `${lat},${lng}`, label: 'lat,lng逗号分隔' },
    { place: '吉林', lat, lon: lng, label: 'place+额外lat/lon' },
  ];

  for (const c of combos) {
    let url = `https://cn.apihz.cn/api/tianqi/tqyb.php?id=10016685&key=e54c2408713989edaa053c4ec7584cf9&place=${encodeURIComponent(c.place)}&day=1`;
    if (c.lat !== undefined) url += `&lat=${c.lat}&lon=${c.lon}`;
    try {
      const d = await get(url);
      const ok = d.shi && d.lon && d.nowinfo;
      console.log(`${c.label.padEnd(20)} → ${ok ? `shi="${d.shi}" (${d.lon},${d.lat}) ${d.nowinfo?.temperature}°C` : `code=${d.code} msg=${d.msg}`}`);
    } catch(e) {
      console.log(`${c.label.padEnd(20)} → ERROR: ${e.message}`);
    }
  }

  // 单独检查文档是否提到lat/lon参数
  console.log('\n── 查API文档 ──');
  const docUrl = 'https://www.apihz.cn/api/xxtqyb.html';
  try {
    const d = await get(`https://cn.apihz.cn/api/tianqi/tqyb.php?id=10016685&key=e54c2408713989edaa053c4ec7584cf9&place=长春&day=1`);
    console.log('接口字段列表:', Object.keys(d).join(', '));
    console.log('nowinfo字段:', Object.keys(d.nowinfo).join(', '));
  } catch(e) { console.error(e); }
})().catch(e => console.error(e));
