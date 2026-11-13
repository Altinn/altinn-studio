import type {
  PlatformAppDailyMetrics,
  ServiceOwnerAppDailyMetrics,
} from 'admin/features/platform/types/PlatformAppDailyMetrics';
import { noUseMonths } from 'admin/features/apps/utils/appDeviations';

/** On the platform pages an app counts as unused after 180 days, twice the service owner's limit. */
export const PLATFORM_NO_USE_LIMIT_DAYS = 180;
const ACTIVE_WITHIN_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type ServiceOwnerRow = {
  org: string;
  appCount: number;
  appsInUse: number;
  appsWithoutUse: number;
  instancesCreated: number;
  instancesCreatedPreviousPeriod: number;
  instancesCompleted: number;
};

export type PlatformAppRow = {
  org: string;
  app: string;
  instancesCreated: number;
  noUseMonths: number;
  lastInstanceCreatedOn: string | null;
};

const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MILLISECONDS_PER_DAY);

const isInUse = (lastInstanceCreatedOn: string | null, metricDate: string): boolean =>
  lastInstanceCreatedOn !== null &&
  daysBetween(lastInstanceCreatedOn, metricDate) <= ACTIVE_WITHIN_DAYS;

/** One row per service owner, with the owner's apps summed. */
export function serviceOwnerRows(metrics: PlatformAppDailyMetrics): ServiceOwnerRow[] {
  const metricDate = metrics.metricDate;
  return metrics.serviceOwners.map((owner) => ({
    org: owner.org,
    appCount: owner.apps.length,
    appsInUse: metricDate
      ? owner.apps.filter((app) => isInUse(app.lastInstanceCreatedOn, metricDate)).length
      : 0,
    appsWithoutUse: owner.apps.filter((app) => appNoUseMonths(owner, app.lastInstanceCreatedOn) > 0)
      .length,
    instancesCreated: owner.apps.reduce((total, app) => total + app.instancesCreated, 0),
    instancesCreatedPreviousPeriod: owner.apps.reduce(
      (total, app) => total + app.instancesCreatedPreviousPeriod,
      0,
    ),
    instancesCompleted: owner.apps.reduce((total, app) => total + app.instancesCompleted, 0),
  }));
}

/** One row per app across every service owner. */
export function platformAppRows(metrics: PlatformAppDailyMetrics): PlatformAppRow[] {
  return metrics.serviceOwners.flatMap((owner) =>
    owner.apps.map((app) => ({
      org: owner.org,
      app: app.app,
      instancesCreated: app.instancesCreated,
      noUseMonths: appNoUseMonths(owner, app.lastInstanceCreatedOn),
      lastInstanceCreatedOn: app.lastInstanceCreatedOn,
    })),
  );
}

/**
 * Months without a new instance, counted back from the service owner's own last stored day and
 * with the platform's 180-day limit.
 */
function appNoUseMonths(
  owner: ServiceOwnerAppDailyMetrics,
  lastInstanceCreatedOn: string | null,
): number {
  return noUseMonths(
    lastInstanceCreatedOn,
    owner.observedSince,
    owner.latestMetricDate,
    PLATFORM_NO_USE_LIMIT_DAYS,
  );
}

export type PlatformSummary = {
  serviceOwners: number;
  serviceOwnersActive: number;
  apps: number;
  appsInUse: number;
  instancesCreated: number;
  instancesCreatedPreviousPeriod: number;
  instancesCompleted: number;
  appsWithoutUse: number;
};

/** The platform as a whole, from the service owner rows. */
export function platformSummary(rows: ServiceOwnerRow[]): PlatformSummary {
  return {
    serviceOwners: rows.length,
    serviceOwnersActive: rows.filter((row) => row.appsInUse > 0).length,
    apps: rows.reduce((total, row) => total + row.appCount, 0),
    appsInUse: rows.reduce((total, row) => total + row.appsInUse, 0),
    instancesCreated: rows.reduce((total, row) => total + row.instancesCreated, 0),
    instancesCreatedPreviousPeriod: rows.reduce(
      (total, row) => total + row.instancesCreatedPreviousPeriod,
      0,
    ),
    instancesCompleted: rows.reduce((total, row) => total + row.instancesCompleted, 0),
    appsWithoutUse: rows.reduce((total, row) => total + row.appsWithoutUse, 0),
  };
}
