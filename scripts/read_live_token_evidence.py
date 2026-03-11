#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MINT_BACKEND_ROOT = REPO_ROOT / "mint-backend"
if str(MINT_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(MINT_BACKEND_ROOT))

from corecats_mint_backend.rpc import CoreRpcClient  # noqa: E402
from corecats_mint_backend.token_evidence import (  # noqa: E402
    collect_token_evidence,
    fetch_metadata_renderer,
    list_owner_tokens,
    parse_assigned_token_ids_from_receipt,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Read live CoreCats token evidence over xcb_call without spark address parsing."
    )
    parser.add_argument("--rpc-url", required=True, help="Core mainnet RPC URL")
    parser.add_argument("--contract-address", required=True, help="CoreCats contract address (cb... or 0x...)")
    parser.add_argument("--token-id", dest="token_ids", action="append", type=int, default=[], help="Token id to read")
    parser.add_argument("--finalize-tx", help="Finalize tx hash; derives token ids from Transfer logs")
    parser.add_argument("--owner-address", help="Owner address; scans ownerOf across supply")
    parser.add_argument("--max-supply", type=int, default=1000, help="Upper bound when scanning owner tokens")
    parser.add_argument("--emit-token-uri", action="store_true", help="Include the full tokenURI in the output")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    client = CoreRpcClient(args.rpc_url)
    token_ids = list(args.token_ids)

    if args.finalize_tx:
        receipt = client.get_raw_transaction_receipt(args.finalize_tx)
        token_ids.extend(parse_assigned_token_ids_from_receipt(receipt, args.contract_address))

    if args.owner_address:
        token_ids.extend(list_owner_tokens(client, args.contract_address, args.owner_address, max_supply=args.max_supply))

    token_ids = sorted(set(token_ids))
    if not token_ids:
        parser.error("No token ids resolved. Pass --token-id, --finalize-tx, or --owner-address.")

    evidence = collect_token_evidence(client, args.contract_address, token_ids)
    payload = {
        "contractAddress": args.contract_address,
        "metadataRenderer": fetch_metadata_renderer(client, args.contract_address),
        "tokenIds": token_ids,
        "tokens": [],
    }

    for item in evidence:
        token_payload = {
            "tokenId": item.token_id,
            "owner": item.owner,
            "name": item.metadata.get("name"),
            "description": item.metadata.get("description"),
            "attributesCount": len(item.metadata.get("attributes", [])),
            "imagePrefix": str(item.metadata.get("image") or "")[:26],
            "tokenUriPrefix": item.token_uri[:29],
        }
        if args.emit_token_uri:
            token_payload["tokenURI"] = item.token_uri
        payload["tokens"].append(token_payload)

    print(json.dumps(payload, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
