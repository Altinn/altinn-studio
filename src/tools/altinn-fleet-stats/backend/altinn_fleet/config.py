from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


# Fields the user can edit at runtime via the UI (persisted to runtime_config.json)
RUNTIME_FIELDS = {
    "env",
    "git_username",
    "git_token",
    "dev_git_username",
    "dev_git_token",
    "fetch_concurrency",
    "scan_concurrency",
}

# Fields whose values should be masked when read by the UI
SECRET_FIELDS = {"git_token", "dev_git_token"}


class Settings(BaseSettings):
    """Runtime configuration. Loaded from env vars at startup, then overlaid
    with runtime_config.json (managed by the UI)."""

    model_config = SettingsConfigDict(env_prefix="FLEET_", env_file=".env", extra="ignore")

    # Which Altinn environment to scan
    env: Literal["prod", "tt02"] = "prod"

    # Where data lives inside the container
    data_dir: Path = Path("/data")

    # Optional auth for cloning from altinn.studio (Gitea PAT).
    # altinn.studio requires auth for all git operations, even public repos.
    git_username: str = ""
    git_token: str = ""

    # Optional auth for dev.altinn.studio (fallback for some apps).
    dev_git_username: str = ""
    dev_git_token: str = ""

    # Cache TTL for the deployments API (seconds)
    deployments_cache_ttl: int = 3600

    # Concurrency for fetching/scanning
    fetch_concurrency: int = 8
    scan_concurrency: int = 8

    # Web server
    host: str = "0.0.0.0"
    port: int = 9091

    @property
    def apps_dir(self) -> Path:
        return self.data_dir / f"apps-{self.env}"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / ".cache"

    @property
    def db_path(self) -> Path:
        return self.data_dir / f"fleet-{self.env}.sqlite"

    @property
    def apps_base_url(self) -> str:
        # `{org}.apps.altinn.no` for prod, `{org}.apps.tt02.altinn.no` for tt02
        if self.env == "prod":
            return "{org}.apps.altinn.no"
        return "{org}.apps.tt02.altinn.no"

    @property
    def orgs_url(self) -> str:
        return "https://altinncdn.no/orgs/altinn-orgs.json"

    @classmethod
    def current(cls) -> "Settings":
        """Build a fresh Settings reading env vars, then overlay runtime_config.json."""
        base = cls()
        overlay = load_runtime_config(base.data_dir)
        valid = {
            k: v for k, v in overlay.items()
            if k in cls.model_fields and v not in (None, "")
        }
        if not valid:
            return base
        merged = {**base.model_dump(), **valid}
        return cls(**merged)


def runtime_config_path(data_dir: Optional[Path] = None) -> Path:
    d = data_dir or Path(os.environ.get("FLEET_DATA_DIR", "/data"))
    return d / "runtime_config.json"


def load_runtime_config(data_dir: Optional[Path] = None) -> dict:
    p = runtime_config_path(data_dir)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def save_runtime_config(updates: dict, data_dir: Optional[Path] = None) -> dict:
    """Merge updates into runtime_config.json. Only allowed fields are saved."""
    current = load_runtime_config(data_dir)
    for k, v in updates.items():
        if k not in RUNTIME_FIELDS:
            continue
        # Empty string clears the field. None means "don't change".
        if v is None:
            continue
        current[k] = v
    p = runtime_config_path(data_dir)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(current, indent=2))
    try:
        p.chmod(0o600)
    except OSError:
        pass
    return current
