import { Route, Routes, useLocation } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { appUpgradeStatus, organization, repository } from 'app-shared/mocks/mocks';
import type { AppUpgradeStatus } from 'app-shared/types/AppUpgrade';
import { UpgradeNotice } from './UpgradeNotice';

const repo = {
  ...repository,
  full_name: 'ttd/my-app',
  name: 'my-app',
  owner: { ...repository.owner, login: 'ttd' },
};
const upgradePageText = 'upgrade page';

describe('UpgradeNotice', () => {
  it('renders nothing for apps that are not owned by an organization', () => {
    renderUpgradeNotice(appUpgradeStatus, []);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing when no upgrade is available', () => {
    renderUpgradeNotice({ ...appUpgradeStatus, isUpgradeAvailable: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('navigates to the upgrade page when an upgrade is available', async () => {
    const user = userEvent.setup();
    renderUpgradeNotice(appUpgradeStatus);
    await user.click(
      screen.getByRole('button', { name: textMock('app_upgrade.notice_available') }),
    );
    expect(screen.getByText(upgradePageText)).toBeInTheDocument();
  });

  it('links to the running upgrade when one is already in progress', async () => {
    const user = userEvent.setup();
    const branch = 'upgrade/altinn-app-v9-20260914-061154';
    renderUpgradeNotice({ ...appUpgradeStatus, activeUpgradeBranch: branch });
    await user.click(
      screen.getByRole('button', { name: textMock('app_upgrade.notice_in_progress') }),
    );
    expect(screen.getByText(upgradePageText)).toBeInTheDocument();
    expect(screen.getByText(`?branch=${encodeURIComponent(branch)}`)).toBeInTheDocument();
  });

  it('offers the report when the finished upgrade has an open pull request', () => {
    renderUpgradeNotice({
      ...appUpgradeStatus,
      activeUpgradeBranch: 'upgrade/altinn-app-v9-20260914-061154',
      activeUpgradeHasPullRequest: true,
    });
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.notice_view_report') }),
    ).toBeInTheDocument();
  });
});

const LocationSearch = () => {
  const { search } = useLocation();
  return <div>{search}</div>;
};

const renderUpgradeNotice = (status: AppUpgradeStatus, organizationNames: string[] = ['ttd']) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppUpgradeStatus, 'ttd', 'my-app'], status);
  queryClient.setQueryData(
    [QueryKey.Organizations],
    organizationNames.map((username) => ({ ...organization, username })),
  );
  return renderWithProviders(
    <Routes>
      <Route path='/:subroute/:selectedContext' element={<UpgradeNotice repo={repo} />} />
      <Route
        path='/:subroute/:selectedContext/:org/:app/upgrade'
        element={
          <div>
            {upgradePageText}
            <LocationSearch />
          </div>
        }
      />
    </Routes>,
    { queryClient, initialEntries: ['/app-dashboard/ttd'] },
  );
};
