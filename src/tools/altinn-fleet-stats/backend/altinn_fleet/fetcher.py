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


def inject_credentials(base: str, path: str, user: str, token: str) -> str:
    """Build an authenticated HTTPS git URL.

    altinn.studio (Gitea) requires authentication for all git operations, even
    on public repos. Accepts either username + token (standard Basic Auth) or
    a token alone, in which case Gitea accepts 'oauth2' as a dummy username.

    Lives at module level so the fetcher and the upgrade worker share one
    implementation while using different credentials.
    """
    if not token:
        return f"{base}{path}"
    scheme, rest = base.split("://", 1)
    return f"{scheme}://{user or 'oauth2'}:{token}@{rest}{path}"


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
        user = self.s.dev_git_username if dev else self.s.git_username
        token = self.s.dev_git_token if dev else self.s.git_token
        return inject_credentials(base, path, user, token)

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
        folder = f"{org}-{self.s.source_key}-{app}"
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

    async def _fetch_owner(self) -> AsyncIterator[FetchEvent]:
        """Clone every repository an organisation (or the user) owns.

        No deployments API involved, so apps that were never deployed are
        included — which is the whole reason this source exists. Each repo is
        taken at its default branch, since there is no release to pin to.
        """
        owners = sorted(self.s.source_owners)
        if not owners:
            yield FetchEvent("error", "Ingen organisasjoner er valgt.")
            return

        hosts = [b for b in self.s.STUDIO_HOSTS if self.s.studio_credentials(b)[1]]
        if not hosts:
            yield FetchEvent("error", "Mangler token for Altinn Studio.")
            return

        yield FetchEvent("info",
                         f"Slår opp repoer for {len(owners)} eier(e) i Altinn Studio")
        repos: list[dict] = []
        # Remember where each owner was found, so the clone uses that host's
        # credentials rather than assuming everything lives on altinn.studio.
        owner_host: dict[str, str] = {}
        for owner in owners:
            found, err = [], "Ingen token konfigurert."
            for base in hosts:
                _, token = self.s.studio_credentials(base)
                for kind in ("org", "user"):
                    found, err = await list_owner_repos(base, owner, token, kind)
                    if not err:
                        owner_host[owner] = base
                        break
                if not err:
                    break
            if err:
                yield FetchEvent("error", f"{owner}: {err}")
                continue
            repos.extend(found)
            host = owner_host[owner].replace("https://", "")
            yield FetchEvent("info", f"{owner}: {len(found)} repoer fra {host}")
        if not repos:
            yield FetchEvent("error", "Fant ingen repoer for de valgte eierne.")
            return
        total = len(repos)
        yield FetchEvent("info", f"{total} repoer å hente", total=total)

        sem = asyncio.Semaphore(self.s.fetch_concurrency)
        done = 0

        async def process(repo: dict):
            nonlocal done
            async with sem:
                host = owner_host.get(repo["org"], hosts[0])
                user, token = self.s.studio_credentials(host)
                url = inject_credentials(
                    host, f"/repos/{repo['org']}/{repo['app']}.git", user, token)
                # No commit to pin: default branch is the app as it stands.
                status = await self.ensure_app(repo["org"], repo["app"], url, "")
                done += 1
                return done, repo, status

        tasks = [asyncio.create_task(process(r)) for r in repos]
        for fut in asyncio.as_completed(tasks):
            cur, repo, status = await fut
            yield FetchEvent(
                "progress",
                f"{status}: {repo['org']}/{repo['app']}",
                app_id=f"{repo['org']}-{self.s.source_key}-{repo['app']}",
                current=cur, total=total)
        yield FetchEvent("done",
                         f"{total} repoer hentet fra {len(owners)} eier(e)",
                         total=total)

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
        if self.s.source_kind == "gitea":
            async for ev in self._fetch_owner():
                yield ev
            return
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
                app_id = f"{org}-{self.s.source_key}-{app}"
                yield FetchEvent(
                    "progress",
                    f"{status}: {org}/{app}@{version}",
                    app_id=app_id,
                    current=cur,
                    total=total,
                )

            yield FetchEvent("done", f"Fetched {total} apps", total=total, current=total)


# ---------- Discovery through the Gitea API ----------
#
# The deployments API only knows apps that are running somewhere. Plenty of
# apps exist in Altinn Studio without ever having been deployed — new work,
# retired services, sandboxes. Those are reachable through Gitea, limited by
# what the token may see.

GITEA_PAGE_SIZE = 50


async def list_organisations(base: str, user: str, token: str) -> tuple[list[dict], str]:
    """Organisations visible to the token. Needs `read:organization`.

    Returns (organisations, error). The error matters: an empty list because
    the token was rejected is a different problem from an empty list because
    the scope is missing, and the config page should say which.
    """
    import httpx
    host = base.replace("https://", "")
    out: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as c:
        page = 1
        while True:
            try:
                r = await c.get(f"{base}/repos/api/v1/orgs",
                                params={"page": page, "limit": GITEA_PAGE_SIZE},
                                headers={"Authorization": f"token {token}"})
            except Exception as e:
                return out, f"Fikk ikke kontakt med {host}: {e}"
            if r.status_code == 401:
                return out, (f"{host} avviste tokenet (401). Er det et token "
                             f"for {host}, og fortsatt gyldig?")
            if r.status_code == 403:
                return out, (f"{host} nektet tilgang (403). Mangler tokenet "
                             "scopet read:organization?")
            if r.status_code != 200:
                return out, f"{host} svarte {r.status_code}."
            batch = r.json() or []
            out.extend({"login": o.get("username") or o.get("name", ""),
                        "full_name": o.get("full_name", "")} for o in batch)
            if len(batch) < GITEA_PAGE_SIZE:
                break
            page += 1
    return [o for o in out if o["login"]], ""


async def list_owner_repos(base: str, owner: str, token: str,
                           kind: str = "org") -> tuple[list[dict], str]:
    """Every repository owned by an org or user.

    Returns (repos, error). Each repo carries what we need to decide whether to
    clone it, without cloning first: name, default branch, and the archived /
    empty flags. `kind="user"` needs `read:user` on the token — Gitea answers
    403 without it, and we pass that back rather than pretending the account
    has no repositories.
    """
    import httpx
    path = f"/orgs/{owner}/repos" if kind == "org" else f"/users/{owner}/repos"
    out: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as c:
        page = 1
        while True:
            r = await c.get(f"{base}/repos/api/v1{path}",
                            params={"page": page, "limit": GITEA_PAGE_SIZE},
                            headers={"Authorization": f"token {token}"})
            if r.status_code == 403:
                return [], (f"Tokenet har ikke tilgang til å liste repoer for "
                            f"«{owner}»."
                            + (" Egne repoer krever scopet read:user."
                               if kind == "user" else ""))
            if r.status_code == 404:
                return [], f"Fant ingen {'organisasjon' if kind == 'org' else 'bruker'} «{owner}»."
            if r.status_code != 200:
                return [], f"Gitea svarte {r.status_code} for {path}."
            batch = r.json() or []
            for repo in batch:
                out.append({
                    "org": owner,
                    "app": repo.get("name", ""),
                    "default_branch": repo.get("default_branch") or "master",
                    "archived": bool(repo.get("archived")),
                    "empty": bool(repo.get("empty")),
                    "updated_at": repo.get("updated_at", ""),
                    "clone_url": repo.get("clone_url", ""),
                })
            if len(batch) < GITEA_PAGE_SIZE:
                break
            page += 1
    return [r for r in out if r["app"] and not r["empty"] and not r["archived"]], ""
