const crypto = require('crypto');
const uid = 'PyrvBwg3hZBQzCeON';
const key = 'Sy_0RBNTnyL-jaBgg';
const ts = Math.floor(Date.now() / 1000).toString();
const ttl = '300';
const params = 'ts=' + ts + '&ttl=' + ttl + '&uid=' + uid;
const sig = crypto.createHmac('sha1', key).update(params).digest('base64');
const sigEnc = encodeURIComponent(sig);
const url = 'https://api.seniverse.com/v3/weather/now.json?location=beijing&language=zh-Hans&unit=c&' + params + '&sig=' + sigEnc;
console.log('Testing 心知API...');
require('https').get(url, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('Status', res.statusCode, '| Body:', d));
}).on('error', e => console.error('ERR:', e.message));
