import crypto from "crypto";

const appKey = "bkodxwfviny8zzpm";
const appSecret = "wHvqgtMadcdF6jXD9sCLJ7BBSh5XDcHq";
const lng = "126.5432", lat = "43.8714";
const nonce = crypto.randomUUID();
const ts = String(Math.floor(Date.now() / 1000));

function sign(method, path, query, nonce, timestamp) {
  const sortedKeys = Object.keys(query).sort();
  const queryStr = sortedKeys.map(k => encodeURIComponent(k) + "=" + encodeURIComponent(query[k])).join("&");
  const stringToSign = [method, path, queryStr, appKey, nonce, String(timestamp)].join(":");
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(stringToSign);
  return { sig: hmac.digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), sts: stringToSign };
}

// v2.6 /weather
const path26 = `/v2.6/${appKey}/${lng},${lat}/weather`;
const query26 = { alert: "true", dailysteps: "1", hourlysteps: "24" };
const r26 = sign("GET", path26, query26, nonce, ts);
console.log("v2.6 sts:", r26.sts);
console.log("v2.6 sig:", r26.sig);

const url26 = `https://api.caiyunapp.com/v2.6/${appKey}/${lng},${lat}/weather?alert=true&dailysteps=1&hourlysteps=24`;
try {
  const res = await fetch(url26, {
    headers: { "x-cy-nonce": nonce, "x-cy-timestamp": ts, "x-cy-signature": r26.sig }
  });
  const data = await res.text();
  console.log("v2.6 HTTP", res.status, data.substring(0, 300));
} catch(e) {
  console.log("v2.6 err:", e.cause?.code || e.message);
}
