import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeployMoreOptionsMenu } from './DeployMoreOptionsMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('DeployMoreOptionsMenu', () => {
  const linkToEnv = 'https://unit-test';

  it('should display two options, undeploy app and link to app', async () => {
    renderMenu(linkToEnv);
    await openMenu();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);

    expect(
      screen.getByRole('button', { name: textMock('app_deployment.undeploy_button') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.more_options_menu'))).toBeInTheDocument();
  });

  it('should open list of list-items when menu trigger is clicked', async () => {
    renderMenu(linkToEnv);
    await openMenu();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('should open dialog if undeploy is clicked', async () => {
    renderMenu(linkToEnv);
    await openMenu();

    const undeployButton = screen.getByRole('button', {
      name: textMock('app_deployment.undeploy_button'),
    });
    expect(undeployButton).toBeInTheDocument();
  });

  it('should have a link to app within the env', async () => {
    renderMenu(linkToEnv);
    await openMenu();

    const linkButton = screen.getByRole('link', {
      name: textMock('app_deployment.more_options_menu'),
    });
    expect(linkButton).toHaveAttribute('href', linkToEnv);
    expect(linkButton).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

function renderMenu(linkToEnv: string): void {
  render(<DeployMoreOptionsMenu linkToEnv={linkToEnv} environment='unit-test-env' />);
}

async function openMenu(): Promise<void> {
  const user = userEvent.setup();
  return user.click(
    screen.getByRole('button', {
      name: textMock('app_deployment.deploy_more_options_menu_label'),
    }),
  );
}
