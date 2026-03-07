from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass

from .config import Config


@dataclass(frozen=True)
class SparkResult:
    stdout: str
    stderr: str


def _parse_required(name: str, pattern: str, text: str) -> str:
    match = re.search(pattern, text)
    if not match:
        raise RuntimeError(f"Failed to parse {name} from spark output")
    return match.group(1)


def run_spark_script(
    config: Config,
    script_spec: str,
    *,
    env_overrides: dict[str, str] | None = None,
    broadcast: bool = False,
    energy_estimate_multiplier: int | None = None,
) -> SparkResult:
    env = os.environ.copy()
    env.update(
        {
            "CORE_TESTNET_RPC_URL": config.rpc_url,
            "CORE_RPC_URL": config.rpc_url,
            "CORE_NETWORK_ID": str(config.network_id),
            "SPARK_PATH": str(config.spark_path),
            "CORECATS_ADDRESS": config.corecats_address,
        }
    )
    if config.deployer_private_key:
        env["DEPLOYER_PRIVATE_KEY"] = config.deployer_private_key
    if env_overrides:
        env.update({key: str(value) for key, value in env_overrides.items() if value is not None})

    command = [
        str(config.spark_path),
        "script",
        script_spec,
        "--fork-url",
        config.rpc_url,
        "--network-id",
        str(config.network_id),
    ]

    if energy_estimate_multiplier:
        command.extend(["--energy-estimate-multiplier", str(energy_estimate_multiplier)])
    if broadcast:
        command.append("--broadcast")

    completed = subprocess.run(
        command,
        cwd=config.foxar_dir,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        message = "\n".join(part for part in [completed.stdout, completed.stderr] if part)
        raise RuntimeError(message or f"spark exited with code {completed.returncode}")
    return SparkResult(stdout=completed.stdout, stderr=completed.stderr)


def issue_mint_authorization(config: Config, *, minter: str, quantity: int, nonce: str, expiry: int) -> dict[str, object]:
    if not config.mint_signer_private_key:
        raise RuntimeError("Mint signer key is not configured")

    result = run_spark_script(
        config,
        "script/CoreCatsIssueMintAuthorization.s.sol:CoreCatsIssueMintAuthorizationScript",
        env_overrides={
            "MINT_TO": minter,
            "MINT_QUANTITY": str(quantity),
            "MINT_NONCE": str(nonce),
            "MINT_EXPIRY": str(expiry),
            "MINT_SIGNER_PRIVATE_KEY": config.mint_signer_private_key,
            "MINT_CHAIN_ID": str(config.chain_id),
        },
    )

    stdout = result.stdout
    return {
        "minter": _parse_required("minter", r"minter:\s+address\s+([^\s]+)", stdout),
        "quantity": int(_parse_required("quantity", r"quantity:\s+uint8\s+(\d+)", stdout)),
        "nonce": _parse_required("nonce", r"nonce:\s+uint256\s+(\d+)", stdout),
        "expiry": int(_parse_required("expiry", r"expiry:\s+uint256\s+(\d+)", stdout)),
        "chainId": int(_parse_required("chainId", r"chainId:\s+uint256\s+(\d+)", stdout)),
        "messageHash": _parse_required("messageHash", r"messageHash:\s+bytes32\s+(0x[0-9a-fA-F]+)", stdout),
        "signature": _parse_required("signature", r"signature:\s+bytes\s+(0x[0-9a-fA-F]+)", stdout),
    }


def relay_finalize_mint(config: Config, *, minter: str, energy_estimate_multiplier: int = 250) -> dict[str, str]:
    if not config.finalizer_private_key:
        raise RuntimeError("Finalizer key is not configured")

    result = run_spark_script(
        config,
        "script/CoreCatsFinalizeMint.s.sol:CoreCatsFinalizeMintScript",
        env_overrides={
            "DEPLOYER_PRIVATE_KEY": config.finalizer_private_key,
            "MINTER_ADDRESS": minter,
        },
        broadcast=True,
        energy_estimate_multiplier=energy_estimate_multiplier,
    )

    stdout = result.stdout
    tx_hash = _parse_required("tx hash", r"✅ Hash:\s+(0x[0-9a-fA-F]+)", stdout)
    return {"txHash": tx_hash}
