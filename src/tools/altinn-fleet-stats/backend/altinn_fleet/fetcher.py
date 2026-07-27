"""Fetch Altinn 3 apps from altinn.studio.

Python port of the existing fetch.sh logic, with:
- Concurrent cloning (asyncio + httpx + subprocess)
- Token-based auth support
- Progress callbacks for streaming to UI
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator, Callable, Optional

import httpx

from .config import Settings


@dataclass
class FetchEvent:
    kind: str            # "info" | "progress" | "done" | "error"
    message: str
    app_id: str = ""
    current: int = 0
    total: int = 0


class Fetcher:
    def __init__(self, settings: Settings):
        self.s = settings
        self.s.apps_dir.mkdir(parents=True, exist_ok=True)
        self.s.cache_dir.mkdir(parents=True, exist_ok=True)

    # ---------- HTTP helpers ----------

    async def _get_json(self, client: httpx.AsyncClient, url: str, cache_file: Path) -> list | dict:
        """GET with file cache. Returns parsed JSON."""
        if cache_file.exists():
            age = time.time() - cache_file.stat().st_mtime
            if age < self.s.deployments_cache_ttl:
                return json.loads(cache_file.read_text())
        resp = await client.get(url, timeout=30)
        resp.raise_for_status()
        cache_file.write_text(resp.text)
        return resp.json()

    async def list_orgs(self, client: httpx.AsyncClient) -> list[str]:
        cache = self.s.cache_dir / "orgs.json"
        data = await self._get_json(client, self.s.orgs_url, cache)
        return list(data.get("orgs", {}).keys())

    async def list_deployments(self, client: httpx.AsyncClient, org: str) -> list[dict]:
        base = self.s.apps_base_url.format(org=org)
        url = f"https://{base}/kuberneteswrapper/api/v1/deployments"
        cache = self.s.cache_dir / f"deployments-{org}-{self.s.env}.json"
        try:
            data = await self._get_json(client, url, cache)
        except httpx.HTTPError:
            return []
        return [d for d in data if d.get("release", "") and "kuberneteswrapper" not in d["release"]]

    async def find_repo_commit(
        self, client: httpx.AsyncClient, org: str, app: str, version: str
    ) -> tuple[str, str]:
        """Returns (repo_url, commit_sha). Falls back to dev.altinn.studio if not found in prod."""

        async def try_releases(base: str, host: str) -> Optional[str]:
            cache = self.s.cache_dir / f"releases-{host}-{org}-{app}.json"
            url = f"{base}/designer/api/{org}/{app}/releases"
            try:
                data = await self._get_json(client, url, cache)
            except httpx.HTTPError:
                return None
            for rel in data.get("results", []) or []:
                if rel.get("tagName") == version:
                    return rel.get("targetCommitish") or ""
            return None

        commit = await try_releases("https://altinn.studio", "prod")
        if commit:
            return (self._auth_url("https://altinn.studio", f"/repos/{org}/{app}.git"), commit)

        commit = await try_releases("https://dev.altinn.studio", "dev")
        if commit:
            return (self._auth_url("https://dev.altinn.studio", f"/repos/{org}/{app}.git", dev=True), commit)

        # Default to prod repo without a known commit (will fall back to main)
        return (self._auth_url("https://altinn.studio", f"/repos/{org}/{app}.git"), "")

    def _auth_url(self, base: str, path: str, dev: bool = False) -> str:
        """Inject credentials into HTTPS URL for git clone.

        altinn.studio (Gitea) requires authentication for all git operations,
        even on public repos. Accept either:
          - username + token (standard Basic Auth), or
          - token only (uses 'oauth2' as the dummy username, which Gitea accepts).
        """
        user = self.s.dev_git_username if dev else self.s.git_username
        token = self.s.dev_git_token if dev else self.s.git_token
        if not token:
            return f"{base}{path}"
        if not user:
            user = "oauth2"
        scheme, rest = base.split("://", 1)
        return f"{scheme}://{user}:{token}@{rest}{path}"

    # ---------- Clone/update ----------

    async def _git(self, *args: str, cwd: Optional[Path] = None) -> tuple[int, str, str]:
        proc = await asyncio.create_subprocess_exec(
            "git", *args,
            cwd=str(cwd) if cwd else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        )
        out, err = await proc.communicate()
        return proc.returncode or 0, out.decode(errors="replace"), err.decode(errors="replace")

    async def ensure_app(self, org: str, app: str, repo_url: str, commit: str) -> str:
        """Clone or update one app. Returns status: 'cloned' | 'updated' | 'up-to-date' | 'failed'."""
        folder = f"{org}-{self.s.env}-{app}"
        target = self.s.apps_dir / folder
        failed_marker = target / "fetch-failed.txt"

        if (target / ".git").exists():
            head = (target / ".git" / "HEAD").read_text().strip()
            if commit and head == commit:
                return "up-to-date"
            await self._git("fetch", "-q", "origin", cwd=target)
            if commit:
                rc, _, err = await self._git("checkout", "-q", commit, cwd=target)
                if rc != 0:
                    if "unable to read tree" in err:
                        # Fall back to remote HEAD
                        rc2, branch_out, _ = await self._git("remote", "show", "origin", cwd=target)
                        branch = "main"
                        for line in branch_out.splitlines():
                            if "HEAD branch" in line:
                                branch = line.strip().split()[-1]
                        await self._git("checkout", "-q", branch, cwd=target)
                        await self._git("reset", "-q", "--hard", f"origin/{branch}", cwd=target)
                        return "updated"
                    return "failed"
            return "updated"

        target.parent.mkdir(parents=True, exist_ok=True)
        rc, _, err = await self._git("clone", "-q", repo_url, str(target))
        if rc != 0:
            target.mkdir(parents=True, exist_ok=True)
            failed_marker.write_text(f"clone failed: {err}\n")
            return "failed"
        if commit:
            rc, _, err = await self._git("checkout", "-q", commit, cwd=target)
            if rc != 0 and "unable to read tree" in err:
                rc2, branch_out, _ = await self._git("remote", "show", "origin", cwd=target)
                branch = "main"
                for line in branch_out.splitlines():
                    if "HEAD branch" in line:
                        branch = line.strip().split()[-1]
                await self._git("checkout", "-q", branch, cwd=target)
                await self._git("reset", "-q", "--hard", f"origin/{branch}", cwd=target)
        return "cloned"

    # ---------- Public stream ----------

    def _clean_failed_markers(self) -> int:
        """Remove fetch-failed.txt from all app folders so they will be retried.
        If the folder only contains the marker, remove the whole folder too."""
        count = 0
        if not self.s.apps_dir.exists():
            return 0
        for child in self.s.apps_dir.iterdir():
            if not child.is_dir():
                continue
            marker = child / "fetch-failed.txt"
            if not marker.exists():
                continue
            try:
                marker.unlink()
                count += 1
            except OSError:
                continue
            # If folder is now empty, drop it so a fresh clone can succeed
            try:
                remaining = list(child.iterdir())
                if not remaining:
                    child.rmdir()
            except OSError:
                pass
        return count

    async def fetch_all(self) -> AsyncIterator[FetchEvent]:
        """Yield FetchEvent objects as work progresses. Suitable for SSE streaming."""
        cleared = self._clean_failed_markers()
        if cleared:
            yield FetchEvent("info", f"Cleared {cleared} stale fetch-failed markers from previous run")
        async with httpx.AsyncClient() as client:
            yield FetchEvent("info", f"Listing orgs for env={self.s.env}")
            orgs = await self.list_orgs(client)
            yield FetchEvent("info", f"{len(orgs)} orgs found")

            # Collect all deployments first to know total
            deployments: list[tuple[str, str, str]] = []  # (org, app, version)
            for org in orgs:
                deps = await self.list_deployments(client, org)
                for d in deps:
                    release = d.get("release", "")
                    version = d.get("version", "")
                    if release.startswith(f"{org}-"):
                        app = release[len(org) + 1 :]
                    else:
                        app = release
                    if app:
                        deployments.append((org, app, version))

            total = len(deployments)
            yield FetchEvent("info", f"{total} apps to process", total=total)

            sem = asyncio.Semaphore(self.s.fetch_concurrency)
            done_count = 0

            async def process(org: str, app: str, version: str):
                nonlocal done_count
                async with sem:
                    repo_url, commit = await self.find_repo_commit(client, org, app, version)
                    status = await self.ensure_app(org, app, repo_url, commit)
                    done_count += 1
                    return done_count, org, app, version, status

            tasks = [asyncio.create_task(process(o, a, v)) for o, a, v in deployments]
            for fut in asyncio.as_completed(tasks):
                cur, org, app, version, status = await fut
                app_id = f"{org}-{self.s.env}-{app}"
                yield FetchEvent(
                    "progress",
                    f"{status}: {org}/{app}@{version}",
                    app_id=app_id,
                    current=cur,
                    total=total,
                )

            yield FetchEvent("done", f"Fetched {total} apps", total=total, current=total)
