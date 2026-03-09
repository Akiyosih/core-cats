function usage() {
  console.error(
    [
      "Usage: node ./scripts/probe-public-origin.mjs <origin> [options]",
      "",
      "Options:",
      "  --quantity <1|2|3>                Create a mint session with this quantity (default: 1)",
      "  --expected-chain-id <n>           Fail if the session reports a different chain id",
      "  --expected-network <name>         Fail if the session reports a different network name",
      "  --expected-contract <cb...>       Fail if the session reports a different CoreCats address",
      "  --expect-relayer <true|false>     Fail if relayerEnabled differs",
      "  --watch                           Poll the created session until timeout",
      "  --watch-seconds <n>               Poll timeout in seconds when --watch is used (default: 180)",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  if (argv.length < 3) {
    usage();
    process.exit(1);
  }

  const args = {
    origin: argv[2].replace(/\/$/, ""),
    quantity: 1,
    expectedChainId: null,
    expectedNetwork: "",
    expectedContract: "",
    expectRelayer: null,
    watch: false,
    watchSeconds: 180,
  };

  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--quantity") {
      args.quantity = Number(next);
      i += 1;
    } else if (arg === "--expected-chain-id") {
      args.expectedChainId = Number(next);
      i += 1;
    } else if (arg === "--expected-network") {
      args.expectedNetwork = String(next || "").trim();
      i += 1;
    } else if (arg === "--expected-contract") {
      args.expectedContract = String(next || "").trim();
      i += 1;
    } else if (arg === "--expect-relayer") {
      args.expectRelayer = String(next || "").trim().toLowerCase() === "true";
      i += 1;
    } else if (arg === "--watch") {
      args.watch = true;
    } else if (arg === "--watch-seconds") {
      args.watchSeconds = Number(next);
      i += 1;
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(1);
    }
  }

  if (!/^https?:\/\//.test(args.origin)) {
    console.error("Origin must start with http:// or https://");
    process.exit(1);
  }
  if (!Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > 3) {
    console.error("Quantity must be 1, 2, or 3");
    process.exit(1);
  }
  if (args.watch && (!Number.isFinite(args.watchSeconds) || args.watchSeconds < 1)) {
    console.error("--watch-seconds must be a positive number");
    process.exit(1);
  }

  return args;
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 200)}`);
  }
  return text;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${payload.detail || payload.error || "request failed"}`);
  }
  return payload;
}

function inferMintPageState(html) {
  if (html.includes("Mint opens soon.")) return "closed";
  if (html.includes("Canary Live")) return "canary";
  if (html.includes("Public Live")) return "public";
  return "unknown";
}

function captureField(html, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<strong>${escapedLabel}:<\\/strong>\\s*(?:<!-- -->)?\\s*([^<\\n]+)`, "i"),
    new RegExp(`${escapedLabel}:\\s*([^<\\n]+)`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return "";
}

function printSection(title) {
  console.log(`\n[${title}]`);
}

function printSessionSummary(session) {
  console.log(`session_id=${session.sessionId}`);
  console.log(`status=${session.status}`);
  console.log(`chain_id=${session.chainId}`);
  console.log(`network_name=${session.networkName}`);
  console.log(`corecats_address=${session.coreCatsAddress}`);
  console.log(`relayer_enabled=${session.relayerEnabled}`);
  console.log(`expires_at=${session.expiresAt}`);
  if (session.identify?.mobileUri) console.log(`identify_mobile_uri=${session.identify.mobileUri}`);
  if (session.identify?.desktopUri) console.log(`identify_desktop_uri=${session.identify.desktopUri}`);
  if (session.commit?.mobileUri) console.log(`commit_mobile_uri=${session.commit.mobileUri}`);
  if (session.commit?.desktopUri) console.log(`commit_desktop_uri=${session.commit.desktopUri}`);
  if (session.commit?.txHash) console.log(`commit_tx_hash=${session.commit.txHash}`);
  if (session.finalize?.mobileUri) console.log(`finalize_mobile_uri=${session.finalize.mobileUri}`);
  if (session.finalize?.desktopUri) console.log(`finalize_desktop_uri=${session.finalize.desktopUri}`);
  if (session.finalize?.txHash) console.log(`finalize_tx_hash=${session.finalize.txHash}`);
  if (session.identify?.coreId) console.log(`core_id=${session.identify.coreId}`);
}

function validateSession(session, args) {
  const errors = [];

  if (args.expectedChainId != null && Number(session.chainId) !== args.expectedChainId) {
    errors.push(`expected chain id ${args.expectedChainId}, got ${session.chainId}`);
  }
  if (args.expectedNetwork && String(session.networkName || "").toLowerCase() !== args.expectedNetwork.toLowerCase()) {
    errors.push(`expected network ${args.expectedNetwork}, got ${session.networkName}`);
  }
  if (
    args.expectedContract &&
    String(session.coreCatsAddress || "").toLowerCase() !== args.expectedContract.toLowerCase()
  ) {
    errors.push(`expected contract ${args.expectedContract}, got ${session.coreCatsAddress}`);
  }
  if (args.expectRelayer != null && Boolean(session.relayerEnabled) !== args.expectRelayer) {
    errors.push(`expected relayerEnabled=${args.expectRelayer}, got ${session.relayerEnabled}`);
  }

  if (errors.length) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exitCode = 1;
  }
}

async function readSession(origin, sessionId) {
  return fetchJson(`${origin}/api/mint/corepass/session?sessionId=${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });
}

async function watchSession(origin, initialSession, watchSeconds) {
  const deadline = Date.now() + watchSeconds * 1000;
  let lastFingerprint = "";

  while (Date.now() < deadline) {
    const session = await readSession(origin, initialSession.sessionId);
    const fingerprint = JSON.stringify({
      status: session.status,
      coreId: session.identify?.coreId || "",
      commitTx: session.commit?.txHash || "",
      finalizeTx: session.finalize?.txHash || "",
      finalizeStatus: session.finalize?.status || "",
    });

    if (fingerprint !== lastFingerprint) {
      printSection("Session Update");
      printSessionSummary(session);
      lastFingerprint = fingerprint;
    }

    if (session.status === "finalized" || session.finalize?.status === "confirmed") {
      return session;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`session watch timed out after ${watchSeconds}s`);
}

async function main() {
  const args = parseArgs(process.argv);

  const mintHtml = await fetchText(`${args.origin}/mint`, { cache: "no-store" });
  const transparencyHtml = await fetchText(`${args.origin}/transparency`, { cache: "no-store" });

  printSection("Public Pages");
  console.log(`origin=${args.origin}`);
  console.log(`mint_page_state=${inferMintPageState(mintHtml)}`);
  const transparencyNetwork = captureField(transparencyHtml, "Network");
  const transparencyLaunchState = captureField(transparencyHtml, "Launch state");
  const transparencyContractStatus = captureField(transparencyHtml, "Contract status");
  const transparencyContract = captureField(transparencyHtml, "Contract");
  if (transparencyNetwork) console.log(`transparency_network=${transparencyNetwork}`);
  if (transparencyLaunchState) console.log(`transparency_launch_state=${transparencyLaunchState}`);
  if (transparencyContractStatus) console.log(`transparency_contract_status=${transparencyContractStatus}`);
  if (transparencyContract) console.log(`transparency_contract=${transparencyContract}`);

  const session = await fetchJson(`${args.origin}/api/mint/corepass/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity: args.quantity }),
  });

  printSection("Created Session");
  printSessionSummary(session);
  validateSession(session, args);

  if (!args.watch) {
    return;
  }

  const finalSession = await watchSession(args.origin, session, args.watchSeconds);
  printSection("Watch Complete");
  printSessionSummary(finalSession);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
