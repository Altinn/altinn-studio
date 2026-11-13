import { describe, expect, it } from 'vitest';
import {
  appDailyMetricsDetailsPath,
  appDailyMetricsPath,
  platformAppDailyMetricsPath,
  resumeWorkflowPath,
  workflowCollectionsPath,
  workflowsListPath,
} from './apiPaths';

const org = 'ttd';
const env = 'at23';
const app = 'my-app';
const basePath = `/designer/api/v1/admin/workflows/${org}/${env}/${app}`;
const firstKey = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const secondKey = '8b1d4f2c-9e77-4a55-b0aa-1c2d3e4f5061';

describe('workflowCollectionsPath', () => {
  it('repeats the key parameter once per instance in annotate mode', () => {
    expect(workflowCollectionsPath(org, env, app, { keys: [firstKey, secondKey] })).toBe(
      `${basePath}/collections?key=${firstKey}&key=${secondKey}`,
    );
  });

  it('builds a cursor-paginated discovery request', () => {
    expect(
      workflowCollectionsPath(org, env, app, { failures: 'Any', cursor: 'abc', pageSize: 25 }),
    ).toBe(`${basePath}/collections?failures=Any&cursor=abc&pageSize=25`);
  });

  it('omits parameters that are not set', () => {
    expect(workflowCollectionsPath(org, env, app, { failures: 'Primary' })).toBe(
      `${basePath}/collections?failures=Primary`,
    );
    expect(workflowCollectionsPath(org, env, app)).toBe(`${basePath}/collections`);
  });
});

describe('workflowsListPath', () => {
  it('filters on the collection key', () => {
    expect(workflowsListPath(org, env, app, { collectionKey: firstKey })).toBe(
      `${basePath}/workflows?collectionKey=${firstKey}`,
    );
  });

  it('repeats the status parameter and passes the role', () => {
    expect(
      workflowsListPath(org, env, app, { statuses: ['Failed', 'Canceled'], role: 'Auxiliary' }),
    ).toBe(`${basePath}/workflows?status=Failed&status=Canceled&role=Auxiliary`);
  });
});

describe('workflow ops paths', () => {
  it('always asks resume to cascade when told to', () => {
    expect(resumeWorkflowPath(org, env, app, firstKey, true)).toBe(
      `${basePath}/workflows/${firstKey}/resume?cascade=true`,
    );
    expect(resumeWorkflowPath(org, env, app, firstKey, false)).toBe(
      `${basePath}/workflows/${firstKey}/resume?cascade=false`,
    );
  });
});

describe('appDailyMetricsPath', () => {
  it('asks for the period in days', () => {
    expect(appDailyMetricsPath(org, env, 30)).toBe(
      `/designer/api/v1/admin/app-daily-metrics/${org}/${env}?days=30`,
    );
    expect(appDailyMetricsDetailsPath(org, env, app, 7)).toBe(
      `/designer/api/v1/admin/app-daily-metrics/${org}/${env}/${app}?days=7`,
    );
  });
});

describe('platformAppDailyMetricsPath', () => {
  it('asks for the environment and the period', () => {
    expect(platformAppDailyMetricsPath('production', 30)).toBe(
      '/designer/api/v1/platform/app-daily-metrics?env=production&days=30',
    );
  });
});
