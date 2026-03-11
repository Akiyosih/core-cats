from __future__ import annotations

import base64
import json
import unittest

from corecats_mint_backend.rpc import RpcError
from corecats_mint_backend.token_evidence import (
    decode_abi_string_result,
    decode_token_uri_metadata,
    list_owner_tokens,
    parse_assigned_token_ids_from_receipt,
)


def _abi_string(value: str) -> str:
    raw = value.encode("utf-8")
    padded = raw + (b"\x00" * ((32 - (len(raw) % 32)) % 32))
    return "0x" + (
        (32).to_bytes(32, "big") + len(raw).to_bytes(32, "big") + padded
    ).hex()


class _FakeClient:
    def __init__(self, owners: dict[int, str]):
        self._owners = owners

    def eth_call(self, _contract_address: str, data: str, _block_tag: str = "latest") -> str:
        token_id = int(data[-64:], 16)
        owner = self._owners.get(token_id)
        if owner is None:
            raise RpcError("not minted")
        return "0x" + ("0" * 20) + owner


class TokenEvidenceTests(unittest.TestCase):
    def test_decode_abi_string_result(self) -> None:
        self.assertEqual(decode_abi_string_result(_abi_string("hello")), "hello")

    def test_decode_token_uri_metadata_requires_onchain_svg(self) -> None:
        metadata = {
            "name": "CCATTEST #193",
            "description": "x",
            "image": "data:image/svg+xml;base64," + base64.b64encode(b"<svg/>").decode("ascii"),
            "attributes": [],
        }
        token_uri = "data:application/json;base64," + base64.b64encode(json.dumps(metadata).encode("utf-8")).decode("ascii")
        decoded = decode_token_uri_metadata(token_uri)
        self.assertEqual(decoded["name"], "CCATTEST #193")

    def test_parse_assigned_token_ids_from_receipt_uses_mint_transfers(self) -> None:
        receipt = {
            "logs": [
                {
                    "address": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                    "topics": [
                        "0xc17a9d92b89f27cb79cc390f23a1a5d302fefab8c7911075ede952ac2b5607a1",
                        "0x0000000000000000000000000000000000000000000000000000000000000000",
                        "0x00000000000000000000cb67d63b225c909f0c2b345ca3d2bed46f71d19681a6",
                        "0x00000000000000000000000000000000000000000000000000000000000003b4",
                    ],
                },
                {
                    "address": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                    "topics": [
                        "0xc17a9d92b89f27cb79cc390f23a1a5d302fefab8c7911075ede952ac2b5607a1",
                        "0x0000000000000000000000000000000000000000000000000000000000000000",
                        "0x00000000000000000000cb67d63b225c909f0c2b345ca3d2bed46f71d19681a6",
                        "0x00000000000000000000000000000000000000000000000000000000000000c1",
                    ],
                },
            ]
        }
        self.assertEqual(
            parse_assigned_token_ids_from_receipt(receipt, "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a"),
            [948, 193],
        )

    def test_list_owner_tokens_scans_minted_ids(self) -> None:
        client = _FakeClient(
            {
                193: "cb67d63b225c909f0c2b345ca3d2bed46f71d19681a6",
                271: "cb67d63b225c909f0c2b345ca3d2bed46f71d19681a6",
                948: "cb67d63b225c909f0c2b345ca3d2bed46f71d19681a6",
            }
        )
        self.assertEqual(
            list_owner_tokens(
                client,
                "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                "cb67d63b225c909f0c2b345ca3d2bed46f71d19681a6",
                max_supply=1000,
            ),
            [193, 271, 948],
        )


if __name__ == "__main__":
    unittest.main()
