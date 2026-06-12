"""Backward-compatible re-exports — prefer app.dependencies in new code."""

from app.dependencies import get_current_user, require_roles, log_user_action

__all__ = ["get_current_user", "require_roles", "log_user_action"]
