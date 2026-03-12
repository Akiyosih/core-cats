import { getCorePublicConfig } from "./core-env.js";

export function describeClosedMintSurface(config = getCorePublicConfig()) {
  if (config.launchState === "closed") {
    return "Mint is not open in the closed launch stage.";
  }
  if (config.publicTeaserSite) {
    return "Mint is not available on this public teaser deployment.";
  }
  return "Mint is not available on this deployment.";
}

export function mintSurfaceClosedResponse(config = getCorePublicConfig()) {
  return Response.json(
    {
      error: "mint_surface_closed",
      detail: describeClosedMintSurface(config),
    },
    { status: 404 },
  );
}
