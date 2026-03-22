import { PUBLIC_TEASER_CONTRACT_SURFACE } from "./public-teaser-contract-surface.js";

const DEFAULT_MAINNET_MINT_BASE_URL = "https://core-cats-mint.vercel.app";
const OFFICIAL_MAINNET_CORECATS_ADDRESS = "cb40316dcf944c9c2d4d1381653753a514e5e01d5df3";

function normalizeLaunchState(value) {
  return value === "canary" || value === "public" || value === "closed" ? value : "closed";
}

function normalizeSiteSurface(value, launchState) {
  if (value === "public-teaser" || value === "private-canary" || value === "public-mint") {
    return value;
  }
  if (launchState === "public") {
    return "public-mint";
  }
  if (launchState === "canary") {
    return "private-canary";
  }
  return "public-teaser";
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export function getPublicRuntimeConfig() {
  const configuredLaunchState = normalizeLaunchState(
    process.env.NEXT_PUBLIC_LAUNCH_STATE || process.env.CORECATS_LAUNCH_STATE || "closed",
  );
  const siteSurface = normalizeSiteSurface(
    process.env.NEXT_PUBLIC_SITE_SURFACE || process.env.CORECATS_SITE_SURFACE || "public-teaser",
    configuredLaunchState,
  );
  const siteBaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_BASE_URL || "");
  const networkName = process.env.CORE_NETWORK_NAME || "devin";
  const coreCatsAddress = process.env.NEXT_PUBLIC_CORECATS_ADDRESS || PUBLIC_TEASER_CONTRACT_SURFACE.coreCatsAddress || "";
  const launchState =
    siteSurface === "public-teaser" &&
    networkName === "mainnet" &&
    String(coreCatsAddress || "").trim().toLowerCase() === OFFICIAL_MAINNET_CORECATS_ADDRESS
      ? "public"
      : configuredLaunchState;
  const explicitMintBaseUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_CORECATS_MINT_BASE_URL || process.env.CORECATS_MINT_BASE_URL || "",
  );

  return {
    chainId: Number(process.env.NEXT_PUBLIC_CORE_CHAIN_ID || 3),
    networkName,
    launchState,
    siteSurface,
    publicTeaserSite: siteSurface === "public-teaser",
    privateCanarySite: siteSurface === "private-canary",
    publicMintSite: siteSurface === "public-mint",
    mintSurfaceEnabled: launchState !== "closed" && (siteSurface === "private-canary" || siteSurface === "public-mint"),
    siteBaseUrl,
    mintBaseUrl:
      explicitMintBaseUrl ||
      (siteSurface === "public-mint" ? siteBaseUrl : networkName === "mainnet" ? DEFAULT_MAINNET_MINT_BASE_URL : ""),
    browseBaseUrl: normalizeUrl(process.env.NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL || process.env.CORECATS_BROWSE_BASE_URL || ""),
    mintOnlyHost: false,
    statusSnapshotUrl: String(process.env.NEXT_PUBLIC_CORECATS_STATUS_URL || "").trim(),
    explorerBaseUrl: process.env.NEXT_PUBLIC_CORE_EXPLORER_BASE_URL || PUBLIC_TEASER_CONTRACT_SURFACE.explorerBaseUrl || "",
    coreCatsAddress,
    coreCatsRendererAddress:
      process.env.NEXT_PUBLIC_CORECATS_RENDERER_ADDRESS || PUBLIC_TEASER_CONTRACT_SURFACE.coreCatsRendererAddress || "",
    coreCatsDataAddress:
      process.env.NEXT_PUBLIC_CORECATS_DATA_ADDRESS || PUBLIC_TEASER_CONTRACT_SURFACE.coreCatsDataAddress || "",
    privateCanaryBadgeText: (process.env.NEXT_PUBLIC_PRIVATE_CANARY_BADGE_TEXT || "PRIVATE CANARY").trim(),
    privateCanaryTitleText: (process.env.NEXT_PUBLIC_PRIVATE_CANARY_TITLE_TEXT || "Private rehearsal canary").trim(),
    privateCanaryWarningText: (process.env.NEXT_PUBLIC_PRIVATE_CANARY_WARNING_TEXT || "NOT PUBLIC MINT").trim(),
  };
}
