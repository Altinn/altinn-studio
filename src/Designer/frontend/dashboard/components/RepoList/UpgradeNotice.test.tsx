import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { appUpgradeStatus, repository } from 'app-shared/mocks/mocks';
import type { AppUpgradeStatus } from 'app-shared/types/AppUpgrade';
import { UpgradeNotice } from './UpgradeNotice';

const repo = { ...repository, full_name: 'ttd/my-app', name: 'my-app' };
const upgradePageText = 'upgrade page';

describe('UpgradeNotice', () => {
  it('renders nothing when no upgrade is available', () => {
    renderUpgradeNotice({ ...appUpgradeStatus, isUpgradeAvailable: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('navigates to the upgrade page when an upgrade is available', async () => {
    const user = userEvent.setup();
    renderUpgradeNotice(appUpgradeStatus);
    await user.click(
      screen.getByRole('button', { name: textMock('app_upgrade.notice_automatic_available') }),
    );
    expect(screen.getByText(upgradePageText)).toBeInTheDocument();
  });
});

const renderUpgradeNotice = (status: AppUpgradeStatus) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppUpgradeStatus, 'ttd', 'my-app'], status);
  return renderWithProviders(
    <Routes>
      <Route path='/:subroute/:selectedContext' element={<UpgradeNotice repo={repo} />} />
      <Route
        path='/:subroute/:selectedContext/:org/:app/upgrade'
        element={<div>{upgradePageText}</div>}
      />
    </Routes>,
    { queryClient, initialEntries: ['/app-dashboard/ttd'] },
  );
};
