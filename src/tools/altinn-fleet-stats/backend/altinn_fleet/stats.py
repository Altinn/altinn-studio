"""Read-only SQL views exposed to the frontend."""
from __future__ import annotations

from pathlib import Path

from .db import get_conn


def overview(db: Path) -> dict:
    with get_conn(db) as conn:
        c = conn.execute("SELECT COUNT(*) AS n FROM apps").fetchone()
        apps = c["n"]
        orgs = conn.execute("SELECT COUNT(DISTINCT org) AS n FROM apps").fetchone()["n"]
        last_run = conn.execute(
            "SELECT * FROM scan_runs ORDER BY run_id DESC LIMIT 1"
        ).fetchone()
        return {
            "apps": apps,
            "orgs": orgs,
            "last_scan": dict(last_run) if last_run else None,
        }


def components_top(db: Path, limit: int = 50) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT type, COUNT(*) AS occurrences,
                      COUNT(DISTINCT app_id) AS apps_using
               FROM components
               GROUP BY type
               ORDER BY occurrences DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def components_bottom(db: Path, limit: int = 50) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT type, COUNT(*) AS occurrences,
                      COUNT(DISTINCT app_id) AS apps_using
               FROM components
               GROUP BY type
               ORDER BY occurrences ASC
               LIMIT ?""",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def component_summary(db: Path, ctype: str) -> dict:
    """Everything needed for the component detail view in one call.

    Returns hero stats, per-app usage histogram, top apps, props frequency
    bucketed into 'almost always', 'often', 'sometimes', 'rarely', and
    backend version distribution.
    """
    with get_conn(db) as conn:
        # Hero stats
        hero = conn.execute(
            """SELECT COUNT(*) AS total_occurrences,
                      COUNT(DISTINCT app_id) AS total_apps
               FROM components WHERE type = ?""",
            (ctype,),
        ).fetchone()
        total_apps_in_fleet = conn.execute(
            "SELECT COUNT(*) AS n FROM apps"
        ).fetchone()["n"]
        total_component_types = conn.execute(
            "SELECT COUNT(DISTINCT type) AS n FROM components"
        ).fetchone()["n"]
        # Rank = how many types have more occurrences than this one + 1
        rank = conn.execute(
            """SELECT COUNT(*) + 1 AS rank FROM (
                   SELECT type, COUNT(*) AS n FROM components
                   GROUP BY type
                   HAVING n > (SELECT COUNT(*) FROM components WHERE type = ?)
               )""",
            (ctype,),
        ).fetchone()["rank"]

        # Per-app usage distribution
        per_app = conn.execute(
            """SELECT app_id, COUNT(*) AS n FROM components
               WHERE type = ? GROUP BY app_id ORDER BY n""",
            (ctype,),
        ).fetchall()
        counts = [r["n"] for r in per_app]
        if counts:
            counts_sorted = sorted(counts)
            median = counts_sorted[len(counts_sorted) // 2]
            avg = sum(counts) / len(counts)
            max_n = counts_sorted[-1]
            p90 = counts_sorted[int(len(counts_sorted) * 0.9)] if len(counts_sorted) > 1 else max_n
        else:
            median = avg = max_n = p90 = 0

        # Histogram buckets
        buckets = [
            ("1", 1, 1),
            ("2–5", 2, 5),
            ("6–20", 6, 20),
            ("21–50", 21, 50),
            ("51+", 51, 10_000_000),
        ]
        histogram = []
        for label, lo, hi in buckets:
            n = sum(1 for c in counts if lo <= c <= hi)
            histogram.append({"bucket": label, "apps": n})

        # Top 10 apps
        top_apps = [
            {
                "app_id": r["app_id"],
                "occurrences": r["n"],
                "org": r["app_id"].split("-")[0] if r["app_id"] else "",
            }
            for r in conn.execute(
                """SELECT app_id, COUNT(*) AS n FROM components
                   WHERE type = ? GROUP BY app_id
                   ORDER BY n DESC LIMIT 10""",
                (ctype,),
            ).fetchall()
        ]

        # Props with frequency bucketing
        prop_rows = conn.execute(
            """SELECT cp.prop_key, COUNT(*) AS occ
               FROM component_props cp
               JOIN components c ON c.component_id = cp.component_id
               WHERE c.type = ?
               GROUP BY cp.prop_key
               ORDER BY occ DESC""",
            (ctype,),
        ).fetchall()
        total = hero["total_occurrences"] or 1
        props_almost_always = []
        props_often = []
        props_sometimes = []
        props_rarely = []
        for r in prop_rows:
            pct = r["occ"] / total
            entry = {
                "prop_key": r["prop_key"],
                "occurrences": r["occ"],
                "percentage": round(pct * 100, 1),
            }
            if pct >= 0.80:
                props_almost_always.append(entry)
            elif pct >= 0.30:
                props_often.append(entry)
            elif pct >= 0.05:
                props_sometimes.append(entry)
            else:
                props_rarely.append(entry)

        # Backend version distribution
        by_backend = [
            dict(r) for r in conn.execute(
                """SELECT COALESCE(NULLIF(a.backend_version, ''), '(ukjent)') AS backend_version,
                          COUNT(DISTINCT c.app_id) AS apps,
                          COUNT(*) AS occurrences
                   FROM components c
                   JOIN apps a ON a.app_id = c.app_id
                   WHERE c.type = ?
                   GROUP BY backend_version
                   ORDER BY occurrences DESC""",
                (ctype,),
            ).fetchall()
        ]

        return {
            "type": ctype,
            "total_occurrences": hero["total_occurrences"],
            "total_apps": hero["total_apps"],
            "total_apps_in_fleet": total_apps_in_fleet,
            "total_component_types": total_component_types,
            "rank": rank,
            "avg_per_app": round(avg, 1),
            "median_per_app": median,
            "max_per_app": max_n,
            "p90_per_app": p90,
            "histogram": histogram,
            "top_apps": top_apps,
            "props_almost_always": props_almost_always,
            "props_often": props_often,
            "props_sometimes": props_sometimes,
            "props_rarely": props_rarely,
            "by_backend": by_backend,
        }


def apps_using_component(db: Path, ctype: str) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT a.app_id, a.org, a.app_name,
                      a.backend_version, a.frontend_version, a.repo_url,
                      COUNT(c.component_id) AS occurrences
               FROM components c
               JOIN apps a ON a.app_id = c.app_id
               WHERE c.type = ?
               GROUP BY a.app_id
               ORDER BY occurrences DESC""",
            (ctype,),
        ).fetchall()
        return [
            {
                "app_id": r["app_id"],
                "org": r["org"],
                "app_name": r["app_name"],
                "backend_version": r["backend_version"],
                "frontend_version": r["frontend_version"],
                "occurrences": r["occurrences"],
                "gitea_url": _gitea_web_url(r["repo_url"]),
            }
            for r in rows
        ]


def component_props(db: Path, ctype: str | None = None, limit: int = 100) -> list[dict]:
    with get_conn(db) as conn:
        if ctype:
            rows = conn.execute(
                """SELECT cp.prop_key,
                          COUNT(*) AS occurrences,
                          COUNT(DISTINCT c.app_id) AS apps_using
                   FROM component_props cp
                   JOIN components c ON c.component_id = cp.component_id
                   WHERE c.type = ?
                   GROUP BY cp.prop_key
                   ORDER BY occurrences DESC
                   LIMIT ?""",
                (ctype, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT cp.prop_key,
                          COUNT(*) AS occurrences,
                          COUNT(DISTINCT c.app_id) AS apps_using
                   FROM component_props cp
                   JOIN components c ON c.component_id = cp.component_id
                   GROUP BY cp.prop_key
                   ORDER BY occurrences DESC
                   LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]


def settings_keys_enriched(db: Path, data_dir: Path, scope: str,
                             limit: int = 300) -> list[dict]:
    """Return settings keys for a scope, joined with description from Altinn JSON schemas."""
    from . import schemas as _schemas
    with get_conn(db) as conn:
        total_apps = conn.execute("SELECT COUNT(*) AS n FROM apps").fetchone()["n"] or 1
        rows = conn.execute(
            """SELECT key_path,
                      COUNT(DISTINCT app_id) AS apps,
                      COUNT(*) AS total_uses,
                      GROUP_CONCAT(DISTINCT value_kind) AS value_kinds
               FROM settings_keys WHERE scope = ?
               GROUP BY key_path
               ORDER BY apps DESC, key_path
               LIMIT ?""",
            (scope, limit),
        ).fetchall()
        result = []
        for r in rows:
            desc = _schemas.lookup(data_dir, scope, r["key_path"])
            result.append({
                "key_path": r["key_path"],
                "apps": r["apps"],
                "total_uses": r["total_uses"],
                "value_kinds": (r["value_kinds"] or "").split(",") if r["value_kinds"] else [],
                "description": desc,
                "coverage_pct": round(100 * r["apps"] / total_apps, 1),
            })
        return result


def settings_key_detail(db: Path, data_dir: Path, scope: str, key_path: str) -> dict:
    """All info about one settings-key, including apps that use it."""
    from . import schemas as _schemas
    with get_conn(db) as conn:
        total_apps = conn.execute("SELECT COUNT(*) AS n FROM apps").fetchone()["n"] or 1
        summary = conn.execute(
            """SELECT COUNT(DISTINCT app_id) AS apps,
                      COUNT(*) AS total_uses,
                      GROUP_CONCAT(DISTINCT value_kind) AS value_kinds
               FROM settings_keys WHERE scope = ? AND key_path = ?""",
            (scope, key_path),
        ).fetchone()
        apps_using = [dict(r) for r in conn.execute(
            """SELECT a.app_id, a.org, a.backend_version
               FROM settings_keys sk
               JOIN apps a ON a.app_id = sk.app_id
               WHERE sk.scope = ? AND sk.key_path = ?
               ORDER BY a.app_id
               LIMIT 200""",
            (scope, key_path),
        ).fetchall()]
        kinds = (summary["value_kinds"] or "").split(",") if summary["value_kinds"] else []
        by_kind = [dict(r) for r in conn.execute(
            """SELECT value_kind, COUNT(DISTINCT app_id) AS apps
               FROM settings_keys WHERE scope = ? AND key_path = ?
               GROUP BY value_kind ORDER BY apps DESC""",
            (scope, key_path),
        ).fetchall()]
        return {
            "scope": scope,
            "key_path": key_path,
            "description": _schemas.lookup(data_dir, scope, key_path),
            "apps": summary["apps"] or 0,
            "total_uses": summary["total_uses"] or 0,
            "total_apps_in_fleet": total_apps,
            "coverage_pct": round(100 * (summary["apps"] or 0) / total_apps, 1),
            "value_kinds": kinds,
            "by_kind": by_kind,
            "apps_using": apps_using,
        }


def settings_keys(db: Path, scope: str | None = None, limit: int = 200) -> list[dict]:
    with get_conn(db) as conn:
        if scope:
            rows = conn.execute(
                """SELECT key_path, COUNT(DISTINCT app_id) AS apps
                   FROM settings_keys WHERE scope = ?
                   GROUP BY key_path ORDER BY apps DESC LIMIT ?""",
                (scope, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT scope, key_path, COUNT(DISTINCT app_id) AS apps
                   FROM settings_keys
                   GROUP BY scope, key_path ORDER BY apps DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]


def languages(db: Path) -> dict:
    with get_conn(db) as conn:
        per_lang = [dict(r) for r in conn.execute(
            """SELECT lang_code,
                      COUNT(DISTINCT app_id) AS apps,
                      AVG(key_count) AS avg_keys,
                      AVG(non_empty_count) AS avg_non_empty
               FROM languages GROUP BY lang_code ORDER BY apps DESC"""
        ).fetchall()]
        per_count = [dict(r) for r in conn.execute(
            """SELECT lang_count, COUNT(*) AS apps FROM (
                   SELECT app_id, COUNT(*) AS lang_count FROM languages GROUP BY app_id
               ) GROUP BY lang_count ORDER BY lang_count"""
        ).fetchall()]
        zero = conn.execute(
            """SELECT COUNT(*) AS n FROM apps a
               WHERE NOT EXISTS (SELECT 1 FROM languages l WHERE l.app_id = a.app_id)"""
        ).fetchone()["n"]
        return {"per_lang": per_lang, "per_app_count": per_count, "apps_without_languages": zero}


def language_coverage(db: Path, primary: str = "nb") -> list[dict]:
    """For each non-primary language, return how complete it is vs the primary.

    Coverage % = (keys present in lang) / (keys present in primary).
    Only counts apps that have the primary language.
    """
    with get_conn(db) as conn:
        rows = conn.execute(
            """
            WITH primary_keys AS (
                SELECT app_id, COUNT(*) AS n
                FROM text_keys WHERE lang_code = ?
                GROUP BY app_id
            ),
            other_keys AS (
                SELECT app_id, lang_code, COUNT(*) AS n,
                       SUM(CASE WHEN is_empty = 0 THEN 1 ELSE 0 END) AS non_empty
                FROM text_keys WHERE lang_code != ?
                GROUP BY app_id, lang_code
            )
            SELECT o.lang_code,
                   COUNT(DISTINCT o.app_id) AS apps,
                   AVG(CAST(o.n AS REAL) / NULLIF(p.n, 0)) AS avg_coverage,
                   AVG(CAST(o.non_empty AS REAL) / NULLIF(p.n, 0)) AS avg_non_empty_coverage,
                   SUM(p.n - o.n) AS total_missing
            FROM other_keys o
            JOIN primary_keys p ON p.app_id = o.app_id
            GROUP BY o.lang_code
            ORDER BY apps DESC
            """,
            (primary, primary),
        ).fetchall()
        return [dict(r) for r in rows]


def text_reference_health(db: Path) -> dict:
    """Find textResourceBindings that point to keys missing in primary lang."""
    with get_conn(db) as conn:
        # Total references and how many resolve in nb
        totals = conn.execute(
            """
            SELECT COUNT(*) AS total_refs,
                   COUNT(DISTINCT key_id) AS unique_keys,
                   COUNT(DISTINCT app_id) AS apps
            FROM text_references
            """
        ).fetchone()
        missing_in_nb = conn.execute(
            """
            SELECT COUNT(DISTINCT tr.app_id || ':' || tr.key_id) AS n
            FROM text_references tr
            LEFT JOIN text_keys tk
              ON tk.app_id = tr.app_id AND tk.lang_code = 'nb' AND tk.key_id = tr.key_id
            WHERE tk.key_id IS NULL
            """
        ).fetchone()
        unused_keys = conn.execute(
            """
            SELECT COUNT(DISTINCT tk.app_id || ':' || tk.key_id) AS n
            FROM text_keys tk
            LEFT JOIN text_references tr
              ON tr.app_id = tk.app_id AND tr.key_id = tk.key_id
            WHERE tk.lang_code = 'nb' AND tr.key_id IS NULL
            """
        ).fetchone()
        empty_translations = conn.execute(
            """
            SELECT lang_code, COUNT(*) AS empty_count
            FROM text_keys
            WHERE is_empty = 1
            GROUP BY lang_code
            ORDER BY empty_count DESC
            """
        ).fetchall()
        return {
            "total_references": totals["total_refs"],
            "unique_keys_referenced": totals["unique_keys"],
            "apps_with_refs": totals["apps"],
            "references_with_missing_nb_key": missing_in_nb["n"],
            "unused_nb_keys": unused_keys["n"],
            "empty_per_lang": [dict(r) for r in empty_translations],
        }


def dead_text_keys(db: Path, primary: str = "nb",
                    min_keys: int = 10, limit: int = 100) -> list[dict]:
    """Apps ranked by share of nb keys that are never referenced in any layout."""
    with get_conn(db) as conn:
        rows = conn.execute(
            """
            SELECT
                tk.app_id,
                a.org,
                COUNT(*) AS defined_keys,
                SUM(CASE WHEN tr.key_id IS NULL THEN 1 ELSE 0 END) AS unused_keys,
                COUNT(*) - SUM(CASE WHEN tr.key_id IS NULL THEN 1 ELSE 0 END) AS used_keys,
                ROUND(100.0 * SUM(CASE WHEN tr.key_id IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS unused_pct
            FROM text_keys tk
            JOIN apps a ON a.app_id = tk.app_id
            LEFT JOIN (
                SELECT DISTINCT app_id, key_id FROM text_references
            ) tr ON tr.app_id = tk.app_id AND tr.key_id = tk.key_id
            WHERE tk.lang_code = ?
            GROUP BY tk.app_id, a.org
            HAVING defined_keys >= ?
            ORDER BY unused_keys DESC
            LIMIT ?
            """,
            (primary, min_keys, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def dead_text_keys_for_app(db: Path, app_id: str, primary: str = "nb",
                            limit: int = 200) -> list[dict]:
    """List the actual key_ids defined but never referenced in this app."""
    with get_conn(db) as conn:
        rows = conn.execute(
            """
            SELECT tk.key_id, tk.is_empty
            FROM text_keys tk
            LEFT JOIN (
                SELECT DISTINCT app_id, key_id FROM text_references
            ) tr ON tr.app_id = tk.app_id AND tr.key_id = tk.key_id
            WHERE tk.app_id = ? AND tk.lang_code = ? AND tr.key_id IS NULL
            ORDER BY tk.key_id
            LIMIT ?
            """,
            (app_id, primary, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def language_coverage_by_app(db: Path, lang: str, primary: str = "nb",
                              min_keys: int = 10, limit: int = 100) -> list[dict]:
    """List apps with the worst coverage for a non-primary language."""
    with get_conn(db) as conn:
        rows = conn.execute(
            """
            SELECT a.app_id, a.org,
                   p.n AS primary_keys,
                   COALESCE(o.n, 0) AS lang_keys,
                   COALESCE(o.non_empty, 0) AS lang_non_empty,
                   ROUND(100.0 * COALESCE(o.n, 0) / NULLIF(p.n, 0), 1) AS coverage_pct
            FROM apps a
            JOIN (SELECT app_id, COUNT(*) AS n FROM text_keys
                  WHERE lang_code = ? GROUP BY app_id) p ON p.app_id = a.app_id
            LEFT JOIN (SELECT app_id, COUNT(*) AS n,
                              SUM(CASE WHEN is_empty = 0 THEN 1 ELSE 0 END) AS non_empty
                       FROM text_keys WHERE lang_code = ? GROUP BY app_id) o ON o.app_id = a.app_id
            WHERE p.n >= ?
            ORDER BY coverage_pct ASC, primary_keys DESC
            LIMIT ?
            """,
            (primary, lang, min_keys, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def process_apps(db: Path, min_tasks: int = 1, exact_tasks: int | None = None,
                  task_type: str | None = None, limit: int = 500) -> list[dict]:
    """List apps with BPMN task info, filtered by step count and/or task type."""
    where = []
    params: list = []
    if exact_tasks is not None:
        where.append("a.task_count = ?")
        params.append(exact_tasks)
    else:
        where.append("a.task_count >= ?")
        params.append(min_tasks)
    if task_type:
        where.append("EXISTS (SELECT 1 FROM bpmn_tasks bt WHERE bt.app_id = a.app_id "
                     "AND COALESCE(NULLIF(bt.altinn_task_type, ''), bt.bpmn_element) = ?)")
        params.append(task_type)
    params.append(limit)

    with get_conn(db) as conn:
        rows = conn.execute(
            f"""
            WITH ordered_tasks AS (
                SELECT app_id, COALESCE(NULLIF(altinn_task_type, ''), bpmn_element) AS t
                FROM bpmn_tasks
                ORDER BY app_id, order_in_process
            ),
            sequences AS (
                SELECT app_id, GROUP_CONCAT(t, ' → ') AS seq
                FROM ordered_tasks
                GROUP BY app_id
            )
            SELECT a.app_id, a.org, a.task_count, a.gateway_count,
                   a.journey_count, a.max_journey_length, a.complexity,
                   a.primary_journey, a.repo_url,
                   COALESCE(s.seq, '') AS task_sequence
            FROM apps a
            LEFT JOIN sequences s ON s.app_id = a.app_id
            WHERE {' AND '.join(where)}
            ORDER BY a.task_count DESC, a.app_id
            LIMIT ?
            """,
            params,
        ).fetchall()
        return [
            {
                "app_id": r["app_id"],
                "org": r["org"],
                "task_count": r["task_count"],
                "gateway_count": r["gateway_count"],
                "journey_count": r["journey_count"],
                "max_journey_length": r["max_journey_length"],
                "complexity": r["complexity"],
                "primary_journey": r["primary_journey"],
                "task_sequence": r["task_sequence"],
                "gitea_url": _gitea_web_url(r["repo_url"]),
            }
            for r in rows
        ]


def process_stats(db: Path) -> dict:
    with get_conn(db) as conn:
        per_count = [dict(r) for r in conn.execute(
            """SELECT task_count, COUNT(*) AS apps FROM apps
               GROUP BY task_count ORDER BY task_count"""
        ).fetchall()]
        per_type = [dict(r) for r in conn.execute(
            """SELECT COALESCE(NULLIF(altinn_task_type, ''), '(unspecified)') AS task_type,
                      COUNT(*) AS occurrences,
                      COUNT(DISTINCT app_id) AS apps_using
               FROM bpmn_tasks
               GROUP BY task_type
               ORDER BY occurrences DESC"""
        ).fetchall()]
        per_complexity = [dict(r) for r in conn.execute(
            """SELECT COALESCE(complexity, '(ukjent)') AS complexity, COUNT(*) AS apps
               FROM apps GROUP BY complexity ORDER BY apps DESC"""
        ).fetchall()]
        per_journey_length = [dict(r) for r in conn.execute(
            """SELECT max_journey_length AS length, COUNT(*) AS apps
               FROM apps WHERE journey_count > 0
               GROUP BY length ORDER BY length"""
        ).fetchall()]
        # Difference between BPMN tasks vs user-journey
        # — apps where journey is shorter than total task count have branches
        with_branches = conn.execute(
            """SELECT COUNT(*) FROM apps
               WHERE journey_count > 1
                  OR (gateway_count > 0 AND task_count > max_journey_length)"""
        ).fetchone()[0]
        return {
            "per_task_count": per_count,
            "per_task_type": per_type,
            "per_complexity": per_complexity,
            "per_journey_length": per_journey_length,
            "apps_with_branches": with_branches,
        }


def process_complexity_apps(db: Path, complexity: str, limit: int = 500) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT a.app_id, a.org, a.task_count, a.gateway_count,
                      a.journey_count, a.max_journey_length, a.complexity,
                      a.primary_journey, a.repo_url
               FROM apps a
               WHERE COALESCE(a.complexity, '(ukjent)') = ?
               ORDER BY a.task_count DESC, a.app_id
               LIMIT ?""",
            (complexity, limit),
        ).fetchall()
        return [
            {
                "app_id": r["app_id"], "org": r["org"],
                "task_count": r["task_count"], "gateway_count": r["gateway_count"],
                "journey_count": r["journey_count"],
                "max_journey_length": r["max_journey_length"],
                "complexity": r["complexity"],
                "primary_journey": r["primary_journey"],
                "gitea_url": _gitea_web_url(r["repo_url"]),
            }
            for r in rows
        ]


def search_apps(db: Path, q: str, limit: int = 100) -> list[dict]:
    """Simple LIKE search over app_id, repo_url, optionsId, component type."""
    like = f"%{q}%"
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT DISTINCT a.app_id, a.org, a.backend_version, a.page_count, a.component_count
               FROM apps a
               LEFT JOIN components c ON c.app_id = a.app_id
               WHERE a.app_id LIKE ? OR a.repo_url LIKE ?
                  OR c.options_id LIKE ? OR c.type LIKE ?
               ORDER BY a.app_id
               LIMIT ?""",
            (like, like, like, like, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def backend_versions(db: Path) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT COALESCE(NULLIF(backend_version, ''), '(unknown)') AS version,
                      COALESCE(NULLIF(backend_pkg, ''), '(unknown)') AS pkg,
                      COUNT(*) AS apps
               FROM apps
               GROUP BY pkg, version
               ORDER BY apps DESC"""
        ).fetchall()
        return [dict(r) for r in rows]


def frontend_versions(db: Path) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT COALESCE(NULLIF(frontend_version, ''), '(unknown)') AS version,
                      COUNT(*) AS apps
               FROM apps
               GROUP BY version
               ORDER BY apps DESC"""
        ).fetchall()
        return [dict(r) for r in rows]


def _gitea_web_url(repo_url: str | None) -> str:
    """Convert https://altinn.studio/repos/<org>/<app>.git → https://altinn.studio/repos/<org>/<app>."""
    if not repo_url:
        return ""
    url = repo_url
    # Strip any embedded credentials (defence in depth — scanner already does this)
    import re as _re
    url = _re.sub(r"://[^@/]+@", "://", url)
    url = url.removesuffix(".git")
    return url


def apps_by_backend_version(db: Path, version: str) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT app_id, org, app_name, backend_pkg, repo_url
               FROM apps WHERE COALESCE(NULLIF(backend_version, ''), '(unknown)') = ?
               ORDER BY app_id""",
            (version,),
        ).fetchall()
        return [
            {
                "app_id": r["app_id"],
                "org": r["org"],
                "app_name": r["app_name"],
                "backend_pkg": r["backend_pkg"],
                "gitea_url": _gitea_web_url(r["repo_url"]),
            }
            for r in rows
        ]


def apps_by_frontend_version(db: Path, version: str) -> list[dict]:
    with get_conn(db) as conn:
        rows = conn.execute(
            """SELECT app_id, org, app_name, backend_version, repo_url
               FROM apps WHERE COALESCE(NULLIF(frontend_version, ''), '(unknown)') = ?
               ORDER BY app_id""",
            (version,),
        ).fetchall()
        return [
            {
                "app_id": r["app_id"],
                "org": r["org"],
                "app_name": r["app_name"],
                "backend_version": r["backend_version"],
                "gitea_url": _gitea_web_url(r["repo_url"]),
            }
            for r in rows
        ]
