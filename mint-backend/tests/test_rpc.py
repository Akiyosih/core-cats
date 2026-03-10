from __future__ import annotations

import unittest

from corecats_mint_backend.rpc import (
    MINTED_PER_ADDRESS_SELECTOR,
    PENDING_COMMIT_SELECTOR,
    RESERVED_PER_ADDRESS_SELECTOR,
    core_address_to_hex,
    core_address_to_xcb_rpc,
)


class CoreAddressTests(unittest.TestCase):
    def test_core_address_to_hex_strips_ican_prefix_and_check_digits(self) -> None:
        self.assertEqual(
            core_address_to_hex("cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416"),
            "0xcc64595127da8b1f7d4a03f7e0e1f4562409b416",
        )

    def test_core_address_to_hex_accepts_existing_hex_address(self) -> None:
        self.assertEqual(
            core_address_to_hex("0xcc64595127da8b1f7d4a03f7e0e1f4562409b416"),
            "0xcc64595127da8b1f7d4a03f7e0e1f4562409b416",
        )

    def test_core_address_to_xcb_rpc_keeps_network_prefix_for_ican_address(self) -> None:
        self.assertEqual(
            core_address_to_xcb_rpc("cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a"),
            "0xcb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
        )

    def test_core_address_to_xcb_rpc_accepts_existing_hex_address(self) -> None:
        self.assertEqual(
            core_address_to_xcb_rpc("0xcc64595127da8b1f7d4a03f7e0e1f4562409b416"),
            "0xcc64595127da8b1f7d4a03f7e0e1f4562409b416",
        )

    def test_public_mapping_getter_selectors_match_corecats_contract(self) -> None:
        self.assertEqual(MINTED_PER_ADDRESS_SELECTOR, "0xd445b978")
        self.assertEqual(RESERVED_PER_ADDRESS_SELECTOR, "0x8eb23fb7")
        self.assertEqual(PENDING_COMMIT_SELECTOR, "0x89f1e3f2")


if __name__ == "__main__":
    unittest.main()
