const T='c163e921d2f39af815c5598cb991d84a';
const tests=[
 ['v2/cn/area/forecast','https://api.open.geovisearth.com/v2/cn/area/forecast?location=WTX_CH101060101&token='+T],
 ['v2/cn/weather','https://api.open.geovisearth.com/v2/cn/weather?location=126.55,43.82&token='+T],
 ['v1/weather/now','https://api.open.geovisearth.com/v1/weather/now?location=43.82,126.55&token='+T],
 ['v1/cn/weather','https://api.open.geovisearth.com/v1/cn/weather?location=126.55,43.82&token='+T],
];
(async()=>{
for(const[n,u] of tests){
try{
 const r=await fetch(u);
 const t=await r.text();
 console.log('['+n+']',r.status,t.substring(0,300));
}catch(e){console.log('['+n+']','FAIL',e.message.substring(0,100));}
}
console.log('\nDone.');
})();
