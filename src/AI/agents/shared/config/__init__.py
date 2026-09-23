"""Shared configuration for the Altinity Agents system"""

from .base_config import BaseConfig, get_config, default_role_model, resolved_role_models

__all__ = [
    "BaseConfig",
    "get_config",
    "default_role_model",
    "resolved_role_models",
]