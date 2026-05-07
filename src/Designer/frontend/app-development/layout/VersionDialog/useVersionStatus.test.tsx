import {
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  NEXT_V9_VERSION,
} from 'app-shared/constants';
import { useVersionStatus } from './useVersionStatus';
import { type FeatureFlag } from '@studio/feature-flags';

const mockUseFeatureFlag = jest.fn();
jest.mock('@studio/feature-flags', () => ({
  ...jest.requireActual('@studio/feature-flags'),
  useFeatureFlag: (flag: FeatureFlag) => mockUseFeatureFlag(flag),
}));

describe('useVersionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct version status when NextV9 flag is disabled', () => {
    mockUseFeatureFlag.mockReturnValue(false);
    const versionStatus = useVersionStatus({
      frontendVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION.toString(),
      backendVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION.toString(),
    });

    expect(versionStatus).toEqual({
      isUnsupported: false,
      isOutdated: false,
      isFrontendOutdated: false,
      isBackendOutdated: false,
      maxFrontendVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
      maxBackendVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
    });
  });

  it('returns correct version status when NextV9 flag is enabled', () => {
    mockUseFeatureFlag.mockReturnValue(true);
    const versionStatus = useVersionStatus({
      frontendVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION.toString(),
      backendVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION.toString(),
    });

    expect(versionStatus).toEqual({
      isUnsupported: false,
      isOutdated: true,
      isFrontendOutdated: true,
      isBackendOutdated: true,
      maxFrontendVersion: NEXT_V9_VERSION,
      maxBackendVersion: NEXT_V9_VERSION,
    });
  });
});
