"""FastAPI entrypoint."""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import asdict
from pathlib import Path
from typing import AsyncIterator, Optional

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .config import (
    Settings,
    RUNTIME_FIELDS,
    SECRET_FIELDS,
    load_runtime_config,
    save_runtime_config,
)
from .db import init_db
from .fetcher import Fetcher, FetchEvent, list_organisations, list_owner_repos
from .scanner import scan_all
from .op_state import op_state
from .jobs import Job, registry
from .upgrade import Upgrader, can_write, preflight, token_scopes, write_capability
from . import query as _query
from . import stats

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("altinn_fleet")

app = FastAPI(title="Altinn Studio Fleet Statistics", version="0.1.0")


def _bootstrap_dirs(s: Settings) -> None:
    s.data_dir.mkdir(parents=True, exist_ok=True)
    s.apps_dir.mkdir(parents=True, exist_ok=True)
    s.cache_dir.mkdir(parents=True, exist_ok=True)
    init_db(s.db_path)


@app.on_event("startup")
async def startup() -> None:
    s = Settings.current()
    _bootstrap_dirs(s)
    log.info("Started with env=%s data_dir=%s", s.env, s.data_dir)


@app.get("/api/config")
async def get_config() -> dict:
    """Read-only system info (paths, env, capability flags)."""
    s = Settings.current()
    return {
        "env": s.env,
        "data_dir": str(s.data_dir),
        "apps_dir": str(s.apps_dir),
        "db_path": str(s.db_path),
        "has_git_token": bool(s.git_token),
        "has_dev_git_token": bool(s.dev_git_token),
        # v9-upgrade
        "studio_hosts": list(s.STUDIO_HOSTS),
        "upgrade_concurrency": s.upgrade_concurrency,
        "allow_gitea_write": s.allow_gitea_write,
        "fetch_concurrency": s.fetch_concurrency,
        "scan_concurrency": s.scan_concurrency,
    }


# ---------- Settings (mutable runtime config) ----------

@app.get("/api/settings")
async def get_settings_endpoint() -> dict:
    """Return current effective settings. Secret fields are masked."""
    s = Settings.current()
    overlay = load_runtime_config(s.data_dir)
    result: dict = {}
    for field in sorted(RUNTIME_FIELDS):
        value = getattr(s, field, "")
        if field in SECRET_FIELDS:
            result[field] = {
                "set": bool(value),
                "preview": (value[:4] + "…") if value else "",
            }
        else:
            result[field] = value
    return {
        "values": result,
        "overlay_file": str(s.data_dir / "runtime_config.json"),
        "overlay_fields_set": sorted(k for k, v in overlay.items() if v not in (None, "")),
    }


@app.post("/api/settings/test-connection")
async def test_connection(payload: dict = Body(default={})) -> dict:
    """Verify credentials by running `git ls-remote` against a known public repo.

    Body may contain `git_username` / `git_token` (or `dev_git_*`). If absent,
    falls back to currently saved settings.
    """
    target = payload.get("target", "altinn")
    s = Settings.current()

    if target == "dev_altinn":
        user = payload.get("dev_git_username", s.dev_git_username) or "oauth2"
        token = payload.get("dev_git_token") or s.dev_git_token
        base = "dev.altinn.studio"
        # A small public app on dev
        probe = "ttd/test"
    else:
        user = payload.get("git_username", s.git_username) or "oauth2"
        token = payload.get("git_token") or s.git_token
        base = "altinn.studio"
        # krt-1003a-1 is a small public Altinn 3 app we know exists
        probe = "krt/krt-1003a-1"

    redacted = f"https://{user}:***@{base}/repos/{probe}.git"

    if not token:
        return {"ok": False, "status": 0, "message": "Token mangler",
                "url": redacted, "username": user}

    auth_url = f"https://{user}:{token}@{base}/repos/{probe}.git"
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    proc = await asyncio.create_subprocess_exec(
        "git", "ls-remote", "--heads", auth_url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15)
    except asyncio.TimeoutError:
        proc.kill()
        return {"ok": False, "status": 0, "message": "Timeout etter 15s",
                "url": redacted, "username": user}

    if proc.returncode == 0:
        return {"ok": True, "status": 200,
                "message": f"Auth OK — kan klone fra {base}",
                "url": redacted, "username": user}

    err = stderr.decode(errors="replace").strip()
    # Extract a concise reason from git output
    short = err.split("\n")[0] if err else "ukjent feil"
    if "403" in err or "Forbidden" in err:
        msg = "Avvist (403). Token mangler tilgang til repoet."
    elif "401" in err or "Unauthorized" in err or "Authentication failed" in err:
        msg = "Auth feilet (401). Token er ugyldig eller utløpt."
    elif "404" in err:
        msg = "404. Token er ok, men test-repoet finnes ikke (sjekk navn)."
    elif "Could not resolve" in err or "Could not connect" in err:
        msg = "Nettverksfeil — kommer ikke til altinn.studio."
    else:
        msg = short[:200]

    return {"ok": False, "status": proc.returncode or 1,
            "message": msg, "url": redacted, "username": user}


import os  # noqa: E402


@app.get("/api/fleet-snapshot")
async def fleet_snapshot() -> dict:
    """Counts of cloned apps per environment, used by the config page."""
    s = Settings.current()
    counts = {}
    for env in ("prod", "tt02"):
        env_dir = s.data_dir / f"apps-{env}"
        if not env_dir.exists():
            counts[env] = {"total": 0, "ok": 0, "failed": 0}
            continue
        total = 0
        ok = 0
        failed = 0
        for child in env_dir.iterdir():
            if not child.is_dir():
                continue
            total += 1
            if (child / "fetch-failed.txt").exists():
                failed += 1
            elif (child / "App").exists():
                ok += 1
        counts[env] = {"total": total, "ok": ok, "failed": failed}
    return counts


@app.post("/api/settings")
async def post_settings(payload: dict = Body(...)) -> dict:
    """Update runtime settings. Body is a partial dict of allowed fields.

    Secret-field values that come through as empty strings are *not* cleared
    unless the caller explicitly sends `null` (so the UI can leave a blank
    field meaning 'unchanged'). Send the literal string '' inside an object
    like {"git_token": ""} to clear.
    """
    if not op_state.complete:
        raise HTTPException(409, "Cannot update settings while an operation is running")

    s = Settings.current()
    updates: dict = {}
    for field in RUNTIME_FIELDS:
        if field not in payload:
            continue
        value = payload[field]
        if value is None:
            continue
        # Validate the env field
        if field == "env" and value not in ("prod", "tt02"):
            raise HTTPException(400, f"env must be 'prod' or 'tt02', got {value!r}")
        # Normalize ints
        if field in ("fetch_concurrency", "scan_concurrency"):
            try:
                value = int(value)
            except (TypeError, ValueError):
                raise HTTPException(400, f"{field} must be an integer")
            if value < 1 or value > 32:
                raise HTTPException(400, f"{field} must be between 1 and 32")
        updates[field] = value

    save_runtime_config(updates, s.data_dir)

    # Re-bootstrap dirs in case env changed
    _bootstrap_dirs(Settings.current())
    return await get_settings_endpoint()


# ---------- Stats ----------

@app.get("/api/overview")
async def overview() -> dict:
    return stats.overview(Settings.current().db_path)


# ---------- Streaming endpoints ----------

def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def _run_fetch() -> None:
    try:
        s = Settings.current()
        fetcher = Fetcher(s)
        async for ev in fetcher.fetch_all():
            await op_state.emit(asdict(ev))
    except Exception as e:
        log.exception("fetch failed")
        await op_state.emit({"kind": "error", "message": str(e)})
    finally:
        await op_state.finish()


async def _run_scan(force: bool) -> None:
    try:
        s = Settings.current()
        async for ev in scan_all(s, force=force):
            await op_state.emit(ev)
    except Exception as e:
        log.exception("scan failed")
        await op_state.emit({"kind": "error", "message": str(e)})
    finally:
        await op_state.finish()


@app.post("/api/fetch")
async def trigger_fetch() -> dict:
    """Start the fetch operation as a background task.

    Returns immediately. Subscribe to /api/operation-events to see progress.
    The operation continues even if the client disconnects (e.g. browser refresh).
    """
    started = await op_state.try_start("fetch")
    if not started:
        raise HTTPException(409, f"Another operation is running ({op_state.kind})")
    task = asyncio.create_task(_run_fetch())
    op_state.set_task(task)
    return {"started": True, "kind": "fetch"}


@app.post("/api/scan")
async def trigger_scan(force: bool = False) -> dict:
    """Start the scan operation as a background task.

    `?force=true` re-scans every app regardless of content hash.
    Returns immediately. Subscribe to /api/operation-events to see progress.
    """
    started = await op_state.try_start("scan")
    if not started:
        raise HTTPException(409, f"Another operation is running ({op_state.kind})")
    task = asyncio.create_task(_run_scan(force))
    op_state.set_task(task)
    return {"started": True, "kind": "scan"}


@app.get("/api/operation-status")
async def operation_status() -> dict:
    """Snapshot of the current/last operation. Cheap, safe to poll."""
    return op_state.status()


@app.get("/api/operation-events")
async def operation_events() -> StreamingResponse:
    """SSE stream of events. Replays history on connect, then live-streams new ones.

    Multiple clients can subscribe simultaneously. Disconnect doesn't affect
    the background operation.
    """
    async def gen() -> AsyncIterator[str]:
        q = op_state.subscribe()
        # Emit a no-op comment immediately so the HTTP response is established
        # and the client knows the stream is alive — without this, intermediaries
        # may buffer the response and the browser never starts the EventSource.
        yield ": connected\n\n"
        try:
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=25)
                except asyncio.TimeoutError:
                    # Keep-alive comment every 25s so proxies don't close the stream.
                    # We never close the stream from the server side — the client
                    # decides when to disconnect (typically by leaving the page).
                    yield ": keep-alive\n\n"
                    continue
                yield _sse(ev)
        finally:
            op_state.unsubscribe(q)

    headers = {
        # Disable nginx/proxy buffering so events flush promptly
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache, no-transform",
    }
    return StreamingResponse(gen(), media_type="text/event-stream", headers=headers)


@app.get("/api/gitea/owners")
async def gitea_owners() -> dict:
    """Everything the token may pull apps from: organisations, and the signed-in
    user's own account.

    Listing organisations needs `read:organization`; identifying the user needs
    `read:user`. A token can have one without the other, so each half reports
    its own error instead of failing the whole call.
    """
    import httpx
    s = Settings.current()

    # Ask every Studio host we hold a token for. Someone may have credentials
    # for dev only, or for both — hardcoding altinn.studio made the picker look
    # empty for anyone whose token was for dev.
    hosts = [(b, *s.studio_credentials(b)) for b in s.STUDIO_HOSTS]
    hosts = [(b, u, t) for b, u, t in hosts if t]
    if not hosts:
        return {"organisations": [], "user": None,
                "error": "Mangler token. Legg inn et for altinn.studio eller "
                         "dev.altinn.studio over.",
                "user_error": "", "hosts": []}

    seen: dict[str, dict] = {}
    errors: list[str] = []
    for base, user_name, token in hosts:
        found, err = await list_organisations(base, user_name, token)
        if err:
            errors.append(err)
        for o in found:
            entry = seen.setdefault(o["login"], {**o, "studios": []})
            entry["studios"].append(base.replace("https://", ""))
    orgs = sorted(seen.values(), key=lambda o: o["login"])
    # Only surface errors when nothing came back; a working host makes a
    # failing one irrelevant noise.
    org_err = " ".join(errors) if (errors and not orgs) else ""

    user, user_err = None, ""
    for base, _, token in hosts:
        try:
            async with httpx.AsyncClient(timeout=20) as c:
                r = await c.get(f"{base}/repos/api/v1/user",
                                headers={"Authorization": f"token {token}"})
        except Exception as e:
            user_err = f"Fikk ikke kontakt med {base}: {e}"
            continue
        if r.status_code == 200:
            user = {"login": r.json().get("login", "")}
            user_err = ""
            break
        if r.status_code == 403:
            user_err = ("Kan ikke hente din egen bruker. Legg til scopet "
                        "read:user på tokenet for å kunne velge dine egne apper.")
        else:
            user_err = f"Gitea svarte {r.status_code} på /user."

    return {"organisations": orgs, "user": user,
            "error": org_err, "user_error": user_err,
            "hosts": [b.replace("https://", "") for b, _, _ in hosts]}


@app.get("/api/gitea/owner-preview")
async def gitea_owner_preview(owners: str) -> dict:
    """How many repositories the selected owners add up to, before committing."""
    s = Settings.current()
    per: list[dict] = []
    total = 0
    for raw in [o for o in owners.split(",") if o.strip()]:
        owner = raw.strip()
        repos, err, host = await _repos_for_owner(s, owner)
        per.append({"owner": owner, "count": len(repos), "error": err,
                    "studio": host})
        total += len(repos)
    return {"total": total, "owners": per}


async def _repos_for_owner(s: Settings, owner: str) -> tuple[list, str, str]:
    """Find an owner's repos on whichever Studio host holds them.

    Tries each host we have a token for, as an organisation first and then as a
    user account, so the caller never has to say which is which.
    """
    last_err = "Ingen token konfigurert."
    for base in s.STUDIO_HOSTS:
        _, token = s.studio_credentials(base)
        if not token:
            continue
        for kind in ("org", "user"):
            repos, err = await list_owner_repos(base, owner, token, kind)
            if not err:
                return repos, "", base.replace("https://", "")
            last_err = err
    return [], last_err, ""


# ---------- Upgrade to v9 ----------

@app.get("/api/upgrade/candidates")
async def upgrade_candidates() -> list[dict]:
    """Apps on Altinn.App 8.x, with whether studioctl will accept them.

    Eligibility is read from the scanned clone rather than guessed, so the UI
    can grey out the ones the version check would reject anyway.
    """
    s = Settings.current()
    rows = stats.upgrade_candidates(s.db_path)
    out = []
    for r in rows:
        csproj = s.apps_dir / r["app_id"] / "App" / "App.csproj"
        pre = preflight(csproj)
        last = r.get("last_outcome")
        out.append({
            **r,
            "eligible": pre.eligible,
            "reasons": pre.reasons,
            "warnings": pre.warnings,
            "running": bool(registry.active_for_app(r["app_id"])),
            "last_outcome": last,
        })
    return out


async def _run_upgrade(job: Job, org: str, app: str, app_id: str) -> None:
    result: dict = {"outcome": "failed", "summary": "Avsluttet uventet"}
    try:
        async with registry.slot:
            await job.emit({"kind": "info", "message": f"Starter oppgradering av {org}/{app}"})
            result = await Upgrader(Settings.current()).run(job, org, app, app_id)
    except asyncio.CancelledError:
        result = {"outcome": "failed", "summary": "Avbrutt av bruker"}
        await job.emit({"kind": "error", "message": result["summary"]})
    except Exception as e:
        log.exception("upgrade failed for %s", app_id)
        result = {"outcome": "failed", "summary": str(e)}
        await job.emit({"kind": "error", "message": str(e)})
    finally:
        await job.finish(result)


@app.post("/api/upgrade/{app_id}")
async def start_upgrade(app_id: str) -> dict:
    """Start a v9 upgrade for one app. Returns immediately with a job id."""
    s = Settings.current()
    row = stats.app_row(s.db_path, app_id)
    if not row:
        raise HTTPException(404, f"Ukjent app: {app_id}")
    existing = registry.active_for_app(app_id)
    if existing:
        # Two runs would fight over the same working tree.
        return {"job_id": existing.id, "already_running": True}

    job = registry.create("upgrade", app_id, f"{row['org']}/{row['app_name']}")
    task = asyncio.create_task(
        _run_upgrade(job, row["org"], row["app_name"], app_id))
    job.set_task(task)
    return {"job_id": job.id, "already_running": False}


@app.get("/api/upgrade/token-status")
async def upgrade_token_status() -> dict:
    """What the configured token can actually do, according to Gitea itself.

    The application switches are advisory; the token scope is enforced on the
    server. Showing both makes it obvious which one is stopping a push.
    """
    s = Settings.current()
    hosts = []
    for base in s.STUDIO_HOSTS:
        _, token = s.studio_credentials(base)
        scopes, err = await token_scopes(base, token) if token else ([], "Ingen token konfigurert.")
        hosts.append({
            "studio": base,
            "has_token": bool(token),
            "scopes": scopes,
            "error": err,
            "can_write": can_write(scopes),
            "write_capability": write_capability(scopes),
        })
    return {
        "hosts": hosts,
        "allow_gitea_write": s.allow_gitea_write,
        # A PR is possible where the switch is on AND some token may write.
        "can_open_pr": bool(s.allow_gitea_write and any(h["can_write"] for h in hosts)),
        "capability_known": all(h["write_capability"] != "unknown" for h in hosts),
    }


@app.get("/api/upgrade/jobs")
async def upgrade_jobs(limit: int = 50) -> list[dict]:
    return registry.list(limit)


@app.get("/api/upgrade/jobs/{job_id}")
async def upgrade_job(job_id: str) -> dict:
    job = registry.get(job_id)
    if not job:
        raise HTTPException(404, "Ukjent jobb")
    return {**job.status(), "result": job.result, "history": job.history}


@app.post("/api/upgrade/jobs/{job_id}/cancel")
async def cancel_upgrade(job_id: str) -> dict:
    job = registry.get(job_id)
    if not job:
        raise HTTPException(404, "Ukjent jobb")
    return {"cancelled": job.cancel()}


@app.get("/api/upgrade/jobs/{job_id}/events")
async def upgrade_events(job_id: str) -> StreamingResponse:
    """SSE for one job. Replays history, then streams live, then closes when done."""
    job = registry.get(job_id)
    if not job:
        raise HTTPException(404, "Ukjent jobb")

    async def gen() -> AsyncIterator[str]:
        q = job.subscribe()
        yield ": connected\n\n"
        try:
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=25)
                except asyncio.TimeoutError:
                    if job.complete:
                        break
                    yield ": keep-alive\n\n"
                    continue
                yield _sse(ev)
                if ev.get("kind") == "done":
                    break
        finally:
            job.unsubscribe(q)

    return StreamingResponse(
        gen(), media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache, no-transform"})


@app.get("/api/upgrade/runs")
async def upgrade_runs(limit: int = 100) -> list[dict]:
    return stats.upgrade_runs(Settings.current().db_path, limit)


@app.get("/api/upgrade/runs/{run_id}")
async def upgrade_run_detail(run_id: int) -> dict:
    row = stats.upgrade_run(Settings.current().db_path, run_id)
    if not row:
        raise HTTPException(404, "Ukjent kjøring")
    return row


# ---------- Read-only stats endpoints ----------

@app.get("/api/stats/components/top")
async def components_top(limit: int = 50) -> list[dict]:
    return stats.components_top(Settings.current().db_path, limit)


@app.get("/api/stats/components/bottom")
async def components_bottom(limit: int = 50) -> list[dict]:
    return stats.components_bottom(Settings.current().db_path, limit)


@app.get("/api/stats/components/{ctype}/summary")
async def component_summary(ctype: str) -> dict:
    return stats.component_summary(Settings.current().db_path, ctype)


@app.get("/api/stats/components/{ctype}/apps")
async def apps_using_component(ctype: str) -> list[dict]:
    return stats.apps_using_component(Settings.current().db_path, ctype)


@app.get("/api/stats/components/{ctype}/props")
async def props_for_component(ctype: str, limit: int = 100) -> list[dict]:
    return stats.component_props(Settings.current().db_path, ctype, limit)


@app.get("/api/stats/props")
async def all_props(limit: int = 200) -> list[dict]:
    return stats.component_props(Settings.current().db_path, None, limit)


@app.get("/api/stats/settings")
async def settings_view(scope: Optional[str] = None, limit: int = 200) -> list[dict]:
    return stats.settings_keys(Settings.current().db_path, scope, limit)


@app.get("/api/stats/settings/keys")
async def settings_keys_view(scope: str = "layout_set", limit: int = 300) -> list[dict]:
    s = Settings.current()
    return stats.settings_keys_enriched(s.db_path, s.data_dir, scope, limit)


@app.get("/api/stats/settings/key-detail")
async def settings_key_detail(scope: str, key: str) -> dict:
    s = Settings.current()
    return stats.settings_key_detail(s.db_path, s.data_dir, scope, key)


@app.get("/api/stats/languages")
async def languages_view() -> dict:
    return stats.languages(Settings.current().db_path)


@app.get("/api/stats/languages/coverage")
async def languages_coverage(primary: str = "nb") -> list[dict]:
    return stats.language_coverage(Settings.current().db_path, primary)


@app.get("/api/stats/languages/coverage/{lang}/apps")
async def languages_coverage_apps(lang: str, primary: str = "nb",
                                   min_keys: int = 10, limit: int = 100) -> list[dict]:
    return stats.language_coverage_by_app(
        Settings.current().db_path, lang, primary, min_keys, limit
    )


@app.get("/api/stats/languages/references")
async def languages_references() -> dict:
    return stats.text_reference_health(Settings.current().db_path)


@app.get("/api/stats/languages/dead-keys")
async def dead_keys(primary: str = "nb", min_keys: int = 10, limit: int = 100) -> list[dict]:
    return stats.dead_text_keys(Settings.current().db_path, primary, min_keys, limit)


@app.get("/api/stats/languages/dead-keys/{app_id}")
async def dead_keys_for_app(app_id: str, primary: str = "nb", limit: int = 200) -> list[dict]:
    return stats.dead_text_keys_for_app(Settings.current().db_path, app_id, primary, limit)


@app.get("/api/stats/process")
async def process_view() -> dict:
    return stats.process_stats(Settings.current().db_path)


@app.get("/api/stats/process/apps")
async def process_apps_view(
    min_tasks: int = 1,
    exact_tasks: Optional[int] = None,
    task_type: Optional[str] = None,
    limit: int = 500,
) -> list[dict]:
    return stats.process_apps(
        Settings.current().db_path,
        min_tasks=min_tasks,
        exact_tasks=exact_tasks,
        task_type=task_type,
        limit=limit,
    )


@app.get("/api/stats/process/complexity/{complexity}/apps")
async def process_complexity_apps_view(complexity: str, limit: int = 500) -> list[dict]:
    return stats.process_complexity_apps(Settings.current().db_path, complexity, limit)


@app.get("/api/stats/backend")
async def backend_view() -> list[dict]:
    return stats.backend_versions(Settings.current().db_path)


@app.get("/api/stats/frontend")
async def frontend_view() -> list[dict]:
    return stats.frontend_versions(Settings.current().db_path)


@app.get("/api/stats/backend/{version}/apps")
async def apps_for_backend_version(version: str) -> list[dict]:
    return stats.apps_by_backend_version(Settings.current().db_path, version)


@app.get("/api/stats/frontend/{version}/apps")
async def apps_for_frontend_version(version: str) -> list[dict]:
    return stats.apps_by_frontend_version(Settings.current().db_path, version)


@app.get("/api/search")
async def search(q: str = Query(..., min_length=2), limit: int = 100) -> list[dict]:
    return stats.search_apps(Settings.current().db_path, q, limit)


# ---------- Query Tools (read-only SQL console) ----------

@app.get("/api/query/schema")
async def query_schema() -> list[dict]:
    return _query.get_schema(Settings.current().db_path)


@app.get("/api/query/samples")
async def query_samples() -> list[dict]:
    return _query.SAMPLE_QUERIES


@app.post("/api/query/run")
async def query_run(payload: dict = Body(...)) -> dict:
    sql = str(payload.get("sql", ""))
    limit = int(payload.get("limit", _query.DEFAULT_ROW_LIMIT))
    return _query.run_query(Settings.current().db_path, sql, limit)


# ---------- Static frontend ----------

_FRONTEND_DIR = Path(__file__).parent.parent / "static"

if _FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIR / "assets"), name="assets")

    @app.get("/")
    async def index() -> FileResponse:
        return FileResponse(_FRONTEND_DIR / "index.html")

    @app.get("/{path:path}")
    async def spa(path: str) -> FileResponse:
        candidate = _FRONTEND_DIR / path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIR / "index.html")
else:
    @app.get("/")
    async def index() -> JSONResponse:
        return JSONResponse({"message": "API only — frontend not built", "docs": "/docs"})
