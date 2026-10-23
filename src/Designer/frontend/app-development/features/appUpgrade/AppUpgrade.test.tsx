import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import {
  appUpgradeResult,
  appUpgradeRun,
  appUpgradeStart,
  appUpgradeStatus,
  user as currentUser,
} from 'app-shared/mocks/mocks';
import type {
  AppUpgradeResult,
  AppUpgradeRun,
  AppUpgradeStatus,
} from 'app-shared/types/AppUpgrade';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { renderWithProviders } from '../../test/testUtils';
import AppUpgrade from './AppUpgrade';

const org = 'my-org';
const app = 'my-app';
const version = appUpgradeStatus.targetMajorVersion;
const branchName = 'upgrade/altinn-app-v9-20260907-120000';
const pullRequestUrl = 'http://studio.localhost/repos/my-org/my-app/pulls/1';

describe('AppUpgrade', () => {
  it('links back to the app', async () => {
    renderAppUpgrade();
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.back_to_app', { app }) }),
    ).toHaveAttribute('href', `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.Overview}`);
  });

  it('offers to upgrade an app on version 8', async () => {
    renderAppUpgrade();
    expect(
      await screen.findByRole('heading', {
        name: textMock('app_upgrade.intro.title', { version }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.intro.start', { version }) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.studioctl_link') }),
    ).toBeInTheDocument();
  });

  it('starts the upgrade and shows its progress', async () => {
    const user = userEvent.setup();
    const startAppUpgrade = vi.fn().mockResolvedValue(appUpgradeStart);
    renderAppUpgrade({
      startAppUpgrade,
      getAppUpgradeRun: () => Promise.resolve(running('Clone the app')),
    });

    await user.click(
      await screen.findByRole('button', { name: textMock('app_upgrade.intro.start', { version }) }),
    );

    expect(startAppUpgrade).toHaveBeenCalledWith(org, app);
    expect(
      await screen.findByRole('heading', {
        name: textMock('app_upgrade.progress.title', { version }),
      }),
    ).toBeInTheDocument();
  });

  it('shows the step the upgrade run is on', async () => {
    renderAppUpgrade({
      getAppUpgradeStatus: () => Promise.resolve(withActiveBranch()),
      getAppUpgradeRun: () => Promise.resolve(running('Save the changes')),
    });

    expect(
      await screen.findByText(textMock('app_upgrade.progress.step_count', { step: 3, count: 3 })),
    ).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent(
      textMock('app_upgrade.progress.step.save', { version }),
    );
  });

  it('says the upgrade is ready for testing when it completes', async () => {
    renderAppUpgrade({
      getAppUpgradeStatus: () => Promise.resolve(withActiveBranch()),
      getAppUpgradeRun: () => Promise.resolve(completed({ outcome: 'Completed' })),
    });

    expect(
      await screen.findByRole('heading', { name: textMock('app_upgrade.done.title', { version }) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.done.go_to_publish') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('app_upgrade.testing.view_changes') }),
    ).toHaveAttribute('href', pullRequestUrl);
  });

  it('checks out the upgrade branch before going to publishing', async () => {
    const user = userEvent.setup();
    const checkoutBranch = vi.fn().mockResolvedValue({});
    renderAppUpgrade({
      checkoutBranch,
      getAppUpgradeStatus: () => Promise.resolve(withActiveBranch()),
      getAppUpgradeRun: () => Promise.resolve(completed({ outcome: 'Completed' })),
    });

    await user.click(
      await screen.findByRole('button', { name: textMock('app_upgrade.done.go_to_publish') }),
    );

    expect(checkoutBranch).toHaveBeenCalledWith(org, app, branchName);
  });

  it('lists what must be fixed when the upgrade needs manual work', async () => {
    renderAppUpgrade({
      getAppUpgradeStatus: () => Promise.resolve(withActiveBranch()),
      getAppUpgradeRun: () =>
        Promise.resolve(
          completed({
            outcome: 'ManualStepsRequired',
            manualTasks: [{ step: 'Build', text: 'App.cs(1,1): error CS0246', status: 'Failed' }],
          }),
        ),
    });

    expect(
      await screen.findByRole('heading', {
        name: textMock('app_upgrade.done.manual_title', { version }),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Build: App.cs(1,1): error CS0246')).toBeInTheDocument();
  });

  it('offers to try again when the upgrade failed', async () => {
    renderAppUpgrade({
      getAppUpgradeStatus: () => Promise.resolve(withActiveBranch()),
      getAppUpgradeRun: () =>
        Promise.resolve(completed({ outcome: 'Failed', message: 'studioctl failed' })),
    });

    expect(
      await screen.findByRole('heading', { name: textMock('app_upgrade.done.failed_title') }),
    ).toBeInTheDocument();
    expect(screen.getByText('studioctl failed')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_upgrade.done.try_again') }),
    ).toBeInTheDocument();
  });

  it('says that the app is already upgraded', async () => {
    renderAppUpgrade({
      getAppUpgradeStatus: () =>
        Promise.resolve({
          ...appUpgradeStatus,
          backendVersion: '9.0.0',
          isUpgradeAvailable: false,
          isAutomaticUpgradeSupported: false,
        }),
    });

    expect(
      await screen.findByText(textMock('app_upgrade.upgraded', { version })),
    ).toBeInTheDocument();
  });

  it('explains when the app is not on a version the automatic upgrade supports', async () => {
    renderAppUpgrade({
      getAppUpgradeStatus: () =>
        Promise.resolve({ ...appUpgradeStatus, isAutomaticUpgradeSupported: false }),
    });

    expect(await screen.findByText(textMock('app_upgrade.unsupported'))).toBeInTheDocument();
  });

  it('explains that the upgrade is only for apps owned by an organization', async () => {
    renderAppUpgrade({ getUser: () => Promise.resolve({ ...currentUser, login: org }) });

    expect(await screen.findByText(textMock('app_upgrade.organization_only'))).toBeInTheDocument();
  });
});

const withActiveBranch = (): AppUpgradeStatus => ({
  ...appUpgradeStatus,
  activeUpgradeBranch: branchName,
});

const running = (currentStep: string): AppUpgradeRun => ({
  state: 'Running',
  runUrl: null,
  currentStep,
  result: null,
});

const completed = (result: Partial<AppUpgradeResult>): AppUpgradeRun => ({
  ...appUpgradeRun,
  result: { ...appUpgradeResult, branchName, pullRequestUrl, ...result },
});

const renderAppUpgrade = (queries: Partial<ServicesContextProps> = {}) =>
  renderWithProviders(<AppUpgrade />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.AppUpgrade}`,
    queries,
  });
