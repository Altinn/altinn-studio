"""Mint a Designer user API key for the benchmark runner — LOCAL DEV ONLY.

The agent API and the Gitea proxy authenticate `X-Api-Key` against
Designer's `api_keys` table (SHA-256 of HashSalt + raw key). Gitea
personal access tokens are a different credential system and do NOT
work. Creating a key normally requires a logged-in browser session;
for the local docker stack this script does what setup.js does for
Gitea state — write it straight into the database via `docker exec`.

    python -m benchmarks.bootstrap_api_key [--username localgiteaadmin] \
        [--name benchmark-runner] [--write-env]

Idempotent: an existing non-revoked key with the same name is revoked
and replaced (raw keys are unrecoverable from their hashes, so rotation
is the only option). `--write-env` upserts AGENT_DESIGNER_API_KEY in
`benchmarks/.env`.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import secrets
import subprocess
import sys
from pathlib import Path

DESIGNER_CONTAINER = "studio-designer"
DB_CONTAINER = "studio-db"
DB_ARGS = ["psql", "-U", "designer_admin", "-d", "designerdb", "-tA", "-c"]
KEY_LIFETIME_DAYS = 364  # ApiKeySettings.MaxExpiryDays is 365


def _docker_exec(container: str, *command: str) -> str:
    result = subprocess.run(
        ["docker", "exec", container, *command], capture_output=True, text=True
    )
    if result.returncode != 0:
        sys.exit(f"docker exec {container} failed: {result.stderr.strip()}")
    return result.stdout


def _sql(query: str) -> str:
    return _docker_exec(DB_CONTAINER, *DB_ARGS, query).strip()


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def _hash_salt() -> str:
    # appsettings.json is JSONC (comments allowed) — regex-extract the one
    # value we need instead of parsing the whole document.
    content = _docker_exec(DESIGNER_CONTAINER, "cat", "/app/appsettings.json")
    match = re.search(r'"HashSalt"\s*:\s*"([^"]+)"', content)
    if not match:
        sys.exit("ApiKeySettings.HashSalt not found in the designer container's appsettings.json")
    return match.group(1)


def _write_env(raw_key: str) -> None:
    env_path = Path(__file__).parent / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    lines = [l for l in lines if not l.startswith("AGENT_DESIGNER_API_KEY=")]
    lines.append(f"AGENT_DESIGNER_API_KEY={raw_key}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote AGENT_DESIGNER_API_KEY to {env_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--username", default="localgiteaadmin")
    parser.add_argument("--name", default="benchmark-runner")
    parser.add_argument("--write-env", action="store_true")
    args = parser.parse_args()

    account_id = _sql(
        f"SELECT id FROM designer.user_accounts WHERE username = '{_sql_literal(args.username)}';"
    )
    if not account_id:
        sys.exit(
            f"No user account {args.username!r} in Designer — log into Studio once "
            "so the account exists, then re-run."
        )

    raw_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256((_hash_salt() + raw_key).encode()).hexdigest()

    _sql(
        "UPDATE designer.api_keys SET revoked = true "
        f"WHERE user_account_id = '{_sql_literal(account_id)}' "
        f"AND name = '{_sql_literal(args.name)}' AND revoked = false;"
    )
    _sql(
        "INSERT INTO designer.api_keys "
        "(key_hash, user_account_id, name, token_type, expires_at, revoked, created_at) "
        f"VALUES ('{key_hash}', '{_sql_literal(account_id)}', '{_sql_literal(args.name)}', 0, "
        f"now() + interval '{KEY_LIFETIME_DAYS} days', false, now());"
    )

    print(f"Created API key {args.name!r} for {args.username} (expires in {KEY_LIFETIME_DAYS}d)")
    print(f"\n  AGENT_DESIGNER_API_KEY={raw_key}\n")
    if args.write_env:
        _write_env(raw_key)


if __name__ == "__main__":
    main()
