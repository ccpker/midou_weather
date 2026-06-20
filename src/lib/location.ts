/**
 * 定位服务 — GPS + 高德逆地理编码
 * 
 * 策略:
 * 1. Capacitor Geolocation 拿经纬度 (高精度模式)
 * 2. 高德逆地理编码 → 街道级地址
 * 3. 写入 Zustand Store
 */

import { useWeatherStore } from "@/lib/store";
import { SOURCE_CONFIG } from "@/lib/config";

/** 定位 + 逆地理 -> Store */
export async function locateUser(): Promise<void> {
  const store = useWeatherStore.getState();

  // 高德 IP 定位兜底
  const { lat, lng } = await getCoords();
  store.setLocation({ lat, lng, address: "定位中...", district: "", updatedAt: new Date().toISOString() });

  // 逆地理
  const address = await regeo(lat, lng);
  store.setLocation({ lat, lng, address, district: address, updatedAt: new Date().toISOString() });
}

/**
 * 获取坐标
 * 生产环境: Capacitor Geolocation (GPS/基站/WiFi)
 * 开发环境: 高德 IP 定位兜底
 */
async function getCoords(): Promise<{ lat: number; lng: number }> {
  // 尝试 Capacitor Geolocation
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location === "granted" || perm.location === "prompt") {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1分钟缓存
      });
      if (pos.coords) {
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
    }
  } catch {
    // Capacitor 不可用 (开发/浏览器环境)
  }

  // 兜底: 高德 IP 定位
  return ipLocate();
}

/** 高德 IP 定位 (无需 GPS) */
async function ipLocate(): Promise<{ lat: number; lng: number }> {
  const key = SOURCE_CONFIG.amap.key;
  try {
    const url = `https://restapi.amap.com/v3/ip?key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "1" && data.rectangle) {
      // rectangle: "126.1,43.7;126.8,44.0" → 取中心
      const [sw, ne] = data.rectangle.split(";");
      const [lng1, lat1] = sw.split(",").map(Number);
      const [lng2, lat2] = ne.split(",").map(Number);
      return { lat: (lat1 + lat2) / 2, lng: (lng1 + lng2) / 2 };
    }
  } catch {}
  // 最终兜底: 吉林市坐标
  return { lat: 43.8377, lng: 126.5494 };
}

/** 高德逆地理编码 → 街道级地址 */
async function regeo(lat: number, lng: number): Promise<string> {
  const key = SOURCE_CONFIG.amap.key;
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base&radius=1000`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "1" && data.regeocode) {
      const addr = data.regeocode.addressComponent;
      if (addr.streetNumber?.street && addr.streetNumber?.number) {
        return `${addr.district}·${addr.street} ${addr.streetNumber.number}号`;
      }
      return data.regeocode.formatted_address ?? "未知位置";
    }
  } catch {}
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}
