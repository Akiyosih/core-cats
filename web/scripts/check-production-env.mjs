import path from "node:path";
import { loadEnvSource, validateProductionEnv } from "./check-production-env-lib.mjs";

function printList(label, items) {
  for (const item of items) {
    console.log(`${label}: ${item}`);
  }
}

function main() {
  const arg = process.argv[2] || ".env.production.local";
  let source;
  try {
    source = loadEnvSource(path.resolve(process.cwd(), arg));
  } catch (error) {
    console.error(`ERROR: failed to read env file: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }
  const { sourceLabel, env } = source;
  const result = validateProductionEnv(env);

  console.log(`Checked: ${sourceLabel}`);
  console.log(`  launch_state=${result.normalized.launchState || "(missing)"}`);
  console.log(`  site_surface=${result.normalized.siteSurface || "(default)"}`);
  console.log(`  backend_mode=${result.normalized.backendMode || "(missing)"}`);
  console.log(`  backend_base_url=${result.normalized.backendBaseUrl || "(missing)"}`);

  if (result.warnings.length) {
    printList("WARN", result.warnings);
  }

  if (result.errors.length) {
    printList("ERROR", result.errors);
    process.exitCode = 1;
    return;
  }

  console.log("Production env OK");
}

main();
