/**
 * 定位服务 — 多级降级策略 + 高德逆地理编码
 *
 * 策略 (按优先级):
 * 1. navigator.geolocation — WebView AOSP 位置框架, 无 GMS 也能用 (国内 ROM 首选)
 * 2. Capacitor Geolocation — 需要 GMS, 仅 Google 服务手机
 * 3. 高德 IP 定位 — 无 GPS 可用时的网络定位
 * 4. 硬编码兜底 — 长春坐标
 * 5. 高德逆地理编码 → 街道级地址
 * 6. 写入 Zustand Store (含精度溯源)
 */

import { useWeatherStore } from "@/lib/store";
import { SOURCE_CONFIG } from "@/lib/config";
import type { LocationSource } from "@/types/weather";

/** 定位 + 逆地理 -> Store */
export async function locateUser(): Promise<void> {
  const store = useWeatherStore.getState();

  // 获取坐标 (含精度信息)
  const { lat, lng, precision, accuracyMeters } = await getCoords();

  // 初步设置坐标
  store.setLocation({
    lat, lng,
    address: "定位中...",
    district: "",
    province: "",
    city: "",
    updatedAt: new Date().toISOString(),
    precision,
    accuracyMeters,
  });

  // 逆地理 → 街道/区/市
  const addr = await regeo(lat, lng);
  store.setLocation({
    lat, lng,
    address: addr.street,
    district: addr.district,
    province: addr.province,
    city: addr.city,
    updatedAt: new Date().toISOString(),
    precision,
    accuracyMeters,
  });
}

type PrecisionResult = {
  lat: number; lng: number;
  precision: LocationSource;
  accuracyMeters: number;
};

/**
 * 获取坐标
 * 优先级: Capacitor GPS → 高德 IP 定位 → hardcoded fallback
 */
async function getCoords(): Promise<PrecisionResult> {
  // 1. 首选 navigator.geolocation (WebView AOSP 位置框架, 无 GMS 也能用)
  //    国内 MIUI/ColorOS/HarmonyOS 等 ROM 都有自有位置服务实现
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("not supported"));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      });
    });
    if (pos.coords) {
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precision: "gps",
        accuracyMeters: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 5,
      };
    }
  } catch {
    // navigator.geolocation 不可用 (少数 ROM 禁止 WebView 定位)
  }

  // 2. 尝试 Capacitor Geolocation (需要 GMS, 仅 Google 服务手机)
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location === "granted" || perm.location === "prompt") {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
      if (pos.coords) {
        return {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: "gps",
          accuracyMeters: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 5,
        };
      }
    }
  } catch {
    // Capacitor 不可用 / 无 GMS
  }

  // 3. 兜底: 高德 IP 定位
  const ip = await ipLocate();
  if (ip) return ip;

  // 4. 最终兜底: 长春坐标
  return {
    lat: 43.8377, lng: 126.5494,
    precision: "fallback",
    accuracyMeters: 50000,
  };
}

/** 高德 IP 定位 (无需 GPS) */
async function ipLocate(): Promise<PrecisionResult | null> {
  const key = SOURCE_CONFIG.amap.key;
  try {
    const url = `https://restapi.amap.com/v3/ip?key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "1" && data.rectangle) {
      const [sw, ne] = data.rectangle.split(";");
      const [lng1, lat1] = sw.split(",").map(Number);
      const [lng2, lat2] = ne.split(",").map(Number);
      // IP 定位精度估算: 矩形对角线长度 → 半径
      const dLat = Math.abs(lat2 - lat1);
      const dLng = Math.abs(lng2 - lng1);
      const approxMeters = Math.round(Math.max(dLat, dLng) * 111000 / 2);
      return {
        lat: (lat1 + lat2) / 2,
        lng: (lng1 + lng2) / 2,
        precision: "ip",
        accuracyMeters: approxMeters,
      };
    }
  } catch {}
  return null;
}

/** 高德逆地理编码 → 街道级地址 + 区/市/省 */
async function regeo(lat: number, lng: number): Promise<{
  street: string; district: string; province: string; city: string;
}> {
  const key = SOURCE_CONFIG.amap.key;
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base&radius=1000`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "1" && data.regeocode) {
      const addr = data.regeocode.addressComponent;
      const street = addr.streetNumber?.street && addr.streetNumber?.number
        ? `${addr.district} · ${addr.streetNumber.street} ${addr.streetNumber.number}号`
        : data.regeocode.formatted_address ?? "未知位置";
      return {
        street,
        district: addr.district || "",
        province: addr.province || "",
        city: (addr.city || addr.district || "").replace(/市$/, ""),
      };
    }
  } catch {}
  return { street: `${lat.toFixed(2)},${lng.toFixed(2)}`, district: "", province: "", city: "" };
}
