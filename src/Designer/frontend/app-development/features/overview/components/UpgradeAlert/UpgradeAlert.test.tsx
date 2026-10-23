import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FeatureFlag } from '@studio/feature-flags';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { appUpgradeStatus, user } from 'app-shared/mocks/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { renderWithProviders } from '../../../../test/testUtils';
import { UpgradeAlert } from './UpgradeAlert';

const org = 'my-org';
const app = 'my-app';
const version = appUpgradeStatus.targetMajorVersion;

describe('UpgradeAlert', () => {
  it('links to the upgrade page when the app can be upgraded', async () => {
    renderUpgradeAlert();

    expect(
      await screen.findByRole('heading', {
        name: textMock('app_upgrade.intro.title', { version }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.overview.go_to_upgrade') }),
    ).toHaveAttribute('href', `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.AppUpgrade}`);
  });

  it('renders nothing without the feature flag', () => {
    renderUpgradeAlert({}, []);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders nothing when the automatic upgrade does not support the app', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], user);
    queryClient.setQueryData([QueryKey.AppUpgradeStatus, org, app], {
      ...appUpgradeStatus,
      isAutomaticUpgradeSupported: false,
    });
    renderUpgradeAlert({}, [FeatureFlag.AppUpgradeHelper], queryClient);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

const renderUpgradeAlert = (
  queries: Partial<ServicesContextProps> = {},
  featureFlags: FeatureFlag[] = [FeatureFlag.AppUpgradeHelper],
  queryClient?: QueryClient,
) =>
  renderWithProviders(<UpgradeAlert />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.Overview}`,
    queries,
    featureFlags,
    queryClient,
  });
