const BASE = '/api';

export type InterfaceRow = {
  name: string;
  namespace: string;
  assembly: string;
  area: string;
  group_name: string;
  implementable_by_apps: boolean;
  is_obsolete: boolean;
  obsolete_message: string;
  summary: string;
  member_count: number;
  apps_implementing: number;
  apps_registering: number;
  apps_injecting: number;
  apps_using: number;
  implementations: number;
  adoption_pct: number;
  implemented_pct: number;
};

export type InterfacesOverview = {
  catalog_total: number;
  implementable_total: number;
  obsolete_total: number;
  used_total: number;
  implemented_total: number;
  unused_total: number;
  implementable_used: number;
  implementable_unused: number;
  obsolete_in_use: number;
  outside_catalog_total: number;
  total_apps: number;
  apps_with_code: number;
  apps_implementing: number;
  adoption_buckets: Array<{ bucket: string; interfaces: number }>;
  by_area: Array<{ area: string; total: number; used: number; implemented: number }>;
  catalog: {
    generated_at: string;
    lib_version: string;
    commit: string;
    interface_count: number;
    base_class_count: number;
  };
};

export type InterfaceAppRow = {
  app_id: string;
  org: string;
  app_name: string;
  backend_version: string;
  frontend_version: string;
  usage_kinds: string[];
  class_names: string[];
  file_paths: string[];
  via: string[];
  gitea_url: string;
};

export type InterfaceDetail = {
  name: string;
  in_catalog: boolean;
  catalog: Partial<{
    name: string;
    full_name: string;
    namespace: string;
    assembly: string;
    area: string;
    group_name: string;
    implementable_by_apps: boolean;
    is_obsolete: boolean;
    obsolete_message: string;
    summary: string;
    members: string[];
    member_count: number;
    base_interfaces: string[];
    source_path: string;
  }>;
  total_apps: number;
  apps_implementing: number;
  apps_registering: number;
  apps_injecting: number;
  apps_using: number;
  implementations: number;
  adoption_pct: number;
  by_org: Array<{ org: string; apps: number }>;
  by_backend: Array<{ backend_version: string; apps: number }>;
  used_together_with: Array<{ name: string; apps: number }>;
  apps: InterfaceAppRow[];
  apps_truncated: boolean;
};

export type OutsideCatalogRow = {
  interface_name: string;
  apps_implementing: number;
  apps_using: number;
  sample_file: string;
  adoption_pct: number;
};

export type InterfaceAppUsageRow = {
  app_id: string;
  org: string;
  app_name: string;
  backend_version: string;
  cs_file_count: number;
  implemented_interface_count: number;
  app_interface_count: number;
  gitea_url: string;
};


async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return (await r.json()) as T;
}

export const api = {
  config: () => getJSON<{ env: string; data_dir: string; has_git_token: boolean }>('/config'),
  overview: () => getJSON<{ apps: number; orgs: number; last_scan: any }>('/overview'),
  componentsTop: (limit = 50) =>
    getJSON<Array<{ type: string; occurrences: number; apps_using: number }>>(
      `/stats/components/top?limit=${limit}`,
    ),
  componentsBottom: (limit = 50) =>
    getJSON<Array<{ type: string; occurrences: number; apps_using: number }>>(
      `/stats/components/bottom?limit=${limit}`,
    ),
  appsUsingComponent: (t: string) =>
    getJSON<
      Array<{
        app_id: string;
        org: string;
        app_name: string;
        backend_version: string;
        frontend_version: string;
        occurrences: number;
        gitea_url: string;
      }>
    >(`/stats/components/${encodeURIComponent(t)}/apps`),
  componentSummary: (t: string) =>
    getJSON<{
      type: string;
      total_occurrences: number;
      total_apps: number;
      total_apps_in_fleet: number;
      total_component_types: number;
      rank: number;
      avg_per_app: number;
      median_per_app: number;
      max_per_app: number;
      p90_per_app: number;
      histogram: Array<{ bucket: string; apps: number }>;
      top_apps: Array<{ app_id: string; occurrences: number; org: string }>;
      props_almost_always: Array<{ prop_key: string; occurrences: number; percentage: number }>;
      props_often: Array<{ prop_key: string; occurrences: number; percentage: number }>;
      props_sometimes: Array<{ prop_key: string; occurrences: number; percentage: number }>;
      props_rarely: Array<{ prop_key: string; occurrences: number; percentage: number }>;
      by_backend: Array<{ backend_version: string; apps: number; occurrences: number }>;
    }>(`/stats/components/${encodeURIComponent(t)}/summary`),
  propsForComponent: (t: string) =>
    getJSON<Array<{ prop_key: string; occurrences: number; apps_using: number }>>(
      `/stats/components/${encodeURIComponent(t)}/props`,
    ),
  allProps: (limit = 200) =>
    getJSON<Array<{ prop_key: string; occurrences: number; apps_using: number }>>(
      `/stats/props?limit=${limit}`,
    ),
  settings: (scope?: string) =>
    getJSON<Array<{ key_path: string; apps: number; scope?: string }>>(
      `/stats/settings${scope ? `?scope=${scope}` : ''}`,
    ),
  settingsKeys: (scope = 'layout_set', limit = 300) =>
    getJSON<
      Array<{
        key_path: string;
        apps: number;
        total_uses: number;
        value_kinds: string[];
        description: string | null;
        coverage_pct: number;
      }>
    >(`/stats/settings/keys?scope=${scope}&limit=${limit}`),
  settingsKeyDetail: (scope: string, key: string) =>
    getJSON<{
      scope: string;
      key_path: string;
      description: string | null;
      apps: number;
      total_uses: number;
      total_apps_in_fleet: number;
      coverage_pct: number;
      value_kinds: string[];
      by_kind: Array<{ value_kind: string; apps: number }>;
      apps_using: Array<{ app_id: string; org: string; backend_version: string }>;
    }>(
      `/stats/settings/key-detail?scope=${encodeURIComponent(scope)}&key=${encodeURIComponent(key)}`,
    ),
  languages: () =>
    getJSON<{
      per_lang: Array<{ lang_code: string; apps: number; avg_keys: number; avg_non_empty: number }>;
      per_app_count: Array<{ lang_count: number; apps: number }>;
      apps_without_languages: number;
    }>('/stats/languages'),
  languageCoverage: (primary = 'nb') =>
    getJSON<
      Array<{
        lang_code: string;
        apps: number;
        avg_coverage: number;
        avg_non_empty_coverage: number;
        total_missing: number;
      }>
    >(`/stats/languages/coverage?primary=${primary}`),
  languageCoverageByApp: (lang: string, primary = 'nb') =>
    getJSON<
      Array<{
        app_id: string;
        org: string;
        primary_keys: number;
        lang_keys: number;
        lang_non_empty: number;
        coverage_pct: number;
      }>
    >(`/stats/languages/coverage/${encodeURIComponent(lang)}/apps?primary=${primary}`),
  languageReferences: () =>
    getJSON<{
      total_references: number;
      unique_keys_referenced: number;
      apps_with_refs: number;
      references_with_missing_nb_key: number;
      unused_nb_keys: number;
      empty_per_lang: Array<{ lang_code: string; empty_count: number }>;
    }>('/stats/languages/references'),
  deadTextKeys: (minKeys = 10, limit = 100) =>
    getJSON<
      Array<{
        app_id: string;
        org: string;
        defined_keys: number;
        unused_keys: number;
        used_keys: number;
        unused_pct: number;
      }>
    >(`/stats/languages/dead-keys?min_keys=${minKeys}&limit=${limit}`),
  deadTextKeysForApp: (appId: string, limit = 200) =>
    getJSON<
      Array<{
        key_id: string;
        is_empty: number;
      }>
    >(`/stats/languages/dead-keys/${encodeURIComponent(appId)}?limit=${limit}`),
  process: () =>
    getJSON<{
      per_task_count: Array<{ task_count: number; apps: number }>;
      per_task_type: Array<{ task_type: string; occurrences: number; apps_using: number }>;
      per_complexity: Array<{ complexity: string; apps: number }>;
      per_journey_length: Array<{ length: number; apps: number }>;
      apps_with_branches: number;
    }>('/stats/process'),
  processApps: (
    opts: { minTasks?: number; exactTasks?: number; taskType?: string; limit?: number } = {},
  ) => {
    const p = new URLSearchParams();
    if (opts.minTasks != null) p.set('min_tasks', String(opts.minTasks));
    if (opts.exactTasks != null) p.set('exact_tasks', String(opts.exactTasks));
    if (opts.taskType) p.set('task_type', opts.taskType);
    if (opts.limit != null) p.set('limit', String(opts.limit));
    return getJSON<
      Array<{
        app_id: string;
        org: string;
        task_count: number;
        gateway_count: number;
        journey_count: number;
        max_journey_length: number;
        complexity: string;
        primary_journey: string;
        task_sequence: string;
        gitea_url: string;
      }>
    >(`/stats/process/apps?${p.toString()}`);
  },
  processComplexityApps: (complexity: string) =>
    getJSON<
      Array<{
        app_id: string;
        org: string;
        task_count: number;
        gateway_count: number;
        journey_count: number;
        max_journey_length: number;
        complexity: string;
        primary_journey: string;
        gitea_url: string;
      }>
    >(`/stats/process/complexity/${encodeURIComponent(complexity)}/apps`),
  backend: () => getJSON<Array<{ version: string; pkg: string; apps: number }>>('/stats/backend'),
  frontend: () => getJSON<Array<{ version: string; apps: number }>>('/stats/frontend'),
  appsForBackendVersion: (v: string) =>
    getJSON<
      Array<{
        app_id: string;
        org: string;
        app_name: string;
        backend_pkg: string;
        gitea_url: string;
      }>
    >(`/stats/backend/${encodeURIComponent(v)}/apps`),
  appsForFrontendVersion: (v: string) =>
    getJSON<
      Array<{
        app_id: string;
        org: string;
        app_name: string;
        backend_version: string;
        gitea_url: string;
      }>
    >(`/stats/frontend/${encodeURIComponent(v)}/apps`),
  search: (q: string) =>
    getJSON<
      Array<{
        app_id: string;
        org: string;
        backend_version: string;
        page_count: number;
        component_count: number;
      }>
    >(`/search?q=${encodeURIComponent(q)}`),
  interfacesOverview: () => getJSON<InterfacesOverview>('/stats/interfaces/overview'),
  interfaces: (
    opts: { area?: string; implementable?: boolean; usage?: string; q?: string; limit?: number } = {},
  ) => {
    const p = new URLSearchParams();
    if (opts.area) p.set('area', opts.area);
    if (opts.implementable != null) p.set('implementable', String(opts.implementable));
    if (opts.usage) p.set('usage', opts.usage);
    if (opts.q) p.set('q', opts.q);
    if (opts.limit != null) p.set('limit', String(opts.limit));
    const qs = p.toString();
    return getJSON<InterfaceRow[]>(`/stats/interfaces${qs ? `?${qs}` : ''}`);
  },
  interfaceDetail: (name: string) =>
    getJSON<InterfaceDetail>(`/stats/interfaces/${encodeURIComponent(name)}`),
  interfacesOutsideCatalog: (origin: 'unknown' | 'app' | 'dotnet' = 'unknown', limit = 100) =>
    getJSON<OutsideCatalogRow[]>(
      `/stats/interfaces/outside-catalog?origin=${origin}&limit=${limit}`,
    ),
  interfaceTopApps: (limit = 25) =>
    getJSON<InterfaceAppUsageRow[]>(`/stats/interfaces/top-apps?limit=${limit}`),
  querySchema: () =>
    getJSON<
      Array<{
        name: string;
        columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }>;
        foreign_keys: Array<{ from: string; to_table: string; to_col: string }>;
        row_count: number | null;
      }>
    >('/query/schema'),
  querySamples: () => getJSON<Array<{ title: string; sql: string }>>('/query/samples'),
  queryRun: async (sql: string, limit = 5000) => {
    const r = await fetch('/api/query/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, limit }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<{
      columns: string[];
      rows: any[][];
      row_count: number;
      truncated: boolean;
      duration_ms: number;
      error?: string;
    }>;
  },
  fleetSnapshot: () =>
    getJSON<Record<string, { total: number; ok: number; failed: number }>>('/fleet-snapshot'),
  testConnection: async (body: {
    target: 'altinn' | 'dev_altinn';
    git_username?: string;
    git_token?: string;
    dev_git_username?: string;
    dev_git_token?: string;
  }) => {
    const r = await fetch('/api/settings/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<{
      ok: boolean;
      status: number;
      message: string;
      url: string;
      username?: string;
      gitea_version?: string;
    }>;
  },
};

export type SSEEvent = {
  kind: 'info' | 'progress' | 'done' | 'error';
  message: string;
  current?: number;
  total?: number;
  app_id?: string;
};

export type OperationStatus = {
  running: boolean;
  kind: 'fetch' | 'scan' | null;
  history_size: number;
  started_at: number | null;
  finished_at: number | null;
  last_message: string;
};

export async function getOperationStatus(): Promise<OperationStatus> {
  const r = await fetch(`${BASE}/operation-status`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function startOperation(
  kind: 'fetch' | 'scan',
  opts: { force?: boolean } = {},
): Promise<void> {
  const qs = opts.force ? '?force=true' : '';
  const r = await fetch(`${BASE}/${kind}${qs}`, { method: 'POST' });
  if (r.status === 409) {
    // Operation already running — that's fine, just subscribe to events
    return;
  }
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Could not start ${kind}: HTTP ${r.status} ${txt}`);
  }
}

/** Subscribe to the operation event stream. Safe to call multiple times. */
export function subscribeToOperation(
  onEvent: (ev: SSEEvent) => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController();
  (async () => {
    try {
      const r = await fetch(`${BASE}/operation-events`, { signal: controller.signal });
      if (!r.ok || !r.body) {
        onError(new Error(`HTTP ${r.status}`));
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = raw.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') onError(e);
    }
  })();
  return () => controller.abort();
}
