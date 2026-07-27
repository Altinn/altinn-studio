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
from .fetcher import Fetcher, FetchEvent
from .scanner import scan_all
from .op_state import op_state
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
