import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { appUpgradeStatus, organization, repository } from 'app-shared/mocks/mocks';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { AppUpgradeStatus } from 'app-shared/types/AppUpgrade';
import type { Repository } from 'app-shared/types/Repository';
import { UpgradeNotice } from './UpgradeNotice';

const repo = {
  ...repository,
  full_name: 'ttd/my-app',
  name: 'my-app',
  owner: { ...repository.owner, login: 'ttd' },
  permissions: { ...repository.permissions, push: true },
};
const upgradeUrl = `${APP_DEVELOPMENT_BASENAME}/ttd/my-app/app-upgrade`;
const version = appUpgradeStatus.targetMajorVersion;

describe('UpgradeNotice', () => {
  it('renders nothing for apps that are not owned by an organization', () => {
    renderUpgradeNotice(appUpgradeStatus, []);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders nothing when the user cannot push to the repository', () => {
    renderUpgradeNotice(appUpgradeStatus, ['ttd'], {
      ...repo,
      permissions: { ...repo.permissions, push: false },
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders nothing for apps on versions the automatic upgrade does not support', () => {
    renderUpgradeNotice({ ...appUpgradeStatus, isAutomaticUpgradeSupported: false });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says that the app is upgraded when it is already on the target version', () => {
    renderUpgradeNotice({
      ...appUpgradeStatus,
      backendVersion: '9.0.0',
      isUpgradeAvailable: false,
      isAutomaticUpgradeSupported: false,
    });
    expect(screen.getByText(textMock('app_upgrade.notice_upgraded'))).toBeInTheDocument();
  });

  it('links to the upgrade page when an upgrade is available', () => {
    renderUpgradeNotice(appUpgradeStatus);
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.notice_available', { version }) }),
    ).toHaveAttribute('href', upgradeUrl);
  });

  it('links to the running upgrade when one is in progress', () => {
    renderUpgradeNotice({
      ...appUpgradeStatus,
      activeUpgradeBranch: 'upgrade/altinn-app-v9-20260914-061154',
    });
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.notice_in_progress', { version }) }),
    ).toHaveAttribute('href', upgradeUrl);
  });

  it('says that the upgrade is ready for testing when its pull request is open', () => {
    renderUpgradeNotice({
      ...appUpgradeStatus,
      activeUpgradeBranch: 'upgrade/altinn-app-v9-20260914-061154',
      activeUpgradeHasPullRequest: true,
    });
    expect(
      screen.getByRole('link', {
        name: textMock('app_upgrade.notice_ready_for_testing', { version }),
      }),
    ).toHaveAttribute('href', upgradeUrl);
  });
});

const renderUpgradeNotice = (
  status: AppUpgradeStatus,
  organizationNames: string[] = ['ttd'],
  repoToRender: Repository = repo,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppUpgradeStatus, 'ttd', 'my-app'], status);
  queryClient.setQueryData(
    [QueryKey.Organizations],
    organizationNames.map((username) => ({ ...organization, username })),
  );
  return renderWithProviders(<UpgradeNotice repo={repoToRender} />, { queryClient });
};
