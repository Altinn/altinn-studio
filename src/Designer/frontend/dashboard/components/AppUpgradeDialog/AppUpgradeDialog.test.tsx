import { createRef } from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { appUpgradeStatus } from 'app-shared/mocks/mocks';
import type {
  AppUpgradePreparation,
  AppUpgradeResult,
  AppUpgradeStatus,
} from 'app-shared/types/AppUpgrade';
import { AppUpgradeDialog } from './AppUpgradeDialog';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const org = 'ttd';
const app = 'my-app';

describe('AppUpgradeDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('presents the automatic variant when the app has no custom code', async () => {
    await renderOpenDialog({});
    expect(
      screen.getByRole('heading', { name: textMock('app_upgrade.intro.title_automatic') }),
    ).toBeInTheDocument();
    expect(screen.getByText(app)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_upgrade.intro.feature_design_system')),
    ).toBeInTheDocument();
  });

  it('warns about manual work when the app has custom code', async () => {
    await renderOpenDialog({}, { ...appUpgradeStatus, hasCustomCode: true });
    expect(
      screen.getByRole('heading', { name: textMock('app_upgrade.intro.title') }),
    ).toBeInTheDocument();
    expect(screen.getByText(/app_upgrade\.intro\.description/)).toBeInTheDocument();
  });

  it('disables start when the app cannot be upgraded automatically', async () => {
    await renderOpenDialog({}, { ...appUpgradeStatus, isAutomaticUpgradeSupported: false });
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }),
    ).toBeDisabled();
  });

  it('prepares, upgrades and links to the pull request when the upgrade completes', async () => {
    const user = userEvent.setup();
    const prepareAppUpgrade = jest.fn().mockImplementation(() => Promise.resolve(readyPreparation));
    const upgradeApp = jest.fn().mockImplementation(() => Promise.resolve(completedResult));
    await renderOpenDialog({ prepareAppUpgrade, upgradeApp });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(prepareAppUpgrade).toHaveBeenCalledWith(org, app);
    expect(await screen.findByText(textMock('app_upgrade.done.completed'))).toBeInTheDocument();
    expect(upgradeApp).toHaveBeenCalledWith(org, app);
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.done.view_pull_request') }),
    ).toHaveAttribute('href', pullRequestUrl);
  });

  it('stops in the starting step when the app has unshared changes', async () => {
    const user = userEvent.setup();
    const prepareAppUpgrade = jest
      .fn()
      .mockImplementation(() => Promise.resolve(blockedPreparation));
    const upgradeApp = jest.fn();
    await renderOpenDialog({ prepareAppUpgrade, upgradeApp });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(
      await screen.findByText(textMock('app_upgrade.starting.local_changes')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: textMock('app_upgrade.starting.title') }),
    ).toBeInTheDocument();
    expect(upgradeApp).not.toHaveBeenCalled();
  });

  it('lists the manual tasks and offers the assistant when the upgrade is partial', async () => {
    const user = userEvent.setup();
    const upgradeApp = jest.fn().mockImplementation(() => Promise.resolve(partialResult));
    await renderOpenDialog({ upgradeApp });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(
      await screen.findByRole('heading', { name: textMock('app_upgrade.done.partial_title') }),
    ).toBeInTheDocument();
    expect(screen.getByText('Rewrite IProcessTaskStart by hand')).toBeInTheDocument();
    expect(screen.queryByText('Bumped packages')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.done.go_to_assistant') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.download_report') }),
    ).toBeInTheDocument();
  });
});

const readyPreparation: AppUpgradePreparation = { status: 'Ready', message: '' };
const blockedPreparation: AppUpgradePreparation = { status: 'LocalChangesBlocking', message: '' };
const pullRequestUrl = 'http://studio.localhost/repos/ttd/my-app/pulls/1';

const completedResult: AppUpgradeResult = {
  outcome: 'Completed',
  message: '',
  targetMajorVersion: 9,
  steps: [{ name: 'Project file', messages: [{ status: 'Ok', text: 'Bumped packages' }] }],
  manualTasks: [],
  branchName: 'upgrade/altinn-app-v9-20260903-120000',
  pullRequestUrl,
};

const partialResult: AppUpgradeResult = {
  ...completedResult,
  outcome: 'ManualStepsRequired',
  steps: [
    ...completedResult.steps,
    { name: 'C# API', messages: [{ status: 'Todo', text: 'Rewrite IProcessTaskStart by hand' }] },
  ],
  manualTasks: [{ step: 'C# API', status: 'Todo', text: 'Rewrite IProcessTaskStart by hand' }],
};

const renderOpenDialog = async (
  queries: Partial<ServicesContextProps>,
  status: AppUpgradeStatus = appUpgradeStatus,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppUpgradeStatus, org, app], status);
  const ref = createRef<HTMLDialogElement>();
  const view = renderWithProviders(<AppUpgradeDialog ref={ref} org={org} app={app} />, {
    queries,
    queryClient,
  });
  await act(async () => ref.current?.showModal());
  return view;
};
