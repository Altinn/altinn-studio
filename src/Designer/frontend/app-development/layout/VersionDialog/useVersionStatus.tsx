import { useFeatureFlag, FeatureFlag } from '@studio/feature-flags';
import {
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  MINIMUM_SUPPORTED_BACKEND_VERSION,
  MINIMUM_SUPPORTED_FRONTEND_VERSION,
  NEXT_V9_VERSION,
} from 'app-shared/constants';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';

export type VersionStatus = {
  isUnsupported: boolean;
  isOutdated: boolean;
  isFrontendOutdated: boolean;
  isBackendOutdated: boolean;
  maxFrontendVersion: number;
  maxBackendVersion: number;
};

export const useVersionStatus = (data?: AppVersion): VersionStatus | undefined => {
  const isNextV9 = useFeatureFlag(FeatureFlag.NextV9);
  if (!data) return undefined;

  const { minFrontend, maxFrontend, minBackend, maxBackend } = getVersionLimits(isNextV9);

  const isUnsupported =
    isBelowSupportedVersion(data.frontendVersion, minFrontend) ||
    isBelowSupportedVersion(data.backendVersion, minBackend);
  const isFrontendOutdated = isBelowSupportedVersion(data.frontendVersion, maxFrontend);
  const isBackendOutdated = isBelowSupportedVersion(data.backendVersion, maxBackend);

  return {
    isUnsupported,
    isOutdated: isFrontendOutdated || isBackendOutdated,
    isFrontendOutdated,
    isBackendOutdated,
    maxFrontendVersion: maxFrontend,
    maxBackendVersion: maxBackend,
  };
};

type VersionLimits = {
  minFrontend: number;
  minBackend: number;
  maxFrontend: number;
  maxBackend: number;
};

const getVersionLimits = (isNextV9: boolean): VersionLimits => ({
  minFrontend: MINIMUM_SUPPORTED_FRONTEND_VERSION,
  minBackend: MINIMUM_SUPPORTED_BACKEND_VERSION,
  maxFrontend: isNextV9 ? NEXT_V9_VERSION : MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  maxBackend: isNextV9 ? NEXT_V9_VERSION : MAXIMUM_SUPPORTED_BACKEND_VERSION,
});
