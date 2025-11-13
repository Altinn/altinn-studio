import { isAtLeastVersion } from 'src/utils/versioning/versionCompare';

export const MINIMUM_APPLICATION_VERSION_NAME = 'v8.0.0';
export const FEATURE_VERSION_MAP = {
  MINIMUM_APPLICATION_VERSION: '8.0.0.108',
  UNLOCKING_ON_PROCESS_NEXT_FAILURE: '8.1.0.115',
  INCREMENTAL_VALIDATION: '8.5.0.141',
  NEW_ATTACHMENTS_API: '8.5.0.153',
  PDF_PREVIEW_BUTTON: '8.5.0.157',
  APP_LANGUAGES_IN_ANONYMOUS: '8.5.6.180',
  SET_TAGS_ENDPOINT: '8.8.0.215',
} as const;

type AppFeature = keyof typeof FEATURE_VERSION_MAP;

function isFeatureSupported({
  feature,
  currentNugetVersion,
}: {
  feature: AppFeature;
  currentNugetVersion: string | undefined;
}) {
  if (JSON.parse('true')) {
    // TODO: Clean up backwards compatibility for v8. For now, we just assume every feature is supported in the monorepo
    return true;
  }

  if (!currentNugetVersion) {
    return false;
  }

  return isAtLeastVersion({ actualVersion: currentNugetVersion, minimumVersion: FEATURE_VERSION_MAP[feature] });
}

export function isMinimumApplicationVersion(currentNugetVersion: string | undefined) {
  return isFeatureSupported({ feature: 'MINIMUM_APPLICATION_VERSION', currentNugetVersion });
}

export function appSupportsPdfPreviewButton(currentNugetVersion: string | undefined) {
  return isFeatureSupported({ feature: 'PDF_PREVIEW_BUTTON', currentNugetVersion });
}

export function appSupportsFetchAppLanguagesInAnonymous(currentNugetVersion: string | undefined) {
  return isFeatureSupported({ feature: 'APP_LANGUAGES_IN_ANONYMOUS', currentNugetVersion });
}

export function appSupportsUnlockingOnProcessNextFailure(currentNugetVersion: string | undefined) {
  return isFeatureSupported({ feature: 'UNLOCKING_ON_PROCESS_NEXT_FAILURE', currentNugetVersion });
}

export function appSupportsNewAttachmentAPI(currentNugetVersion: string | undefined) {
  return isFeatureSupported({ feature: 'NEW_ATTACHMENTS_API', currentNugetVersion });
}

/**
 * TODO(Subform): Make sure we reference the correct version here, and in applicationMetadataMock
 *
 * Prior to app-lib version 8.5.0 there was no way of identifying validation messages that were not run incrementally (ITaskValidator),
 * this led to an edge case where if an ITaskValidator returned a validation message with a field, we could not
 * distinguish this from a regular custom backend validation which does runs incrementally. The problem is that we block
 * submit when we have custom backend validation errors until they are fixed, but since ITaskValidator is not run
 * incrementally it would never get fixed until the user refreshed the page. This issue was somewhat mitigated
 * by the old dataElement validation API which did not run ITaskValidators.
 *
 * Therefore, if this function returns false, this means that the app does not make this distinction, but
 * has the old API available, so this needs to be used for backwards compatibility.
 */
export function appSupportsIncrementalValidationFeatures(currentNugetVersion: string | undefined) {
  return isFeatureSupported({ feature: 'INCREMENTAL_VALIDATION', currentNugetVersion });
}

export function appSupportsSetTagsEndpoint(currentNugetVersion: string | undefined) {
  return isFeatureSupported({ feature: 'SET_TAGS_ENDPOINT', currentNugetVersion });
}
