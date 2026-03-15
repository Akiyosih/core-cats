from __future__ import annotations

import unittest

from corecats_mint_backend.policy import AuthorizationRejected, evaluate_authorization_precheck
from corecats_mint_backend.rpc import PendingCommitState, WalletMintState


class AuthorizationPrecheckTests(unittest.TestCase):
    def test_rejects_wallet_limit_before_authorization(self) -> None:
        wallet_state = WalletMintState(
            current_block=100,
            minted=3,
            reserved=0,
            effective_reserved=0,
            pending_commit=PendingCommitState(quantity=0, finalize_block=0, expiry_block=0, commit_hash="0x0"),
            available_supply=100,
        )

        with self.assertRaises(AuthorizationRejected) as raised:
            evaluate_authorization_precheck(wallet_state, 1)

        self.assertEqual(raised.exception.code, "wallet_limit_reached")
        self.assertEqual(
            str(raised.exception),
            "A single wallet can mint up to 3 cats through the standard mint path. This request would exceed that cumulative limit.",
        )

    def test_rejects_request_that_would_exceed_cumulative_limit(self) -> None:
        wallet_state = WalletMintState(
            current_block=100,
            minted=2,
            reserved=0,
            effective_reserved=0,
            pending_commit=PendingCommitState(quantity=0, finalize_block=0, expiry_block=0, commit_hash="0x0"),
            available_supply=100,
        )

        with self.assertRaises(AuthorizationRejected) as raised:
            evaluate_authorization_precheck(wallet_state, 2)

        self.assertEqual(raised.exception.code, "wallet_limit_reached")
        self.assertEqual(
            str(raised.exception),
            "A single wallet can mint up to 3 cats through the standard mint path. This request would exceed that cumulative limit.",
        )

    def test_rejects_active_pending_commit_before_authorization(self) -> None:
        wallet_state = WalletMintState(
            current_block=100,
            minted=1,
            reserved=1,
            effective_reserved=1,
            pending_commit=PendingCommitState(quantity=1, finalize_block=101, expiry_block=300, commit_hash="0xabc"),
            available_supply=100,
        )

        with self.assertRaises(AuthorizationRejected) as raised:
            evaluate_authorization_precheck(wallet_state, 1)

        self.assertEqual(raised.exception.code, "pending_commit_exists")

    def test_ignores_expired_reserved_quantity_when_capacity_is_available(self) -> None:
        wallet_state = WalletMintState(
            current_block=301,
            minted=1,
            reserved=2,
            effective_reserved=0,
            pending_commit=PendingCommitState(quantity=2, finalize_block=101, expiry_block=300, commit_hash="0xabc"),
            available_supply=100,
        )

        result = evaluate_authorization_precheck(wallet_state, 2)
        self.assertEqual(result.minted, 1)
        self.assertEqual(result.reserved, 0)
        self.assertEqual(result.available_slots, 2)
        self.assertEqual(result.available_supply, 100)

    def test_rejects_when_remaining_unreserved_supply_is_lower_than_quantity(self) -> None:
        wallet_state = WalletMintState(
            current_block=100,
            minted=0,
            reserved=0,
            effective_reserved=0,
            pending_commit=PendingCommitState(quantity=0, finalize_block=0, expiry_block=0, commit_hash="0x0"),
            available_supply=1,
        )

        with self.assertRaises(AuthorizationRejected) as raised:
            evaluate_authorization_precheck(wallet_state, 2)

        self.assertEqual(raised.exception.code, "sold_out")
        self.assertEqual(
            str(raised.exception),
            "The remaining unreserved supply is lower than this requested quantity.",
        )


if __name__ == "__main__":
    unittest.main()
