"""Read-only SQL execution for the ad-hoc query tool.

Safety relies on SQLite's `PRAGMA query_only = 1` which makes the connection
refuse any DML/DDL — INSERT, UPDATE, DELETE, ALTER, etc. The user can only
SELECT (and PRAGMA reads, common-table expressions).
"""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path

DEFAULT_ROW_LIMIT = 5000
HARD_ROW_LIMIT = 50000
QUERY_TIMEOUT_S = 30


def get_schema(db_path: Path) -> list[dict]:
    """Return tables + their columns + foreign-key relations + row counts."""
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        result = []
        for t in tables:
            tname = t["name"]
            cols_raw = conn.execute(f'PRAGMA table_info("{tname}")').fetchall()
            cols = [
                {
                    "name": c[1],
                    "type": c[2] or "TEXT",
                    "notnull": bool(c[3]),
                    "pk": bool(c[5]),
                }
                for c in cols_raw
            ]
            fks_raw = conn.execute(f'PRAGMA foreign_key_list("{tname}")').fetchall()
            fks = [{"from": f[3], "to_table": f[2], "to_col": f[4]} for f in fks_raw]
            try:
                row_count = conn.execute(f'SELECT COUNT(*) FROM "{tname}"').fetchone()[0]
            except sqlite3.OperationalError:
                row_count = None
            result.append({
                "name": tname,
                "columns": cols,
                "foreign_keys": fks,
                "row_count": row_count,
            })
    return result


def run_query(db_path: Path, sql: str, limit: int = DEFAULT_ROW_LIMIT) -> dict:
    """Execute a SELECT query in read-only mode. Returns columns + rows + meta."""
    limit = max(1, min(limit, HARD_ROW_LIMIT))
    sql_clean = sql.strip().rstrip(";")
    if not sql_clean:
        return {"error": "Empty query", "columns": [], "rows": [],
                "row_count": 0, "duration_ms": 0, "truncated": False}

    start = time.perf_counter()
    try:
        with sqlite3.connect(db_path, timeout=QUERY_TIMEOUT_S) as conn:
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA query_only = 1")
            cursor = conn.execute(sql_clean)
            cols = [d[0] for d in (cursor.description or [])]
            rows = cursor.fetchmany(limit + 1)
            truncated = len(rows) > limit
            if truncated:
                rows = rows[:limit]
            return {
                "columns": cols,
                "rows": [
                    [_serialize(r[c]) for c in cols] for r in rows
                ],
                "row_count": len(rows),
                "truncated": truncated,
                "duration_ms": round((time.perf_counter() - start) * 1000, 1),
            }
    except sqlite3.OperationalError as e:
        return {
            "error": f"SQL-feil: {e}",
            "columns": [], "rows": [], "row_count": 0, "truncated": False,
            "duration_ms": round((time.perf_counter() - start) * 1000, 1),
        }
    except sqlite3.DatabaseError as e:
        return {
            "error": f"DB-feil: {e}",
            "columns": [], "rows": [], "row_count": 0, "truncated": False,
            "duration_ms": round((time.perf_counter() - start) * 1000, 1),
        }


def _serialize(value):
    """Stringify bytes; passthrough everything else."""
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="replace")
        except Exception:
            return f"<{len(value)} bytes>"
    return value


# Curated examples shown in the UI. Each must be pure SELECT and educational.
SAMPLE_QUERIES = [
    {
        "title": "Mest brukte komponenter (topp 20)",
        "sql": (
            "SELECT type AS komponent,\n"
            "       COUNT(*) AS forekomster,\n"
            "       COUNT(DISTINCT app_id) AS apper\n"
            "FROM components\n"
            "GROUP BY type\n"
            "ORDER BY forekomster DESC\n"
            "LIMIT 20;"
        ),
    },
    {
        "title": "Apper med flest sider",
        "sql": (
            "SELECT app_id, page_count, component_count, backend_version\n"
            "FROM apps\n"
            "ORDER BY page_count DESC\n"
            "LIMIT 20;"
        ),
    },
    {
        "title": "Backend-versjons-fordeling",
        "sql": (
            "SELECT backend_version, COUNT(*) AS apper\n"
            "FROM apps\n"
            "WHERE backend_version IS NOT NULL\n"
            "GROUP BY backend_version\n"
            "ORDER BY apper DESC;"
        ),
    },
    {
        "title": "Apper som bruker en spesifikk optionsId",
        "sql": (
            "SELECT DISTINCT c.app_id, a.org\n"
            "FROM components c JOIN apps a ON a.app_id = c.app_id\n"
            "WHERE c.options_id = 'ASF_Land'\n"
            "ORDER BY c.app_id;"
        ),
    },
    {
        "title": "Komponenter med dynamic hidden-expression",
        "sql": (
            "SELECT type, COUNT(*) AS antall\n"
            "FROM components\n"
            "WHERE has_hidden_expr = 1\n"
            "GROUP BY type\n"
            "ORDER BY antall DESC;"
        ),
    },
    {
        "title": "Apper med flere prosesssteg + sekvens",
        "sql": (
            "WITH ordered AS (\n"
            "  SELECT app_id,\n"
            "         COALESCE(NULLIF(altinn_task_type,''), bpmn_element) AS t\n"
            "  FROM bpmn_tasks ORDER BY app_id, order_in_process\n"
            ")\n"
            "SELECT a.app_id, a.task_count, a.complexity,\n"
            "       (SELECT GROUP_CONCAT(t, ' -> ') FROM ordered WHERE app_id = a.app_id) AS sekvens\n"
            "FROM apps a\n"
            "WHERE a.task_count > 1\n"
            "ORDER BY a.task_count DESC\n"
            "LIMIT 50;"
        ),
    },
    {
        "title": "Layout-sett knyttet til flere tasks",
        "sql": (
            "SELECT app_id, layout_set,\n"
            "       COUNT(*)                    AS task_count,\n"
            "       GROUP_CONCAT(task_id, ', ') AS tasks\n"
            "FROM (SELECT app_id, layout_set, task_id\n"
            "      FROM layout_set_tasks\n"
            "      ORDER BY app_id, layout_set, task_id)\n"
            "GROUP BY app_id, layout_set\n"
            "HAVING COUNT(*) > 1\n"
            "ORDER BY task_count DESC, app_id, layout_set;"
        ),
    },
    {
        "title": "Døde tekstressurser per app (topp 20)",
        "sql": (
            "SELECT tk.app_id,\n"
            "       COUNT(*) AS unused_keys\n"
            "FROM text_keys tk\n"
            "LEFT JOIN (SELECT DISTINCT app_id, key_id FROM text_references) tr\n"
            "  ON tr.app_id = tk.app_id AND tr.key_id = tk.key_id\n"
            "WHERE tk.lang_code = 'nb' AND tr.key_id IS NULL\n"
            "GROUP BY tk.app_id\n"
            "ORDER BY unused_keys DESC\n"
            "LIMIT 20;"
        ),
    },
    {
        "title": "Per org: gjennomsnittlig kompleksitet",
        "sql": (
            "SELECT org,\n"
            "       COUNT(*) AS apps,\n"
            "       ROUND(AVG(component_count), 1) AS avg_komponenter,\n"
            "       ROUND(AVG(page_count), 1) AS avg_sider,\n"
            "       MAX(task_count) AS max_steg\n"
            "FROM apps\n"
            "GROUP BY org\n"
            "ORDER BY apps DESC;"
        ),
    },
]
