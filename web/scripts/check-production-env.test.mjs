import test from "node:test";
import assert from "node:assert/strict";

import { validateProductionEnv } from "./check-production-env-lib.mjs";

function buildBaseEnv(overrides = {}) {
  return {
    NEXT_PUBLIC_LAUNCH_STATE: "closed",
    NEXT_PUBLIC_SITE_SURFACE: "public-teaser",
    NEXT_PUBLIC_SITE_BASE_URL: "https://teaser.example.com",
    NEXT_PUBLIC_CORE_CHAIN_ID: "1",
    CORE_NETWORK_ID: "1",
    CORE_NETWORK_NAME: "mainnet",
    NEXT_PUBLIC_CORE_EXPLORER_BASE_URL: "https://blockindex.net",
    NEXT_PUBLIC_CORECATS_ADDRESS: "replace-with-mainnet-corecats-address",
    CORECATS_BACKEND_MODE: "proxy",
    CORECATS_BACKEND_BASE_URL: "https://backend.example.com",
    CORECATS_BACKEND_SHARED_SECRET: "super-secret-value",
    CORECATS_RELAYER_ENABLED: "true",
    ...overrides,
  };
}

test("closed launch accepts placeholder contract address", () => {
  const result = validateProductionEnv(buildBaseEnv());
  assert.deepEqual(result.errors, []);
});

test("browse-only surface accepts explicit public snapshot url without backend secret", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      CORECATS_BACKEND_BASE_URL: "",
      CORECATS_BACKEND_SHARED_SECRET: "",
      NEXT_PUBLIC_CORECATS_STATUS_URL: "https://status.example.com/api/public/status",
    }),
  );
  assert.deepEqual(result.errors, []);
});

test("canary launch rejects placeholder contract address", () => {
  const result = validateProductionEnv(buildBaseEnv({ NEXT_PUBLIC_LAUNCH_STATE: "canary", NEXT_PUBLIC_SITE_SURFACE: "private-canary" }));
  assert.match(result.errors.join("\n"), /real mainnet contract address/);
});

test("rejects missing backend https origin", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      CORECATS_BACKEND_BASE_URL: "http://backend.example.com",
    }),
  );
  assert.match(result.errors.join("\n"), /must start with https:\/\//);
});

test("private canary accepts loopback internal backend without external backend origin", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      CORECATS_BACKEND_BASE_URL: "",
      CORECATS_INTERNAL_BACKEND_BASE_URL: "http://127.0.0.1:8787",
    }),
  );
  assert.deepEqual(result.errors, []);
});

test("mint surface rejects missing site base url", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      NEXT_PUBLIC_SITE_BASE_URL: "",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
    }),
  );
  assert.match(result.errors.join("\n"), /NEXT_PUBLIC_SITE_BASE_URL is required/);
});

test("mint-only canary requires browse origin", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST: "1",
      NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL: "",
    }),
  );
  assert.match(result.errors.join("\n"), /NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL is required/);
});

test("mint-only canary rejects matching browse and site origins", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST: "1",
      NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL: "https://teaser.example.com",
    }),
  );
  assert.match(result.errors.join("\n"), /must not match NEXT_PUBLIC_SITE_BASE_URL/);
});

test("rejects private keys in Vercel env", () => {
  const result = validateProductionEnv(buildBaseEnv({ MINT_SIGNER_PRIVATE_KEY: "deadbeef" }));
  assert.match(result.errors.join("\n"), /MINT_SIGNER_PRIVATE_KEY must not be present/);
});

test("warns when relayer flag is not true", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      CORECATS_RELAYER_ENABLED: "false",
    }),
  );
  assert.equal(result.errors.length, 0);
  assert.match(result.warnings.join("\n"), /relayer-first path/);
});

test("warns when self-only CoreID pinning is still present in closed state", () => {
  const result = validateProductionEnv(buildBaseEnv({ COREPASS_EXPECTED_CORE_ID: "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416" }));
  assert.equal(result.errors.length, 0);
  assert.match(result.warnings.join("\n"), /generic-wallet canary\/public redeploy/);
});

test("rejects self-only CoreID pinning for canary launch", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      COREPASS_EXPECTED_CORE_ID: "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
    }),
  );
  assert.match(result.errors.join("\n"), /COREPASS_EXPECTED_CORE_ID must be removed/);
});

test("rejects unsupported identify method values", () => {
  const result = validateProductionEnv(buildBaseEnv({ COREPASS_IDENTIFY_METHOD: "typed-data" }));
  assert.match(result.errors.join("\n"), /COREPASS_IDENTIFY_METHOD must be either sign or login/);
});

test("rejects non-public mint surface for public launch", () => {
  const result = validateProductionEnv(
    buildBaseEnv({
      NEXT_PUBLIC_LAUNCH_STATE: "public",
      NEXT_PUBLIC_SITE_SURFACE: "public-teaser",
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
    }),
  );
  assert.match(result.errors.join("\n"), /must be public-mint/);
});
