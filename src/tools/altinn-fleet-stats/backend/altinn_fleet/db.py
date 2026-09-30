import sqlite3
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS apps (
    app_id TEXT PRIMARY KEY,           -- "<org>-<env>-<app>" folder name
    org TEXT NOT NULL,
    env TEXT NOT NULL,
    app_name TEXT NOT NULL,            -- "<app>" without org prefix
    deployed_version TEXT,
    backend_pkg TEXT,                  -- Altinn.App.Api or Altinn.App.Api.Experimental
    backend_version TEXT,
    frontend_version TEXT,             -- altinn-app-frontend CDN version (e.g. "4", "4.24.0", "3")
    repo_url TEXT,
    content_hash TEXT,                 -- SHA256 of App/ tree, used for idempotent rescan
    layout_set_count INTEGER DEFAULT 0,
    task_count INTEGER DEFAULT 0,
    gateway_count INTEGER DEFAULT 0,
    journey_count INTEGER DEFAULT 0,
    min_journey_length INTEGER DEFAULT 0,
    max_journey_length INTEGER DEFAULT 0,
    complexity TEXT,
    primary_journey TEXT,
    page_count INTEGER DEFAULT 0,
    component_count INTEGER DEFAULT 0,
    language_count INTEGER DEFAULT 0,
    cs_file_count INTEGER DEFAULT 0,              -- C# files in the app's own code
    implemented_interface_count INTEGER DEFAULT 0, -- Altinn interfaces the app implements
    app_interface_count INTEGER DEFAULT 0,        -- interfaces the app declares itself
    scanned_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_apps_org ON apps(org);
CREATE INDEX IF NOT EXISTS idx_apps_backend ON apps(backend_version);

CREATE TABLE IF NOT EXISTS layouts (
    layout_id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    layout_set TEXT NOT NULL,
    page_name TEXT NOT NULL,
    in_pages_order INTEGER NOT NULL,   -- bool
    component_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_layouts_app ON layouts(app_id);

CREATE TABLE IF NOT EXISTS layout_set_tasks (
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    layout_set TEXT NOT NULL,
    task_id TEXT NOT NULL,              -- task id from layout-sets.json "tasks"
    PRIMARY KEY (app_id, layout_set, task_id)
);
CREATE INDEX IF NOT EXISTS idx_lst_app ON layout_set_tasks(app_id);

CREATE TABLE IF NOT EXISTS components (
    component_id INTEGER PRIMARY KEY AUTOINCREMENT,
    layout_id INTEGER NOT NULL REFERENCES layouts(layout_id) ON DELETE CASCADE,
    app_id TEXT NOT NULL,              -- denormalised for query speed
    type TEXT NOT NULL,
    component_uid TEXT,                -- the "id" field in JSON
    options_id TEXT,
    has_data_binding INTEGER DEFAULT 0,
    is_hidden_static INTEGER DEFAULT 0,
    has_hidden_expr INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 0,
    is_readonly INTEGER DEFAULT 0,
    raw_props TEXT                     -- JSON-encoded for ad-hoc queries
);
CREATE INDEX IF NOT EXISTS idx_components_type ON components(type);
CREATE INDEX IF NOT EXISTS idx_components_app ON components(app_id);
CREATE INDEX IF NOT EXISTS idx_components_optionsid ON components(options_id);

CREATE TABLE IF NOT EXISTS component_props (
    component_id INTEGER NOT NULL REFERENCES components(component_id) ON DELETE CASCADE,
    prop_key TEXT NOT NULL,
    value_kind TEXT NOT NULL,          -- literal | object | array | expression | null
    PRIMARY KEY (component_id, prop_key)
);
CREATE INDEX IF NOT EXISTS idx_props_key ON component_props(prop_key);

CREATE TABLE IF NOT EXISTS settings_keys (
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    scope TEXT NOT NULL,               -- layout_set | app | application_metadata
    key_path TEXT NOT NULL,
    value_kind TEXT NOT NULL,
    PRIMARY KEY (app_id, scope, key_path)
);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings_keys(key_path);

CREATE TABLE IF NOT EXISTS bpmn_tasks (
    bpmn_task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    bpmn_element TEXT NOT NULL,        -- task | userTask | serviceTask | ...
    altinn_task_type TEXT,             -- data | signing | confirmation | feedback | payment | ...
    order_in_process INTEGER
);
CREATE INDEX IF NOT EXISTS idx_bpmn_app ON bpmn_tasks(app_id);

CREATE TABLE IF NOT EXISTS languages (
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    lang_code TEXT NOT NULL,
    resource_file TEXT NOT NULL,
    key_count INTEGER DEFAULT 0,
    non_empty_count INTEGER DEFAULT 0,
    PRIMARY KEY (app_id, lang_code)
);
CREATE INDEX IF NOT EXISTS idx_languages_lang ON languages(lang_code);

CREATE TABLE IF NOT EXISTS text_keys (
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    lang_code TEXT NOT NULL,
    key_id TEXT NOT NULL,
    is_empty INTEGER DEFAULT 0,
    PRIMARY KEY (app_id, lang_code, key_id)
);
CREATE INDEX IF NOT EXISTS idx_text_keys_app ON text_keys(app_id);
CREATE INDEX IF NOT EXISTS idx_text_keys_key ON text_keys(key_id);

CREATE TABLE IF NOT EXISTS text_references (
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    key_id TEXT NOT NULL,
    binding_name TEXT NOT NULL,         -- "title" | "description" | "help" | ...
    component_id INTEGER REFERENCES components(component_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_textref_app ON text_references(app_id);
CREATE INDEX IF NOT EXISTS idx_textref_key ON text_references(key_id);

-- The public interfaces the Altinn.App libraries expose. Refreshed from the
-- bundled catalog on every scan, so it always describes the library version the
-- running image was built from.
CREATE TABLE IF NOT EXISTS interfaces (
    name TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    assembly TEXT NOT NULL,
    area TEXT NOT NULL,                -- Features | Internal | EFormidling | Fiks | ...
    group_name TEXT NOT NULL,          -- sub-namespace within the area
    implementable_by_apps INTEGER DEFAULT 0,
    is_obsolete INTEGER DEFAULT 0,
    obsolete_message TEXT,
    summary TEXT,
    members TEXT,                      -- JSON array of member signatures
    member_count INTEGER DEFAULT 0,
    base_interfaces TEXT,              -- JSON array
    source_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_interfaces_area ON interfaces(area);
CREATE INDEX IF NOT EXISTS idx_interfaces_implementable ON interfaces(implementable_by_apps);

CREATE TABLE IF NOT EXISTS app_interfaces (
    app_id TEXT NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    interface_name TEXT NOT NULL,
    usage_kind TEXT NOT NULL,          -- implements | registers | injects
    origin TEXT NOT NULL,              -- altinn | app | dotnet | unknown
    class_name TEXT,                   -- the app type implementing it, when known
    via TEXT,                          -- library base class the implementation came through
    file_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_app_interfaces_app ON app_interfaces(app_id);
CREATE INDEX IF NOT EXISTS idx_app_interfaces_name ON app_interfaces(interface_name);
CREATE INDEX IF NOT EXISTS idx_app_interfaces_kind ON app_interfaces(usage_kind, origin);

CREATE TABLE IF NOT EXISTS scan_runs (
    run_id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    apps_scanned INTEGER DEFAULT 0,
    apps_skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    status TEXT NOT NULL               -- running | done | failed
);
"""


def _migrate(conn: sqlite3.Connection) -> None:
    """Apply additive migrations for column changes the SCHEMA can't add itself
    (CREATE TABLE IF NOT EXISTS doesn't touch existing tables).
    """
    def column_exists(table: str, column: str) -> bool:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
        return any(r[1] == column for r in rows)

    additions = [
        ("languages", "key_count", "INTEGER DEFAULT 0"),
        ("languages", "non_empty_count", "INTEGER DEFAULT 0"),
        ("apps", "frontend_version", "TEXT"),
        ("apps", "gateway_count", "INTEGER DEFAULT 0"),
        ("apps", "journey_count", "INTEGER DEFAULT 0"),
        ("apps", "min_journey_length", "INTEGER DEFAULT 0"),
        ("apps", "max_journey_length", "INTEGER DEFAULT 0"),
        ("apps", "complexity", "TEXT"),
        ("apps", "primary_journey", "TEXT"),
        ("apps", "cs_file_count", "INTEGER DEFAULT 0"),
        ("apps", "implemented_interface_count", "INTEGER DEFAULT 0"),
        ("apps", "app_interface_count", "INTEGER DEFAULT 0"),
        ("app_interfaces", "via", "TEXT"),
    ]
    for table, column, decl in additions:
        try:
            if not column_exists(table, column):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")
        except sqlite3.OperationalError:
            # Table doesn't exist yet — first init will create it via SCHEMA
            pass


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")


@contextmanager
def get_conn(db_path: Path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
