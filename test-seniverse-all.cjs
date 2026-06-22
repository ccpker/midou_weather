const crypto = require('crypto');
const uid = 'PyrvBwg3hZBQzCeON';
const key = 'Sy_0RBNTnyL-jaBgg';

function sign() {
  const t = Math.floor(Date.now() / 1000).toString();
  const p = 'ts=' + t + '&ttl=300&uid=' + uid;
  const s = encodeURIComponent(crypto.createHmac('sha1', key).update(p).digest('base64'));
  return p + '&sig=' + s;
}

const base = 'https://api.seniverse.com/v3';
const endpoints = [
  ['/weather/now.json', '实况', '&location=beijing&language=zh-Hans&unit=c'],
  ['/weather/daily.json', '天预报', '&location=beijing&language=zh-Hans&unit=c&start=0&days=3'],
  ['/weather/hourly.json', '小时预报', '&location=beijing&language=zh-Hans&unit=c&start=0&hours=24'],
  ['/life/suggestion.json', '生活指数', '&location=beijing&language=zh-Hans'],
  ['/air/now.json', '空气质量实况', '&location=beijing&language=zh-Hans'],
  ['/air/hourly.json', '空气逐时', '&location=beijing&language=zh-Hans&scope=city'],
  ['/geo/lookup.json', '地理查询', '&q=beijing&limit=1'],
];

function fetchOne(url) {
  return new Promise(resolve => {
    require('https').get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d.substring(0, 1000) }));
    }).on('error', e => resolve({ status: 0, error: e.message }));
  });
}

async function run() {
  const sig = sign();
  for (const [path, label, params] of endpoints) {
    const url = base + path + params + '&' + sig;
    const r = await fetchOne(url);
    console.log('\n=== ' + label + ' [' + r.status + '] ===');
    console.log(r.body || r.error || '(empty)');
    await new Promise(r => setTimeout(r, 500));
  }
}

run();
