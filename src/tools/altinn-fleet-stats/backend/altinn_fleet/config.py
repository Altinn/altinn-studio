from __future__ import annotations

import json
import os
from pathlib import Path
from typing import ClassVar, Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


# Fields the user can edit at runtime via the UI (persisted to runtime_config.json)
RUNTIME_FIELDS = {
    "env",
    "source_kind",
    "source_owners",
    "git_username",
    "git_token",
    "dev_git_username",
    "dev_git_token",
    "fetch_concurrency",
    "scan_concurrency",
    "allow_gitea_write",
    "upgrade_concurrency",
    "studioctl_auto_update",
}

# Fields whose values should be masked when read by the UI
SECRET_FIELDS = {"git_token", "dev_git_token"}


class Settings(BaseSettings):
    """Runtime configuration. Loaded from env vars at startup, then overlaid
    with runtime_config.json (managed by the UI)."""

    model_config = SettingsConfigDict(env_prefix="FLEET_", env_file=".env", extra="ignore")

    # Where apps come from.
    #   env  — apps deployed in an Altinn runtime environment (prod/tt02),
    #          discovered through kuberneteswrapper. The original behaviour.
    #   gitea — every app repository owned by the selected organisations (and
    #           optionally the signed-in user), discovered through the Gitea
    #           API. Includes apps that were never deployed anywhere, which is
    #           the point. Listing the user's own repositories needs `read:user`
    #           on the token; orgs only need `read:organization`.
    source_kind: Literal["env", "gitea"] = "env"

    # Owners (organisation logins, and/or the signed-in user's login) to pull
    # apps from when source_kind is "gitea". A list, because "everything my
    # token can see" usually spans several organisations.
    source_owners: list[str] = []

    # Which Altinn environment to scan, when source_kind is "env"
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

    # ---- v9-upgrade ----
    # Keep studioctl on the newest published release automatically. Turn off
    # to pin whatever the image shipped with — an older studioctl still works,
    # it just migrates with the rules it knows.
    studioctl_auto_update: bool = True

    # How many apps may be upgraded at once. Each job shells out to studioctl,
    # so this is a real resource limit, not a preference.
    upgrade_concurrency: int = 3

    # Whether the upgrade may push a branch and open a pull request. Off by
    # default, so an upgrade run is a dry run until someone deliberately turns
    # it on. While it is off, every working tree also gets its push URL blanked
    # and a refusing pre-push hook installed.
    #
    # This switch is a convenience, not the guarantee. What a token may do is
    # enforced by Gitea: a `read:repository` token cannot open a pull request
    # no matter what this says. Give the dev token write and leave the
    # altinn.studio token read-only, and production repos stay untouchable.
    allow_gitea_write: bool = False

    # Cache TTL for the deployments API (seconds)
    deployments_cache_ttl: int = 3600

    # Concurrency for fetching/scanning
    fetch_concurrency: int = 8
    scan_concurrency: int = 8

    # Web server
    host: str = "0.0.0.0"
    port: int = 9091

    @property
    def source_key(self) -> str:
        """Short id for the current source. Each source keeps its own clone
        directory and database, so switching back and forth is lossless."""
        if self.source_kind == "gitea" and self.source_owners:
            owners = sorted(self.source_owners)
            if len(owners) == 1:
                return f"gitea-{owners[0]}"
            # Keep it readable for a couple of owners, stable for many.
            joined = "+".join(owners)
            if len(joined) <= 48:
                return f"gitea-{joined}"
            import hashlib
            digest = hashlib.sha256(joined.encode()).hexdigest()[:8]
            return f"gitea-{len(owners)}owners-{digest}"
        return self.env

    @property
    def source_label(self) -> str:
        if self.source_kind == "gitea" and self.source_owners:
            owners = sorted(self.source_owners)
            if len(owners) <= 3:
                return "alle apper i " + ", ".join(owners)
            return f"alle apper i {len(owners)} organisasjoner"
        return f"deployet i {self.env}"

    @property
    def apps_dir(self) -> Path:
        return self.data_dir / f"apps-{self.source_key}"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / ".cache"

    @property
    def db_path(self) -> Path:
        return self.data_dir / f"fleet-{self.source_key}.sqlite"

    @property
    def apps_base_url(self) -> str:
        # `{org}.apps.altinn.no` for prod, `{org}.apps.tt02.altinn.no` for tt02
        if self.env == "prod":
            return "{org}.apps.altinn.no"
        return "{org}.apps.tt02.altinn.no"

    @property
    def orgs_url(self) -> str:
        return "https://altinncdn.no/orgs/altinn-orgs.json"

    # Studio hosts, in the order the fetcher already tries them. The upgrade
    # reuses exactly this — no separate instance setting.
    STUDIO_HOSTS: ClassVar[tuple[str, ...]] = (
        "https://altinn.studio", "https://dev.altinn.studio")

    def studio_credentials(self, base: str) -> tuple[str, str]:
        """(username, token) for a Studio host, from the existing config."""
        if "dev.altinn.studio" in base:
            return self.dev_git_username, self.dev_git_token
        return self.git_username, self.git_token

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
