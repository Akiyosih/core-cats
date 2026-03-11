from __future__ import annotations

import base64
import json
from dataclasses import dataclass

from .rpc import CoreRpcClient, RpcError, core_address_to_xcb_rpc

TRANSFER_EVENT_TOPIC = "0xc17a9d92b89f27cb79cc390f23a1a5d302fefab8c7911075ede952ac2b5607a1"
METADATA_RENDERER_SELECTOR = "0x7a63f1ab"
OWNER_OF_SELECTOR = "0x3753ff5b"
TOKEN_URI_SELECTOR = "0xa89da637"


@dataclass(frozen=True)
class TokenEvidence:
    token_id: int
    owner: str
    token_uri: str
    metadata: dict[str, object]


def encode_uint256_call(selector: str, value: int) -> str:
    return f"{selector}{value:064x}"


def decode_address_result(data: str) -> str:
    raw = data[2:] if data.startswith("0x") else data
    if len(raw) < 44:
        raise ValueError("address result too short")
    return raw[-44:]


def decode_abi_string_result(data: str) -> str:
    raw = bytes.fromhex(data[2:] if data.startswith("0x") else data)
    if len(raw) < 64:
        raise ValueError("abi string result too short")
    offset = int.from_bytes(raw[:32], "big")
    if len(raw) < offset + 32:
        raise ValueError("abi string offset out of range")
    length = int.from_bytes(raw[offset : offset + 32], "big")
    start = offset + 32
    end = start + length
    if len(raw) < end:
        raise ValueError("abi string payload out of range")
    return raw[start:end].decode("utf-8")


def decode_token_uri_metadata(token_uri: str) -> dict[str, object]:
    prefix = "data:application/json;base64,"
    if not token_uri.startswith(prefix):
        raise ValueError("tokenURI is not an on-chain JSON data URI")
    metadata = json.loads(base64.b64decode(token_uri[len(prefix) :]))
    image = str(metadata.get("image") or "")
    if not image.startswith("data:image/svg+xml;base64,"):
        raise ValueError("metadata image is not an on-chain SVG data URI")
    return metadata


def _normalized_contract_address(contract_address: str) -> str:
    return core_address_to_xcb_rpc(contract_address).removeprefix("0x").lower()


def parse_assigned_token_ids_from_receipt(receipt: dict[str, object], contract_address: str) -> list[int]:
    contract = _normalized_contract_address(contract_address)
    token_ids: list[int] = []

    for log in receipt.get("logs", []):
        if not isinstance(log, dict):
            continue
        if str(log.get("address") or "").removeprefix("0x").lower() != contract:
            continue
        topics = log.get("topics")
        if not isinstance(topics, list) or len(topics) < 4:
            continue
        if str(topics[0]).lower() != TRANSFER_EVENT_TOPIC:
            continue
        if int(str(topics[1]), 16) != 0:
            continue
        token_ids.append(int(str(topics[3]), 16))

    return token_ids


def fetch_metadata_renderer(client: CoreRpcClient, contract_address: str) -> str:
    return decode_address_result(client.eth_call(contract_address, METADATA_RENDERER_SELECTOR))


def fetch_owner_of(client: CoreRpcClient, contract_address: str, token_id: int) -> str:
    return decode_address_result(client.eth_call(contract_address, encode_uint256_call(OWNER_OF_SELECTOR, token_id)))


def fetch_token_uri(client: CoreRpcClient, contract_address: str, token_id: int) -> str:
    return decode_abi_string_result(client.eth_call(contract_address, encode_uint256_call(TOKEN_URI_SELECTOR, token_id)))


def collect_token_evidence(client: CoreRpcClient, contract_address: str, token_ids: list[int]) -> list[TokenEvidence]:
    evidence: list[TokenEvidence] = []
    for token_id in token_ids:
        token_uri = fetch_token_uri(client, contract_address, token_id)
        evidence.append(
            TokenEvidence(
                token_id=token_id,
                owner=fetch_owner_of(client, contract_address, token_id),
                token_uri=token_uri,
                metadata=decode_token_uri_metadata(token_uri),
            )
        )
    return evidence


def list_owner_tokens(client: CoreRpcClient, contract_address: str, owner_address: str, max_supply: int = 1000) -> list[int]:
    target = core_address_to_xcb_rpc(owner_address).removeprefix("0x").lower()
    token_ids: list[int] = []
    for token_id in range(1, max_supply + 1):
        try:
            owner = fetch_owner_of(client, contract_address, token_id)
        except RpcError:
            continue
        if owner.lower() == target:
            token_ids.append(token_id)
    return token_ids
