import { getCoreServerEnv } from "./core-env";

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export async function getLiveMintCount() {
  const env = getCoreServerEnv();
  const backendBaseUrl = normalizeUrl(env.backendBaseUrl || "");
  if (!backendBaseUrl) return null;

  const url = `${backendBaseUrl}/api/public/mint-count`;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const payload = await response.json();
    if (!response.ok) return null;
    const mintedCount = Number(payload?.mintedCount);
    return Number.isFinite(mintedCount) ? mintedCount : null;
  } catch {
    return null;
  }
}
