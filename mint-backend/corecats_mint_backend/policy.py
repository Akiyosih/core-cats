from __future__ import annotations

from dataclasses import dataclass

from .rpc import WalletMintState


MAX_PER_ADDRESS = 3


class AuthorizationRejected(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class AuthorizationPrecheckResult:
    minted: int
    reserved: int
    available_slots: int
    pending_commit_active: bool
    finalize_block: int
    expiry_block: int
    current_block: int
    max_per_address: int = MAX_PER_ADDRESS


def evaluate_authorization_precheck(wallet_state: WalletMintState, quantity: int) -> AuthorizationPrecheckResult:
    if wallet_state.pending_commit_active:
        raise AuthorizationRejected(
            "pending_commit_exists",
            "This wallet already has a pending commit waiting for finalize.",
        )

    total_after_request = wallet_state.minted + wallet_state.effective_reserved + quantity
    if total_after_request > MAX_PER_ADDRESS:
        raise AuthorizationRejected(
            "wallet_limit_reached",
            "This wallet is already at the maximum of 3 cats for the standard mint path.",
        )

    return AuthorizationPrecheckResult(
        minted=wallet_state.minted,
        reserved=wallet_state.effective_reserved,
        available_slots=max(0, MAX_PER_ADDRESS - wallet_state.minted - wallet_state.effective_reserved),
        pending_commit_active=wallet_state.pending_commit_active,
        finalize_block=wallet_state.pending_commit.finalize_block,
        expiry_block=wallet_state.pending_commit.expiry_block,
        current_block=wallet_state.current_block,
    )
