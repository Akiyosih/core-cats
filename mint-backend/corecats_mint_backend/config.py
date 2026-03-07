from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Config:
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


def _read_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    return int(raw) if raw else default


def load_config() -> Config:
    repo_root = Path(__file__).resolve().parents[2]
    default_foxar_dir = repo_root / "foxar"
    default_db_dir = repo_root / "mint-backend" / "data"
    default_db_dir.mkdir(parents=True, exist_ok=True)

    deployer_private_key = os.environ.get("DEPLOYER_PRIVATE_KEY", "").strip()
    mint_signer_private_key = os.environ.get("MINT_SIGNER_PRIVATE_KEY", "").strip() or deployer_private_key
    finalizer_private_key = os.environ.get("FINALIZER_PRIVATE_KEY", "").strip() or deployer_private_key

    return Config(
        bind=os.environ.get("CORECATS_BACKEND_BIND", "127.0.0.1").strip(),
        port=_read_int("CORECATS_BACKEND_PORT", 8787),
        db_path=Path(os.environ.get("CORECATS_BACKEND_DB_PATH", str(default_db_dir / "corecats-mint.db"))).expanduser(),
        shared_secret=os.environ.get("CORECATS_BACKEND_SHARED_SECRET", "").strip(),
        rpc_url=os.environ.get("CORE_TESTNET_RPC_URL", "https://xcbapi-arch-devin.coreblockchain.net/").strip(),
        chain_id=_read_int("CORE_CHAIN_ID", 3),
        network_id=_read_int("CORE_NETWORK_ID", 3),
        network_name=os.environ.get("CORE_NETWORK_NAME", "devin").strip(),
        explorer_base_url=os.environ.get("CORE_EXPLORER_BASE_URL", "https://xab.blockindex.net").strip().rstrip("/"),
        corecats_address=os.environ.get("CORECATS_ADDRESS", "ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba").strip(),
        foxar_dir=Path(os.environ.get("CORECATS_FOXAR_DIR", str(default_foxar_dir))).expanduser(),
        spark_path=Path(os.environ.get("SPARK_PATH", str(Path.home() / ".foxar" / "bin" / "spark"))).expanduser(),
        deployer_private_key=deployer_private_key,
        mint_signer_private_key=mint_signer_private_key,
        finalizer_private_key=finalizer_private_key,
    )
