"""Scan cloned Altinn 3 apps and write structured data to SQLite.

Scanner is idempotent: it computes a SHA256 hash of each app's tree and skips
apps that haven't changed since the last scan.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncIterator, Iterable

from . import bpmn as _bpmn
from .config import Settings
from .db import get_conn, init_db


PKG_VERSION_RE = re.compile(
    r'PackageReference\s+Include="(Altinn\.App\.(?:Api|Core)(?:\.Experimental)?)"\s+Version="([^"]+)"'
)

FRONTEND_VERSION_RE = re.compile(r'altinn-app-frontend/([^/"]+)')
APP_FRONTEND_LOCAL_RE = re.compile(r'/[^/"]+/[^/"]+/js/app-frontend\.js')
CUSTOM_BUNDLE_RE = re.compile(r'<script\s+[^>]*src="(/[^"]+\.js)"', re.IGNORECASE)


def _hash_tree(app_dir: Path) -> str:
    """Hash all files under App/ for change detection."""
    h = hashlib.sha256()
    app_subdir = app_dir / "App"
    if not app_subdir.exists():
        return ""
    for path in sorted(app_subdir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(app_subdir).as_posix()
        h.update(rel.encode())
        h.update(b"\0")
        try:
            h.update(path.read_bytes())
        except OSError:
            pass
        h.update(b"\0")
    return h.hexdigest()


def _read_json(path: Path) -> dict | list | None:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None


def _value_kind(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, list):
        if value and isinstance(value[0], str) and value[0] in {"if", "or", "and", "equals", "notEquals", "component", "dataModel", "contains"}:
            return "expression"
        return "array"
    if isinstance(value, dict):
        return "object"
    return "literal"


def _frontend_version(app_dir: Path) -> str:
    """Extract the altinn-app-frontend version from App/views/Home/Index.cshtml.

    Returns:
      - "4", "4.24.0", "3.X.Y" etc. when standard altinn-app-frontend is loaded
      - "(custom local build)" when an app loads its own /<org>/<app>/js/app-frontend.js
      - "(custom — non-altinn)" when the app has its own bundled JS but no altinn-app-frontend
      - "(no Index.cshtml)" when the file is missing entirely
      - "" when nothing matches (real unknown)
    """
    candidates = [
        app_dir / "App" / "views" / "Home" / "Index.cshtml",
        app_dir / "App" / "Views" / "Home" / "Index.cshtml",
    ]
    text = ""
    found = False
    for path in candidates:
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8-sig", errors="replace")
        except OSError:
            continue
        found = True
        break

    if not found:
        return "(no Index.cshtml)"

    # 1. Standard CDN-loaded altinn-app-frontend
    m = FRONTEND_VERSION_RE.search(text)
    if m:
        return m.group(1)

    # 2. Locally bundled app-frontend.js (typically an old self-hosted Altinn 3 build)
    if APP_FRONTEND_LOCAL_RE.search(text):
        return "(custom local build)"

    # 3. Any non-altinn-app-frontend bundle is "custom"
    scripts = CUSTOM_BUNDLE_RE.findall(text)
    if any(s for s in scripts if "altinn" not in s.lower()):
        return "(custom — non-altinn)"

    # 4. Apps that delegate to wwwroot/index.html (typical Vite/SPA setup)
    if "wwwroot/index.html" in text or "wwwroot\\\\index.html" in text:
        return "(custom — non-altinn)"

    return ""


def _backend_version(csproj: Path) -> tuple[str, str]:
    if not csproj.exists():
        return ("", "")
    text = csproj.read_text(encoding="utf-8-sig", errors="replace")
    m = PKG_VERSION_RE.search(text)
    if not m:
        return ("", "")
    return (m.group(1), m.group(2))


def _enumerate_layout_sets(app_dir: Path) -> list[tuple[str, Path]]:
    """Return (layout_set_id, layout_set_dir) pairs."""
    ui = app_dir / "App" / "ui"
    if not ui.exists():
        return []
    sets_file = ui / "layout-sets.json"
    if sets_file.exists():
        data = _read_json(sets_file) or {}
        result = []
        for s in data.get("sets", []):
            sid = s.get("id", "")
            if sid:
                result.append((sid, ui / sid))
        return result
    # Legacy: layouts directly under App/ui
    if (ui / "layouts").exists() or (ui / "Settings.json").exists() or (ui / "FormLayout.json").exists():
        return [("(default)", ui)]
    return []


def _settings_pages(settings_json: Path) -> set[str]:
    """Return page names that are listed in pages.order or pages.groups[].order."""
    data = _read_json(settings_json)
    if not data:
        return set()
    pages = data.get("pages", {}) or {}
    names: set[str] = set()
    for n in pages.get("order", []) or []:
        names.add(n)
    for group in pages.get("groups", []) or []:
        for n in group.get("order", []) or []:
            names.add(n)
    return names


def _enumerate_settings_keys(obj, path: str = "") -> Iterable[tuple[str, str]]:
    """Yield (key_path, value_kind) for every nested key in a settings dict."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            child = f"{path}.{k}" if path else k
            yield (child, _value_kind(v))
            yield from _enumerate_settings_keys(v, child)
    # Don't recurse into lists for settings keys


def _parse_bpmn(bpmn_path: Path) -> list[dict]:
    if not bpmn_path.exists():
        return []
    try:
        tree = ET.parse(bpmn_path)
    except ET.ParseError:
        return []
    root = tree.getroot()
    ns_alt = "http://altinn.no"
    tasks = []
    order = 0
    for elem in root.iter():
        tag = elem.tag.split("}")[-1]
        if tag in {"task", "userTask", "serviceTask", "scriptTask", "manualTask"}:
            task_id = elem.attrib.get("id", "")
            altinn_type = ""
            for k, v in elem.attrib.items():
                if k.endswith("}tasktype") or k == "tasktype":
                    altinn_type = v
            if not altinn_type:
                # Look for extensionElements/altinn:taskExtension/altinn:taskType
                for child in elem.iter():
                    ctag = child.tag.split("}")[-1]
                    if ctag == "taskType" and child.text:
                        altinn_type = child.text.strip()
                        break
            order += 1
            tasks.append({
                "task_id": task_id,
                "bpmn_element": tag,
                "altinn_task_type": altinn_type,
                "order_in_process": order,
            })
    return tasks


def _parse_layout(layout_path: Path) -> list[dict]:
    """Parse one layout JSON and return component records."""
    data = _read_json(layout_path)
    if not data:
        return []
    components_root = data.get("data", {}).get("layout") if isinstance(data, dict) else None
    if not isinstance(components_root, list):
        return []
    result = []
    for comp in components_root:
        if not isinstance(comp, dict):
            continue
        ctype = comp.get("type", "Unknown")
        hidden = comp.get("hidden")
        result.append({
            "type": ctype,
            "id": comp.get("id", ""),
            "options_id": comp.get("optionsId") or "",
            "has_data_binding": 1 if comp.get("dataModelBindings") else 0,
            "is_hidden_static": 1 if hidden is True else 0,
            "has_hidden_expr": 1 if isinstance(hidden, list) else 0,
            "is_required": 1 if comp.get("required") is True else 0,
            "is_readonly": 1 if comp.get("readOnly") is True else 0,
            "props": {k: _value_kind(v) for k, v in comp.items() if k != "type"},
            "raw": comp,
        })
    return result


def _scan_languages(app_dir: Path) -> list[dict]:
    """Return a list of language records: {lang, file, keys: {key_id: is_empty}}."""
    texts = app_dir / "App" / "config" / "texts"
    if not texts.exists():
        return []
    found: list[dict] = []
    for p in texts.iterdir():
        if not (p.is_file() and p.name.startswith("resource.") and p.suffix == ".json"):
            continue
        lang = p.stem.removeprefix("resource.")
        if not lang:
            continue
        data = _read_json(p) or {}
        resources = data.get("resources") if isinstance(data, dict) else None
        keys: dict[str, bool] = {}  # key_id -> is_empty
        if isinstance(resources, list):
            for r in resources:
                if not isinstance(r, dict):
                    continue
                kid = r.get("id")
                if not isinstance(kid, str) or not kid:
                    continue
                value = r.get("value")
                is_empty = not (isinstance(value, str) and value.strip())
                keys[kid] = is_empty
        found.append({"lang": lang, "file": p.name, "keys": keys})
    return found


def _extract_text_references(comp: dict) -> list[tuple[str, str]]:
    """Return [(binding_name, key_id), ...] for static string textResourceBindings.

    Skips expression-form bindings (e.g. ["concat", ...]) since those aren't
    static key references.
    """
    bindings = comp.get("textResourceBindings")
    if not isinstance(bindings, dict):
        return []
    refs: list[tuple[str, str]] = []
    for name, value in bindings.items():
        if isinstance(value, str) and value:
            refs.append((name, value))
    return refs


def _delete_app(conn: sqlite3.Connection, app_id: str) -> None:
    conn.execute("DELETE FROM apps WHERE app_id = ?", (app_id,))


def scan_app(conn: sqlite3.Connection, app_dir: Path, env: str,
              force: bool = False) -> str:
    """Scan one app dir. Returns status: 'scanned' | 'skipped' | 'error'."""
    name = app_dir.name
    # name pattern: <org>-<env>-<app>
    parts = name.split("-", 2)
    if len(parts) < 3:
        return "error"
    org, scanned_env, app_name = parts[0], parts[1], parts[2]

    if (app_dir / "fetch-failed.txt").exists():
        return "skipped"

    if not (app_dir / "App").exists():
        return "error"

    content_hash = _hash_tree(app_dir)
    if not content_hash:
        return "error"

    # Idempotency: skip if hash unchanged (unless caller forced re-scan)
    if not force:
        row = conn.execute("SELECT content_hash FROM apps WHERE app_id = ?", (name,)).fetchone()
        if row and row["content_hash"] == content_hash:
            return "skipped"

    _delete_app(conn, name)

    backend_pkg, backend_version = _backend_version(app_dir / "App" / "App.csproj")
    if not backend_version:
        # Try alternate locations
        for csproj in (app_dir / "App").glob("*.csproj"):
            backend_pkg, backend_version = _backend_version(csproj)
            if backend_version:
                break

    frontend_version = _frontend_version(app_dir)

    repo_url = ""
    try:
        head_config = (app_dir / ".git" / "config").read_text(encoding="utf-8", errors="replace")
        m = re.search(r"url\s*=\s*(\S+)", head_config)
        if m:
            repo_url = m.group(1)
            # Strip any embedded credentials
            repo_url = re.sub(r"://[^@/]+@", "://", repo_url)
    except OSError:
        pass

    # BPMN tasks (1:1 list) + graph summary (gateways + user journeys)
    bpmn_path = app_dir / "App" / "config" / "process" / "process.bpmn"
    tasks = _parse_bpmn(bpmn_path)
    bpmn_summary = _bpmn.summarize(bpmn_path)

    # Languages — list of {lang, file, keys}
    langs = _scan_languages(app_dir)

    # Application metadata
    app_meta_path = app_dir / "App" / "config" / "applicationmetadata.json"
    app_meta = _read_json(app_meta_path) or {}

    # Layouts
    layout_sets = _enumerate_layout_sets(app_dir)
    total_components = 0
    total_pages = 0

    conn.execute(
        """INSERT INTO apps (app_id, org, env, app_name, repo_url,
                             backend_pkg, backend_version, frontend_version, content_hash,
                             layout_set_count, task_count, language_count, scanned_at,
                             gateway_count, journey_count, min_journey_length,
                             max_journey_length, complexity, primary_journey)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (name, org, scanned_env, app_name, repo_url, backend_pkg, backend_version,
         frontend_version, content_hash, len(layout_sets), len(tasks), len(langs),
         datetime.now(timezone.utc).isoformat(),
         bpmn_summary["gateway_count"], bpmn_summary["journey_count"],
         bpmn_summary["min_journey_length"], bpmn_summary["max_journey_length"],
         bpmn_summary["complexity"], bpmn_summary["primary_journey"]),
    )

    for task in tasks:
        conn.execute(
            """INSERT INTO bpmn_tasks (app_id, task_id, bpmn_element, altinn_task_type, order_in_process)
               VALUES (?, ?, ?, ?, ?)""",
            (name, task["task_id"], task["bpmn_element"], task["altinn_task_type"], task["order_in_process"]),
        )

    for lr in langs:
        lang_code = lr["lang"]
        fname = lr["file"]
        keys = lr["keys"]
        key_count = len(keys)
        non_empty = sum(1 for is_empty in keys.values() if not is_empty)
        conn.execute(
            """INSERT OR REPLACE INTO languages
                 (app_id, lang_code, resource_file, key_count, non_empty_count)
               VALUES (?, ?, ?, ?, ?)""",
            (name, lang_code, fname, key_count, non_empty),
        )
        for key_id, is_empty in keys.items():
            conn.execute(
                """INSERT OR REPLACE INTO text_keys (app_id, lang_code, key_id, is_empty)
                   VALUES (?, ?, ?, ?)""",
                (name, lang_code, key_id, 1 if is_empty else 0),
            )

    # Settings keys (application-level)
    if isinstance(app_meta, dict):
        for key, kind in _enumerate_settings_keys(app_meta):
            conn.execute(
                "INSERT OR REPLACE INTO settings_keys (app_id, scope, key_path, value_kind) VALUES (?, ?, ?, ?)",
                (name, "application_metadata", key, kind),
            )

    for layout_set_id, layout_set_dir in layout_sets:
        settings_path = layout_set_dir / "Settings.json"
        active_pages = _settings_pages(settings_path)
        settings_data = _read_json(settings_path) or {}
        if isinstance(settings_data, dict):
            for key, kind in _enumerate_settings_keys(settings_data):
                conn.execute(
                    "INSERT OR REPLACE INTO settings_keys (app_id, scope, key_path, value_kind) VALUES (?, ?, ?, ?)",
                    (name, "layout_set", key, kind),
                )

        layouts_dir = layout_set_dir / "layouts"
        layout_files: list[Path] = []
        if layouts_dir.exists():
            layout_files = sorted(layouts_dir.glob("*.json"))
        else:
            # Legacy single FormLayout.json
            for candidate in ("FormLayout.json",):
                p = layout_set_dir / candidate
                if p.exists():
                    layout_files.append(p)

        for layout_file in layout_files:
            page_name = layout_file.stem
            in_order = 1 if page_name in active_pages or not active_pages else 0
            components = _parse_layout(layout_file)
            cur = conn.execute(
                """INSERT INTO layouts (app_id, layout_set, page_name, in_pages_order, component_count)
                   VALUES (?, ?, ?, ?, ?)""",
                (name, layout_set_id, page_name, in_order, len(components)),
            )
            layout_id = cur.lastrowid
            total_pages += 1
            total_components += len(components)

            for comp in components:
                cur2 = conn.execute(
                    """INSERT INTO components (layout_id, app_id, type, component_uid, options_id,
                                               has_data_binding, is_hidden_static, has_hidden_expr,
                                               is_required, is_readonly, raw_props)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (layout_id, name, comp["type"], comp["id"], comp["options_id"],
                     comp["has_data_binding"], comp["is_hidden_static"], comp["has_hidden_expr"],
                     comp["is_required"], comp["is_readonly"], json.dumps(comp["raw"])),
                )
                component_id = cur2.lastrowid
                for prop_key, kind in comp["props"].items():
                    conn.execute(
                        """INSERT OR REPLACE INTO component_props (component_id, prop_key, value_kind)
                           VALUES (?, ?, ?)""",
                        (component_id, prop_key, kind),
                    )
                # Track textResourceBindings → key references for coverage analysis
                for binding_name, key_id in _extract_text_references(comp["raw"]):
                    conn.execute(
                        """INSERT INTO text_references (app_id, key_id, binding_name, component_id)
                           VALUES (?, ?, ?, ?)""",
                        (name, key_id, binding_name, component_id),
                    )

    conn.execute(
        "UPDATE apps SET page_count = ?, component_count = ? WHERE app_id = ?",
        (total_pages, total_components, name),
    )
    return "scanned"


def _detect_schema_drift(conn: sqlite3.Connection) -> tuple[bool, str]:
    """If apps table has rows but new tables/columns are unpopulated, the DB
    was scanned with an older scanner version. Force re-scan to populate.

    Threshold: if ≥10% of apps are missing a derived field, the scanner has
    been upgraded since those apps were last scanned, so we force a re-scan
    for everyone. (10% threshold avoids re-scanning when a few apps legitimately
    have NULL for valid reasons.)
    """
    apps_count = conn.execute("SELECT COUNT(*) AS n FROM apps").fetchone()["n"]
    if apps_count == 0:
        return (False, "")
    THRESHOLD = 0.10

    text_keys_count = conn.execute("SELECT COUNT(*) AS n FROM text_keys").fetchone()["n"]
    if text_keys_count == 0:
        return (True, f"text_keys is empty for {apps_count} scanned apps — schema upgrade detected")

    # Frontend version is set for every app by the new scanner (categorised
    # values like "(no Index.cshtml)" etc.), so NULL = not yet re-scanned.
    null_fe = conn.execute(
        "SELECT COUNT(*) AS n FROM apps WHERE frontend_version IS NULL"
    ).fetchone()["n"]
    if null_fe / apps_count >= THRESHOLD:
        return (True, f"frontend_version is NULL for {null_fe}/{apps_count} apps — re-scanning")

    # journey_count = 0 is legitimate for apps without a BPMN, but rare in practice
    null_journeys = conn.execute(
        "SELECT COUNT(*) AS n FROM apps WHERE journey_count IS NULL OR journey_count = 0"
    ).fetchone()["n"]
    if null_journeys / apps_count >= THRESHOLD:
        return (True, f"journey_count is 0 for {null_journeys}/{apps_count} apps — BPMN analysis pending")

    return (False, "")


async def scan_all(settings: Settings, force: bool = False) -> AsyncIterator[dict]:
    """Async generator that scans all apps, yielding progress events.

    `force=True` ignores content_hash and re-scans every app. We also auto-force
    when we detect schema drift (new tables empty but apps populated).
    """
    init_db(settings.db_path)
    apps_dir = settings.apps_dir
    if not apps_dir.exists():
        yield {"kind": "error", "message": f"No apps directory: {apps_dir}"}
        return

    app_dirs = sorted([p for p in apps_dir.iterdir() if p.is_dir() and not p.name.startswith(".")])
    total = len(app_dirs)

    with get_conn(settings.db_path) as conn:
        if not force:
            drift, reason = _detect_schema_drift(conn)
            if drift:
                force = True
                yield {"kind": "info",
                       "message": f"Forcing full re-scan: {reason}",
                       "total": total, "current": 0}

    yield {"kind": "info", "message": f"Scanning {total} apps{' (forced)' if force else ''}",
           "total": total, "current": 0}

    scanned = skipped = errors = 0

    # One shared connection, but commit after every app — that way:
    # - readers (/api/overview) see new data as soon as each app is done,
    # - a hung/crashed scan doesn't lose previously-scanned apps,
    # - we avoid the open/close overhead of one connection per app.
    with get_conn(settings.db_path) as conn:
        run = conn.execute(
            "INSERT INTO scan_runs (started_at, status) VALUES (?, ?)",
            (datetime.now(timezone.utc).isoformat(), "running"),
        )
        run_id = run.lastrowid
        conn.commit()

        for idx, app_dir in enumerate(app_dirs, 1):
            try:
                status = scan_app(conn, app_dir, settings.env, force=force)
                conn.commit()
            except Exception as exc:
                conn.rollback()
                status = "error"
                errors += 1
                yield {"kind": "error", "message": f"{app_dir.name}: {exc}", "app_id": app_dir.name,
                       "current": idx, "total": total}
            else:
                if status == "scanned":
                    scanned += 1
                elif status == "skipped":
                    skipped += 1
                else:
                    errors += 1
            yield {"kind": "progress", "message": f"{status}: {app_dir.name}",
                   "app_id": app_dir.name, "current": idx, "total": total}

        conn.execute(
            """UPDATE scan_runs SET finished_at = ?, apps_scanned = ?, apps_skipped = ?,
               errors = ?, status = ? WHERE run_id = ?""",
            (datetime.now(timezone.utc).isoformat(), scanned, skipped, errors, "done", run_id),
        )
        # get_conn's __exit__ commits this final update

    yield {"kind": "done", "message": f"Scanned {scanned}, skipped {skipped}, errors {errors}",
           "total": total, "current": total}
