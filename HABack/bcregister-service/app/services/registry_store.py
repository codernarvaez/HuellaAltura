"""Store de seguimiento in-memory (MVP). En prod: Redis/Postgres."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Literal

from fastapi import HTTPException, status

Status = Literal["pending", "confirmed", "failed"]


@dataclass
class RegistryEntry:
    tracking_id: str
    process_id: str
    content_hash: str
    status: Status = "pending"
    tx_hash: str | None = None
    error: str | None = None
    extra: dict = field(default_factory=dict)


class RegistryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._items: dict[str, RegistryEntry] = {}

    def create(self, tracking_id: str, process_id: str, content_hash: str) -> RegistryEntry:
        entry = RegistryEntry(
            tracking_id=tracking_id,
            process_id=process_id,
            content_hash=content_hash,
            status="pending",
        )
        with self._lock:
            self._items[tracking_id] = entry
        return entry

    def set_status(self, tracking_id: str, status_value: Status) -> None:
        with self._lock:
            entry = self._items.get(tracking_id)
            if entry:
                entry.status = status_value

    def set_confirmed(self, tracking_id: str, tx_hash: str) -> None:
        with self._lock:
            entry = self._items.get(tracking_id)
            if entry:
                entry.status = "confirmed"
                entry.tx_hash = tx_hash
                entry.error = None

    def set_failed(self, tracking_id: str, error: str) -> None:
        with self._lock:
            entry = self._items.get(tracking_id)
            if entry:
                entry.status = "failed"
                entry.error = error[:500]

    def get(self, tracking_id: str) -> RegistryEntry:
        with self._lock:
            entry = self._items.get(tracking_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "not_found",
                    "message": f"tracking_id desconocido: {tracking_id}",
                },
            )
        return entry


# Singleton de proceso (una instancia por worker uvicorn)
registry_store = RegistryStore()
