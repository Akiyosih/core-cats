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

export function describeMintRuntimeMisconfiguration(config = getCorePublicConfig()) {
  const errors = Array.isArray(config.mintRuntimeErrors) ? config.mintRuntimeErrors : [];
  if (errors.length > 0) {
    return errors[0];
  }
  return "Mint is temporarily unavailable because this deployment is missing required runtime configuration.";
}

export function mintRuntimeMisconfiguredResponse(config = getCorePublicConfig()) {
  return Response.json(
    {
      error: "mint_runtime_misconfigured",
      detail: describeMintRuntimeMisconfiguration(config),
      errors: Array.isArray(config.mintRuntimeErrors) ? config.mintRuntimeErrors : [],
    },
    { status: 503 },
  );
}
