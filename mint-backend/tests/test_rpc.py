from __future__ import annotations

import unittest

from corecats_mint_backend.rpc import core_address_to_hex


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


if __name__ == "__main__":
    unittest.main()
