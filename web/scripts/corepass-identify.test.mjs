import test from "node:test";
import assert from "node:assert/strict";

import { resolveIdentifyCoreId } from "../lib/server/corepass-mint-sessions.js";

test("resolveIdentifyCoreId prefers callback coreId when present", () => {
  assert.equal(resolveIdentifyCoreId("cb123", "cb999"), "cb123");
});

test("resolveIdentifyCoreId falls back to expected coreId for self-only pilot sessions", () => {
  assert.equal(resolveIdentifyCoreId("", "cb999"), "cb999");
});
