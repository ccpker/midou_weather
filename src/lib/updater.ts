const REPO = "ccpker/midou_weather";
const CURRENT_VERSION = "4.2.0";

export interface UpdateInfo {
  latest: string;
  current: string;
  hasUpdate: boolean;
  apkUrl: string;
  releaseUrl: string;
  body: string;     // release notes markdown
  publishedAt: string;
}

export async function checkUpdate(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const tagName: string = data.tag_name.replace(/^v/, "");
    const apkAsset = data.assets?.find((a: any) => a.name.endsWith(".apk"));

    return {
      latest: tagName,
      current: CURRENT_VERSION,
      hasUpdate: compareVersions(tagName, CURRENT_VERSION) > 0,
      apkUrl: apkAsset?.browser_download_url ?? data.html_url,
      releaseUrl: data.html_url,
      body: data.body ?? "",
      publishedAt: data.published_at,
    };
  } catch {
    return null;
  }
}

export async function downloadAndInstall(url: string): Promise<boolean> {
  try {
    // Android: open in browser/download-manager → triggers install flow
    window.open(url, "_blank");
    return true;
  } catch {
    return false;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}
