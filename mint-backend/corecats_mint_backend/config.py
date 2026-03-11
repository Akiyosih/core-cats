from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

DEFAULT_DEVIN_RPC_URL = "https://xcbapi-arch-devin.coreblockchain.net/"
DEFAULT_DEVIN_CORECATS_ADDRESS = "ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba"
DEFAULT_DEVIN_EXPLORER_BASE_URL = "https://xab.blockindex.net"
_HEX_40_RE = re.compile(r"[0-9a-f]{40}")
_ICAN_RE = re.compile(r"[a-z]{2}[0-9a-f]{42}")


@dataclass(frozen=True)
class Config:
    profile: str
    bind: str
    port: int
    db_path: Path
    shared_secret: str
    rpc_url: str
    chain_id: int
    network_id: int
    network_name: str
    explorer_base_url: str
    corecats_address: str
    foxar_dir: Path
    spark_path: Path
    deployer_private_key: str
    mint_signer_private_key: str
    finalizer_private_key: str
    finalizer_address: str
    finalizer_keystore_path: Optional[Path]
    finalizer_password_file: Optional[Path]
    finalize_worker_interval_seconds: int
    finalize_stuck_timeout_seconds: int
    canary_allowed_core_id_keys: frozenset[str]
    public_status_cache_seconds: int


def _read_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    return int(raw) if raw else default


def _normalize_profile(raw: str) -> str:
    profile = raw.strip().lower()
    if profile in {"", "development", "dev", "local"}:
        return "development"
    if profile in {"production", "prod"}:
        return "production"
    raise ValueError("CORECATS_BACKEND_PROFILE must be 'development' or 'production'")


def normalize_core_address_key(value: str) -> str:
    raw = str(value or "").strip().lower()
    if not raw:
        raise ValueError("Core address must not be empty")
    if raw.startswith("0x") and len(raw) == 42 and _HEX_40_RE.fullmatch(raw[2:]):
        return raw
    if len(raw) == 40 and _HEX_40_RE.fullmatch(raw):
        return f"0x{raw}"
    if len(raw) == 44 and _ICAN_RE.fullmatch(raw):
        return f"0x{raw[4:]}"
    raise ValueError(f"Unsupported Core address format: {value}")


def _read_core_id_keys(name: str) -> frozenset[str]:
    raw = os.environ.get(name, "")
    if not raw.strip():
        return frozenset()

    values = set()
    for token in re.split(r"[\s,]+", raw.strip()):
        if not token:
            continue
        values.add(normalize_core_address_key(token))
    return frozenset(values)


def _looks_like_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return normalized == "replace-me" or normalized.startswith("replace-with-")


def validate_config(config: Config) -> None:
    errors: list[str] = []

    if not config.shared_secret:
        errors.append("CORECATS_BACKEND_SHARED_SECRET is required")
    if config.profile == "production" and (
        _looks_like_placeholder(config.shared_secret) or config.shared_secret == "dev-only-secret"
    ):
        errors.append("CORECATS_BACKEND_SHARED_SECRET must not use a placeholder or dev-only value in production")

    if not config.spark_path.is_file():
        errors.append(f"SPARK_PATH does not point to a file: {config.spark_path}")
    if not config.foxar_dir.is_dir():
        errors.append(f"CORECATS_FOXAR_DIR does not point to a directory: {config.foxar_dir}")
    if config.finalizer_keystore_path and not (
        config.finalizer_keystore_path.is_file() or config.finalizer_keystore_path.is_dir()
    ):
        errors.append(
            "FINALIZER_KEYSTORE_PATH does not point to a file or directory: "
            f"{config.finalizer_keystore_path}"
        )
    if config.finalizer_password_file and not config.finalizer_password_file.is_file():
        errors.append(f"FINALIZER_PASSWORD_FILE does not point to a file: {config.finalizer_password_file}")
    if bool(config.finalizer_keystore_path) != bool(config.finalizer_password_file):
        errors.append("FINALIZER_KEYSTORE_PATH and FINALIZER_PASSWORD_FILE must be set together")
    if config.finalizer_address and len(config.finalizer_address) != 44:
        errors.append("FINALIZER_ADDRESS must be a 44-character Core address when set")
    if config.finalize_worker_interval_seconds <= 0:
        errors.append("CORECATS_FINALIZE_WORKER_INTERVAL_SECONDS must be greater than 0")
    if config.finalize_stuck_timeout_seconds <= 0:
        errors.append("CORECATS_FINALIZE_STUCK_TIMEOUT_SECONDS must be greater than 0")
    if config.public_status_cache_seconds <= 0:
        errors.append("CORECATS_PUBLIC_STATUS_CACHE_SECONDS must be greater than 0")

    if config.profile == "production":
        if config.network_name.lower() != "mainnet":
            errors.append("CORE_NETWORK_NAME must be 'mainnet' in production")
        if config.chain_id != 1:
            errors.append("CORE_CHAIN_ID must be 1 in production")
        if config.network_id != 1:
            errors.append("CORE_NETWORK_ID must be 1 in production")
        if config.rpc_url == DEFAULT_DEVIN_RPC_URL:
            errors.append("CORE_RPC_URL / CORE_TESTNET_RPC_URL must not use the default devin RPC in production")
        if config.corecats_address.lower() == DEFAULT_DEVIN_CORECATS_ADDRESS:
            errors.append("CORECATS_ADDRESS must not use the default devin rehearsal address in production")
        if config.explorer_base_url == DEFAULT_DEVIN_EXPLORER_BASE_URL:
            errors.append("CORE_EXPLORER_BASE_URL must not use the default devin explorer in production")
        if _looks_like_placeholder(config.corecats_address) or not config.corecats_address:
            errors.append("CORECATS_ADDRESS must be set to the real mainnet CoreCats contract address in production")
        if not os.environ.get("MINT_SIGNER_PRIVATE_KEY", "").strip():
            errors.append("MINT_SIGNER_PRIVATE_KEY must be explicitly set in production")
        has_finalizer_private_key = bool(os.environ.get("FINALIZER_PRIVATE_KEY", "").strip())
        has_finalizer_keystore = bool(config.finalizer_keystore_path and config.finalizer_password_file)
        if not has_finalizer_private_key and not has_finalizer_keystore:
            errors.append(
                "Either FINALIZER_PRIVATE_KEY or the FINALIZER_KEYSTORE_PATH + FINALIZER_PASSWORD_FILE pair "
                "must be explicitly set in production"
            )
        if has_finalizer_keystore and not config.finalizer_address:
            errors.append("FINALIZER_ADDRESS must be explicitly set when FINALIZER_KEYSTORE_PATH is used in production")

    if errors:
        detail = "\n".join(f"- {item}" for item in errors)
        raise ValueError(f"Invalid mint backend configuration:\n{detail}")


def load_config() -> Config:
    repo_root = Path(__file__).resolve().parents[2]
    default_foxar_dir = repo_root / "foxar"
    default_db_dir = repo_root / "mint-backend" / "data"
    default_db_dir.mkdir(parents=True, exist_ok=True)
    profile = _normalize_profile(os.environ.get("CORECATS_BACKEND_PROFILE", "development"))

    deployer_private_key = os.environ.get("DEPLOYER_PRIVATE_KEY", "").strip()
    mint_signer_private_key = os.environ.get("MINT_SIGNER_PRIVATE_KEY", "").strip() or deployer_private_key
    finalizer_keystore_raw = os.environ.get("FINALIZER_KEYSTORE_PATH", "").strip()
    finalizer_password_file_raw = os.environ.get("FINALIZER_PASSWORD_FILE", "").strip()
    finalizer_private_key = os.environ.get("FINALIZER_PRIVATE_KEY", "").strip()
    finalizer_address = os.environ.get("FINALIZER_ADDRESS", "").strip() or os.environ.get("DEPLOYER_ADDRESS", "").strip()
    if not finalizer_private_key and not finalizer_keystore_raw:
        finalizer_private_key = deployer_private_key

    config = Config(
        profile=profile,
        bind=os.environ.get("CORECATS_BACKEND_BIND", "127.0.0.1").strip(),
        port=_read_int("CORECATS_BACKEND_PORT", 8787),
        db_path=Path(os.environ.get("CORECATS_BACKEND_DB_PATH", str(default_db_dir / "corecats-mint.db"))).expanduser(),
        shared_secret=os.environ.get("CORECATS_BACKEND_SHARED_SECRET", "").strip(),
        rpc_url=(os.environ.get("CORE_RPC_URL", "").strip() or os.environ.get("CORE_TESTNET_RPC_URL", DEFAULT_DEVIN_RPC_URL).strip()),
        chain_id=_read_int("CORE_CHAIN_ID", 3),
        network_id=_read_int("CORE_NETWORK_ID", 3),
        network_name=os.environ.get("CORE_NETWORK_NAME", "devin").strip(),
        explorer_base_url=os.environ.get("CORE_EXPLORER_BASE_URL", DEFAULT_DEVIN_EXPLORER_BASE_URL).strip().rstrip("/"),
        corecats_address=os.environ.get("CORECATS_ADDRESS", DEFAULT_DEVIN_CORECATS_ADDRESS).strip(),
        foxar_dir=Path(os.environ.get("CORECATS_FOXAR_DIR", str(default_foxar_dir))).expanduser(),
        spark_path=Path(os.environ.get("SPARK_PATH", str(Path.home() / ".foxar" / "bin" / "spark"))).expanduser(),
        deployer_private_key=deployer_private_key,
        mint_signer_private_key=mint_signer_private_key,
        finalizer_private_key=finalizer_private_key,
        finalizer_address=finalizer_address,
        finalizer_keystore_path=Path(finalizer_keystore_raw).expanduser() if finalizer_keystore_raw else None,
        finalizer_password_file=Path(finalizer_password_file_raw).expanduser() if finalizer_password_file_raw else None,
        finalize_worker_interval_seconds=_read_int("CORECATS_FINALIZE_WORKER_INTERVAL_SECONDS", 5),
        finalize_stuck_timeout_seconds=_read_int("CORECATS_FINALIZE_STUCK_TIMEOUT_SECONDS", 180),
        canary_allowed_core_id_keys=_read_core_id_keys("CORECATS_CANARY_ALLOWED_CORE_IDS"),
        public_status_cache_seconds=_read_int("CORECATS_PUBLIC_STATUS_CACHE_SECONDS", 120),
    )
    validate_config(config)
    return config
