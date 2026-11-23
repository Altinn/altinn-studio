import { NEXT_V9_VERSION } from 'app-shared/constants';
import type { AppVersion } from 'app-shared/types/AppVersion';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';

/**
 * The builder is offered only for apps created from this time on, midnight in Norway. Older apps may
 * use features the builder cannot edit safely, so it is limited to new apps while it is tested.
 */
export const APP_BUILDER_MIN_CREATED_DATE = new Date('2026-11-23T00:00:00+01:00');

/** Whether the app is on v9 of both the app backend and the app frontend, and created recently. */
export function isAppBuilderSupported(
  version: AppVersion | undefined,
  metadata: ApplicationMetadata | undefined,
): boolean {
  return isV9(version) && isCreatedRecently(metadata?.created);
}

function isV9(version: AppVersion | undefined): boolean {
  return (
    !!version &&
    !isBelowSupportedVersion(version.backendVersion, NEXT_V9_VERSION) &&
    !isBelowSupportedVersion(version.frontendVersion, NEXT_V9_VERSION)
  );
}

function isCreatedRecently(created: string | undefined): boolean {
  if (!created) return false;
  const createdDate = new Date(created);
  return !Number.isNaN(createdDate.getTime()) && createdDate >= APP_BUILDER_MIN_CREATED_DATE;
}
