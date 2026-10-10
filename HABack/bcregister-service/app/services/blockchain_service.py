"""Anclaje de hashes en Polygon vía AsyncWeb3 (sin PII on-chain)."""

from __future__ import annotations

import logging
import uuid

from eth_account import Account
from web3 import AsyncWeb3
from web3.providers import AsyncHTTPProvider

from app.config import Settings

logger = logging.getLogger(__name__)


class BlockchainService:
    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._w3 = AsyncWeb3(AsyncHTTPProvider(settings.polygon_rpc_url))
        self._account = Account.from_key(settings.polygon_private_key)

    async def anchor_hash(self, *, process_id: str, content_hash: str) -> str:
        """
        Envía a Polygon solo process_id + sha256.
        Retorna tx_hash hex (con o sin 0x según el nodo; normalizamos a 0x...).
        """
        if self._s.polygon_dry_run:
            fake = "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:32]
            logger.info(
                "[dry-run] ancla process_id=%s hash=%s… tx=%s",
                process_id,
                content_hash[:12],
                fake[:18],
            )
            return fake

        if not await self._w3.is_connected():
            raise RuntimeError("RPC Polygon no disponible")

        # Marcador off-chain: HA|<process_id>|<32-byte hash>
        marker = b"HA|" + process_id.encode("utf-8")[:64] + b"|" + bytes.fromhex(content_hash)
        data = "0x" + marker.hex()

        to_addr = self._s.polygon_contract_address or self._account.address
        to_checksum = AsyncWeb3.to_checksum_address(to_addr)
        nonce = await self._w3.eth.get_transaction_count(self._account.address)
        gas_price = await self._w3.eth.gas_price

        tx = {
            "type": 2,
            "chainId": self._s.polygon_chain_id,
            "nonce": nonce,
            "to": to_checksum,
            "value": 0,
            "data": data,
            "gas": 120_000,
            "maxFeePerGas": int(gas_price * 2),
            "maxPriorityFeePerGas": int(gas_price),
        }
        signed = self._account.sign_transaction(tx)
        tx_hash = await self._w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = await self._w3.eth.wait_for_transaction_receipt(
            tx_hash,
            timeout=180,
            poll_latency=2.0,
        )
        if getattr(receipt, "status", 0) != 1:
            raise RuntimeError(f"Transacción revertida: {tx_hash.to_0x_hex()}")

        hex_hash = (
            tx_hash.to_0x_hex()
            if hasattr(tx_hash, "to_0x_hex")
            else (tx_hash.hex() if hasattr(tx_hash, "hex") else str(tx_hash))
        )
        if not hex_hash.startswith("0x"):
            hex_hash = f"0x{hex_hash}"
        logger.info("Anclado process_id=%s tx=%s", process_id, hex_hash)
        return hex_hash
