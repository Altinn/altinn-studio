import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeployMoreOptionsMenu } from './DeployMoreOptionsMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import type { RunningApp } from 'app-shared/types/api/RunningApp';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const environment = 'tt02';
const linkToEnv = 'https://unit-test';
const restartableApp: RunningApp = {
  environment,
  version: '1',
  buildId: null,
  status: 'ready',
  restartedAt: null,
  canRestart: true,
};

describe('DeployMoreOptionsMenu', () => {
  it('should display two options, undeploy app and link to app', async () => {
    renderMenu();
    await openMenu();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);

    expect(
      screen.getByRole('button', { name: textMock('app_deployment.undeploy_button') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.more_options_menu'))).toBeInTheDocument();
  });

  it('should open list of list-items when menu trigger is clicked', async () => {
    renderMenu();
    await openMenu();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('should open dialog if undeploy is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await openMenu();

    await user.click(
      screen.getByRole('button', { name: textMock('app_deployment.undeploy_button') }),
    );

    expect(
      screen.getByRole('heading', {
        name: textMock('app_deployment.unpublish_consequence_dialog_title'),
      }),
    ).toBeInTheDocument();
  });

  it('should have a link to app within the env', async () => {
    renderMenu();
    await openMenu();

    const linkButton = screen.getByRole('link', {
      name: textMock('app_deployment.more_options_menu'),
    });
    expect(linkButton).toHaveAttribute('href', linkToEnv);
    expect(linkButton).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('offers a restart when the app can be restarted and the user may deploy to the environment', async () => {
    renderMenu({ runningApp: restartableApp, permissions: [environment] });
    await openMenu();

    expect(getRestartButton()).toBeInTheDocument();
  });

  it('closes the menu and asks for confirmation when the user chooses to restart', async () => {
    const user = userEvent.setup();
    renderMenu({ runningApp: restartableApp, permissions: [environment] });
    await openMenu();

    await user.click(getRestartButton());

    expect(
      screen.getByRole('heading', {
        name: textMock('app_deployment.restart_confirmation_dialog_title', { envTitle: 'TT02' }),
      }),
    ).toBeInTheDocument();
    expect(queryRestartButton()).not.toBeInTheDocument();
  });

  it('closes the menu when the user presses Escape', async () => {
    const user = userEvent.setup();
    renderMenu({ runningApp: restartableApp, permissions: [environment] });
    await openMenu();

    await user.keyboard('{Escape}');

    expect(queryRestartButton()).not.toBeInTheDocument();
  });

  it('closes the restart confirmation when the user cancels', async () => {
    const user = userEvent.setup();
    renderMenu({ runningApp: restartableApp, permissions: [environment] });
    await openMenu();
    await user.click(getRestartButton());

    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(
      screen.queryByRole('heading', {
        name: textMock('app_deployment.restart_confirmation_dialog_title', { envTitle: 'TT02' }),
      }),
    ).not.toBeInTheDocument();
  });

  it('does not let the user restart the app while it is updating', async () => {
    renderMenu({
      runningApp: { ...restartableApp, status: 'updating' },
      permissions: [environment],
    });
    await openMenu();

    expect(getRestartButton()).toBeDisabled();
  });

  it('does not offer a restart when another Studio environment deployed the app', async () => {
    renderMenu({
      runningApp: { ...restartableApp, canRestart: false },
      permissions: [environment],
    });
    await openMenu();

    expect(queryRestartButton()).not.toBeInTheDocument();
  });

  it('does not offer a restart when the user may not deploy to the environment', async () => {
    renderMenu({ runningApp: restartableApp, permissions: ['production'] });
    await openMenu();

    expect(queryRestartButton()).not.toBeInTheDocument();
  });
});

type RenderMenuOptions = {
  runningApp?: RunningApp;
  permissions?: string[];
};

function renderMenu({
  runningApp = { ...restartableApp, canRestart: false },
  permissions = [],
}: RenderMenuOptions = {}): void {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.DeployPermissions, org, app], permissions);
  renderWithProviders(
    <DeployMoreOptionsMenu
      linkToEnv={linkToEnv}
      environment={environment}
      envTitle='TT02'
      runningApp={runningApp}
    />,
    { queryClient, startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy` },
  );
}

async function openMenu(): Promise<void> {
  const user = userEvent.setup();
  return user.click(
    screen.getByRole('button', {
      name: textMock('app_deployment.deploy_more_options_menu_label'),
    }),
  );
}

const getRestartButton = () =>
  screen.getByRole('button', { name: textMock('app_deployment.restart_button') });

const queryRestartButton = () =>
  screen.queryByRole('button', { name: textMock('app_deployment.restart_button') });
