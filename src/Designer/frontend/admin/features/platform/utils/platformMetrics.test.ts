import { describe, expect, it } from 'vitest';
import { platformAppRows, platformSummary, serviceOwnerRows } from './platformMetrics';
import { platformMetricsMock } from 'admin/features/platform/testing/platformMetricsMock';

describe('serviceOwnerRows', () => {
  it('sums each service owner and counts apps in use and without use', () => {
    const rows = serviceOwnerRows(platformMetricsMock);

    expect(rows).toEqual([
      {
        org: 'skd',
        appCount: 2,
        appsInUse: 1,
        appsWithoutUse: 1,
        instancesCreated: 4000,
        instancesCreatedPreviousPeriod: 3800,
        instancesCompleted: 3600,
      },
      {
        org: 'ttd',
        appCount: 1,
        appsInUse: 1,
        appsWithoutUse: 0,
        instancesCreated: 500,
        instancesCreatedPreviousPeriod: 600,
        instancesCompleted: 450,
      },
    ]);
  });
});

describe('platformAppRows', () => {
  it('lists every app with months without use counted against the 180-day limit', () => {
    const rows = platformAppRows(platformMetricsMock);

    expect(rows.map((row) => [row.org, row.app, row.noUseMonths])).toEqual([
      ['skd', 'mva-melding', 0],
      ['skd', 'gammel-pilot', 8],
      ['ttd', 'skjema-for-byggesoknad', 0],
    ]);
  });
});

describe('platformSummary', () => {
  it('sums the platform from the service owner rows', () => {
    expect(platformSummary(serviceOwnerRows(platformMetricsMock))).toEqual({
      serviceOwners: 2,
      serviceOwnersActive: 2,
      apps: 3,
      appsInUse: 2,
      instancesCreated: 4500,
      instancesCreatedPreviousPeriod: 4400,
      instancesCompleted: 4050,
      appsWithoutUse: 1,
    });
  });
});
