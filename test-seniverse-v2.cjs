const crypto = require('crypto');
const uid = 'PyrvBwg3hZBQzCeON';
const key = 'Sy_0RBNTnyL-jaBgg';

function makeSig() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const paramStr = 'ts=' + ts + '&ttl=300&uid=' + uid;
  const hmac = crypto.createHmac('sha1', key).update(paramStr).digest('base64');
  return paramStr + '&sig=' + encodeURIComponent(hmac);
}

const list = [
  { path: '/v3/weather/now.json?location=beijing&language=zh-Hans&unit=c', label: '实况' },
  { path: '/v3/weather/daily.json?location=beijing&language=zh-Hans&unit=c&start=0&days=3', label: '天预报' },
  { path: '/v3/weather/hourly.json?location=beijing&language=zh-Hans&unit=c&start=0&hours=24', label: '小时预报' },
  { path: '/v3/life/suggestion.json?location=beijing&language=zh-Hans', label: '生活指数' },
  { path: '/v3/air/now.json?location=beijing&language=zh-Hans', label: '空气实况' },
];

function test(i) {
  if (i >= list.length) { console.log('\n=== DONE ==='); return; }
  const item = list[i];
  const sig = makeSig();
  const url = 'https://api.seniverse.com' + item.path + '&' + sig;
  require('https').get(url, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
      console.log('\n[' + r.statusCode + '] ' + item.label);
      console.log(d.substring(0, 500));
      setTimeout(() => test(i + 1), 600);
    });
  }).on('error', e => { console.log('\n[ERR] ' + item.label + ': ' + e.message); setTimeout(() => test(i + 1), 600); });
}

test(0);
