"""Hash canónico SHA-256 del proceso (sin PII en chain)."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_sha256(payload: dict[str, Any]) -> str:
    """JSON ordenado → SHA-256 hex (64 chars)."""
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
