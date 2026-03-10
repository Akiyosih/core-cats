from __future__ import annotations

import json
import re
from dataclasses import dataclass
from itertools import count
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError


CALL_METHODS = ("xcb_call", "eth_call")
BLOCK_NUMBER_METHODS = ("xcb_blockNumber", "eth_blockNumber")
RECEIPT_METHODS = ("xcb_getTransactionReceipt", "eth_getTransactionReceipt")

MINTED_PER_ADDRESS_SELECTOR = "0xd445b978"
RESERVED_PER_ADDRESS_SELECTOR = "0x8eb23fb7"
PENDING_COMMIT_SELECTOR = "0x89f1e3f2"

_REQUEST_IDS = count(1)
_HEX_40_RE = re.compile(r"[0-9a-f]{40}")
_ICAN_RE = re.compile(r"[a-z]{2}[0-9a-f]{42}")


class RpcError(RuntimeError):
    pass


@dataclass(frozen=True)
class PendingCommitState:
    quantity: int
    finalize_block: int
    expiry_block: int
    commit_hash: str

    @property
    def exists(self) -> bool:
        return self.quantity > 0


@dataclass(frozen=True)
class WalletMintState:
    current_block: int
    minted: int
    reserved: int
    effective_reserved: int
    pending_commit: PendingCommitState

    @property
    def pending_commit_active(self) -> bool:
        return self.pending_commit.exists and self.current_block <= self.pending_commit.expiry_block

    @property
    def pending_commit_expired(self) -> bool:
        return self.pending_commit.exists and self.current_block > self.pending_commit.expiry_block

    @property
    def available_slots(self) -> int:
        return max(0, 3 - self.minted - self.effective_reserved)


@dataclass(frozen=True)
class TransactionReceipt:
    tx_hash: str
    block_number: int
    success: bool | None


def core_address_to_hex(value: str) -> str:
    raw = str(value or "").strip().lower()
    if raw.startswith("0x") and len(raw) == 42 and _HEX_40_RE.fullmatch(raw[2:]):
        return raw
    if len(raw) == 40 and _HEX_40_RE.fullmatch(raw):
        return f"0x{raw}"
    if len(raw) == 44 and _ICAN_RE.fullmatch(raw):
        return f"0x{raw[4:]}"
    raise ValueError(f"Unsupported Core address format: {value}")


def core_address_to_xcb_rpc(value: str) -> str:
    raw = str(value or "").strip().lower()
    if raw.startswith("0x") and len(raw) == 46 and _ICAN_RE.fullmatch(raw[2:]):
        return raw
    if raw.startswith("0x") and len(raw) == 42 and _HEX_40_RE.fullmatch(raw[2:]):
        return raw
    if len(raw) == 44 and _ICAN_RE.fullmatch(raw):
        return f"0x{raw}"
    if len(raw) == 40 and _HEX_40_RE.fullmatch(raw):
        return f"0x{raw}"
    raise ValueError(f"Unsupported Core address format: {value}")


def _parse_hex_int(value: object) -> int:
    if value is None:
        return 0
    if isinstance(value, int):
        return value
    raw = str(value).strip()
    if not raw:
        return 0
    if raw.startswith("0x"):
        return int(raw, 16)
    return int(raw)


def _pad_32(value: str) -> str:
    return value.rjust(64, "0")


def _encode_address_call(selector: str, address: str) -> str:
    body = core_address_to_hex(address)[2:]
    return f"{selector}{_pad_32(body)}"


def _split_words(data: str) -> list[str]:
    raw = data[2:] if data.startswith("0x") else data
    if not raw:
        return []
    raw = raw.ljust(((len(raw) + 63) // 64) * 64, "0")
    return [raw[index : index + 64] for index in range(0, len(raw), 64)]


def _decode_uint_word(data: str, index: int) -> int:
    words = _split_words(data)
    if index >= len(words):
        return 0
    return int(words[index], 16)


class CoreRpcClient:
    def __init__(self, rpc_url: str, *, timeout_seconds: int = 10):
        self._rpc_url = rpc_url
        self._timeout_seconds = timeout_seconds

    def _request(self, methods: tuple[str, ...], params: list[object]) -> object:
        last_error: Exception | None = None

        for method in methods:
            payload = {
                "jsonrpc": "2.0",
                "id": next(_REQUEST_IDS),
                "method": method,
                "params": params,
            }
            request = urllib_request.Request(
                self._rpc_url,
                data=json.dumps(payload, ensure_ascii=True).encode("utf-8"),
                headers={"content-type": "application/json"},
                method="POST",
            )

            try:
                with urllib_request.urlopen(request, timeout=self._timeout_seconds) as response:
                    body = json.loads(response.read().decode("utf-8"))
            except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
                last_error = RpcError(f"{method} failed: {error}")
                continue

            if isinstance(body, dict) and body.get("error"):
                detail = body["error"]
                if isinstance(detail, dict):
                    message = detail.get("message") or detail.get("code") or detail
                else:
                    message = detail
                last_error = RpcError(f"{method} failed: {message}")
                continue

            if isinstance(body, dict) and "result" in body:
                return body["result"]

            last_error = RpcError(f"{method} returned an invalid JSON-RPC response")

        raise last_error or RpcError("RPC request failed")

    def get_block_number(self) -> int:
        return _parse_hex_int(self._request(BLOCK_NUMBER_METHODS, []))

    def eth_call(self, contract_address: str, data: str, block_tag: str = "latest") -> str:
        last_error: Exception | None = None

        for method in CALL_METHODS:
            to_address = core_address_to_xcb_rpc(contract_address) if method == "xcb_call" else core_address_to_hex(contract_address)
            try:
                result = self._request(
                    (method,),
                    [
                        {
                            "to": to_address,
                            "data": data,
                        },
                        block_tag,
                    ],
                )
            except Exception as error:  # noqa: BLE001
                last_error = error
                continue

            if isinstance(result, str) and result.startswith("0x"):
                return result
            last_error = RpcError(f"{method} did not return a hex payload")

        raise last_error or RpcError("contract call failed")

    def get_wallet_mint_state(self, contract_address: str, minter: str) -> WalletMintState:
        current_block = self.get_block_number()
        minted = _decode_uint_word(self.eth_call(contract_address, _encode_address_call(MINTED_PER_ADDRESS_SELECTOR, minter)), 0)
        reserved = _decode_uint_word(
            self.eth_call(contract_address, _encode_address_call(RESERVED_PER_ADDRESS_SELECTOR, minter)),
            0,
        )
        pending_raw = self.eth_call(contract_address, _encode_address_call(PENDING_COMMIT_SELECTOR, minter))
        pending_words = _split_words(pending_raw)
        pending_commit = PendingCommitState(
            quantity=_decode_uint_word(pending_raw, 0),
            finalize_block=_decode_uint_word(pending_raw, 1),
            expiry_block=_decode_uint_word(pending_raw, 2),
            commit_hash=f"0x{pending_words[3]}" if len(pending_words) > 3 else "0x0",
        )

        effective_reserved = reserved
        if pending_commit.exists and current_block > pending_commit.expiry_block:
            effective_reserved = max(0, reserved - pending_commit.quantity)

        return WalletMintState(
            current_block=current_block,
            minted=minted,
            reserved=reserved,
            effective_reserved=effective_reserved,
            pending_commit=pending_commit,
        )

    def get_transaction_receipt(self, tx_hash: str) -> TransactionReceipt | None:
        result = self._request(RECEIPT_METHODS, [tx_hash])
        if result in (None, ""):
            return None
        if not isinstance(result, dict):
            raise RpcError("transaction receipt did not return an object")

        status_value = result.get("status")
        success: bool | None
        if status_value is None:
            success = None
        else:
            success = _parse_hex_int(status_value) != 0

        return TransactionReceipt(
            tx_hash=str(result.get("transactionHash") or tx_hash),
            block_number=_parse_hex_int(result.get("blockNumber")),
            success=success,
        )
