import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { appUpgradeStatus } from 'app-shared/mocks/mocks';
import type {
  AppUpgradeMergeResult,
  AppUpgradeResult,
  AppUpgradeRun,
  AppUpgradeStart,
  AppUpgradeStatus,
} from 'app-shared/types/AppUpgrade';
import { AppUpgradePage } from './AppUpgradePage';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const org = 'ttd';
const app = 'my-app';
const dashboardText = 'dashboard page';
const originalLocation = window.location;

describe('AppUpgradePage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: jest.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    jest.clearAllMocks();
  });

  it('shows breadcrumbs back to the dashboard and the automatic variant for apps without custom code', async () => {
    renderPage({});
    expect(
      screen.getByRole('heading', { name: textMock('app_upgrade.intro.title_automatic') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_dashboard') }),
    ).toHaveAttribute('href', '/app-dashboard/ttd');
    expect(screen.getByRole('link', { name: app })).toHaveAttribute(
      'href',
      `/editor/${org}/${app}/overview`,
    );
  });

  it('warns about manual work when the app has custom code', () => {
    renderPage({}, { ...appUpgradeStatus, hasCustomCode: true });
    expect(
      screen.getByRole('heading', { name: textMock('app_upgrade.intro.title') }),
    ).toBeInTheDocument();
  });

  it('disables start when the app cannot be upgraded automatically', () => {
    renderPage({}, { ...appUpgradeStatus, isAutomaticUpgradeSupported: false });
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }),
    ).toBeDisabled();
  });

  it('navigates back to the dashboard when cancelled', async () => {
    const user = userEvent.setup();
    renderPage({});
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));
    expect(screen.getByText(dashboardText)).toBeInTheDocument();
  });

  it('starts the workflow, polls the run and offers to merge and publish when it completes', async () => {
    const user = userEvent.setup();
    const startAppUpgrade = jest.fn().mockImplementation(() => Promise.resolve(started));
    const getAppUpgradeRun = jest.fn().mockImplementation(() => Promise.resolve(completedRun));
    const mergeAppUpgrade = jest.fn().mockImplementation(() => Promise.resolve(mergedResult));
    renderPage({ startAppUpgrade, getAppUpgradeRun, mergeAppUpgrade });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(startAppUpgrade).toHaveBeenCalledWith(org, app);
    expect(await screen.findByText(textMock('app_upgrade.done.completed'))).toBeInTheDocument();
    expect(getAppUpgradeRun).toHaveBeenCalledWith(org, app, started.branchName);
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.done.view_pull_request') }),
    ).toHaveAttribute('href', pullRequestUrl);

    await user.click(
      screen.getByRole('button', { name: textMock('app_upgrade.done.merge_and_publish') }),
    );

    expect(mergeAppUpgrade).toHaveBeenCalledWith(org, app, {
      pullRequestNumber: 1,
      branchName: completedResult.branchName,
    });
    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith(`/editor/${org}/${app}/deploy`),
    );
  });

  it('explains when the pull request could not be merged', async () => {
    const user = userEvent.setup();
    const getAppUpgradeRun = jest.fn().mockImplementation(() => Promise.resolve(completedRun));
    const mergeAppUpgrade = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...mergedResult, isMerged: false }));
    renderPage({ getAppUpgradeRun, mergeAppUpgrade });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));
    await user.click(
      await screen.findByRole('button', { name: textMock('app_upgrade.done.merge_and_publish') }),
    );

    expect(await screen.findByText(textMock('app_upgrade.done.merge_failed'))).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('shows the changed files in a collapsed diff view after a completed upgrade', async () => {
    const user = userEvent.setup();
    const getAppUpgradeRun = jest.fn().mockImplementation(() => Promise.resolve(completedRun));
    renderPage({ getAppUpgradeRun });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));
    await screen.findByText(textMock('app_upgrade.done.completed'));

    const summary = screen.getByText(
      textMock('app_upgrade.file_changes.summary', { count: completedResult.fileChanges.length }),
    );
    expect(screen.getByText('App.csproj')).not.toBeVisible();
    await user.click(summary);
    expect(screen.getByText('App.csproj')).toBeVisible();
    expect(screen.getByText(/Bumped packages/)).not.toBeVisible();
  });

  it('stops in the starting step when the upgrade branch could not be created', async () => {
    const user = userEvent.setup();
    const startAppUpgrade = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ ...started, status: 'Failed', branchName: null }),
      );
    const getAppUpgradeRun = jest.fn();
    renderPage({ startAppUpgrade, getAppUpgradeRun });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(await screen.findByText(textMock('app_upgrade.starting.failed'))).toBeInTheDocument();
    expect(getAppUpgradeRun).not.toHaveBeenCalled();
  });

  it('shows the queued state while waiting for a runner', async () => {
    const user = userEvent.setup();
    const getAppUpgradeRun = jest.fn().mockImplementation(() => Promise.resolve(queuedRun));
    renderPage({ getAppUpgradeRun });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(await screen.findByText(textMock('app_upgrade.upgrade.queued'))).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: textMock('app_upgrade.upgrade.view_run') }),
    ).not.toBeInTheDocument();
  });

  it('shows the active step and a link to the run while the workflow runs', async () => {
    const user = userEvent.setup();
    const getAppUpgradeRun = jest.fn().mockImplementation(() => Promise.resolve(runningRun));
    renderPage({ getAppUpgradeRun });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(
      await screen.findByText(
        textMock('app_upgrade.upgrade.running_step', { step: 'Install tools' }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.upgrade.view_run') }),
    ).toHaveAttribute('href', runUrl);
  });

  it('collapses the manual tasks and offers the assistant when the upgrade is partial', async () => {
    const user = userEvent.setup();
    const getAppUpgradeRun = jest
      .fn()
      .mockImplementation(() => Promise.resolve(runWith(partialResult)));
    renderPage({ getAppUpgradeRun });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(
      await screen.findByRole('heading', { name: textMock('app_upgrade.done.partial_title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.done.go_to_assistant') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('app_upgrade.done.merge_and_publish') }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Rewrite IProcessTaskStart by hand')).not.toBeVisible();
    await user.click(screen.getByText(textMock('app_upgrade.manual_tasks.summary', { count: 1 })));
    expect(screen.getByText('Rewrite IProcessTaskStart by hand')).toBeVisible();
  });

  it('shows the diff of the attempted changes when the upgrade fails', async () => {
    const user = userEvent.setup();
    const getAppUpgradeRun = jest
      .fn()
      .mockImplementation(() => Promise.resolve(runWith(failedResult)));
    renderPage({ getAppUpgradeRun });

    await user.click(screen.getByRole('button', { name: textMock('app_upgrade.intro.start') }));

    expect(
      await screen.findByRole('heading', { name: textMock('app_upgrade.done.failed_title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_upgrade.file_changes.summary', { count: 1 })),
    ).toBeInTheDocument();
  });
});

const pullRequestUrl = 'http://studio.localhost/repos/ttd/my-app/pulls/1';
const runUrl = 'http://studio.localhost/repos/ttd/my-app/actions/runs/7';
const started: AppUpgradeStart = {
  status: 'Started',
  message: '',
  branchName: 'upgrade/altinn-app-v9-20260903-120000',
};
const mergedResult: AppUpgradeMergeResult = { isMerged: true, message: '', baseBranch: 'main' };

const completedResult: AppUpgradeResult = {
  outcome: 'Completed',
  message: '',
  targetMajorVersion: 9,
  steps: [{ name: 'Project file', messages: [{ status: 'Ok', text: 'Bumped packages' }] }],
  manualTasks: [],
  fileChanges: [
    {
      path: 'App/App.csproj',
      kind: 'Modified',
      diff: '@@ -1 +1 @@\n-<Version>8.0.0</Version>\n+<Version>9.0.0</Version>',
    },
  ],
  branchName: 'upgrade/altinn-app-v9-20260903-120000',
  pullRequestUrl,
  pullRequestNumber: 1,
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

const failedResult: AppUpgradeResult = {
  ...completedResult,
  outcome: 'Failed',
  message: 'The upgrade failed.',
  branchName: null,
  pullRequestUrl: null,
  pullRequestNumber: null,
};

const runWith = (result: AppUpgradeResult): AppUpgradeRun => ({
  state: 'Completed',
  runUrl,
  currentStep: null,
  result,
});
const completedRun = runWith(completedResult);
const queuedRun: AppUpgradeRun = { state: 'Queued', runUrl: null, currentStep: null, result: null };
const runningRun: AppUpgradeRun = {
  state: 'Running',
  runUrl,
  currentStep: 'Install tools',
  result: null,
};

const renderPage = (
  queries: Partial<ServicesContextProps>,
  status: AppUpgradeStatus = appUpgradeStatus,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppUpgradeStatus, org, app], status);
  return renderWithProviders(
    <Routes>
      <Route path='/:subroute/:selectedContext' element={<div>{dashboardText}</div>} />
      <Route path='/:subroute/:selectedContext/:org/:app/upgrade' element={<AppUpgradePage />} />
    </Routes>,
    { queries, queryClient, initialEntries: [`/app-dashboard/${org}/${org}/${app}/upgrade`] },
  );
};
