import React from 'react';
import type { AppDeploymentActionsProps } from './AppDeploymentActions';
import { AppDeploymentActions } from './AppDeploymentActions';
import { act, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { appRelease } from 'app-shared/mocks/mocks';
import { BuildResult } from 'app-shared/types/Build';

const defaultProps: AppDeploymentActionsProps = {
  appDeployedVersion: 'test',
  lastBuildId: '',
  inProgress: false,
  envName: 'tt02',
  envType: 'test',
  orgName: 'test',
};

const created = '01.01.2024 18:53';

const appReleases: AppRelease[] = [
  {
    ...appRelease,
    tagName: 'test1',
    created,
    build: {
      ...appRelease.build,
      result: BuildResult.succeeded,
    },
  },
  {
    ...appRelease,
    tagName: 'test2',
    created,
    build: {
      ...appRelease.build,
      result: BuildResult.succeeded,
    },
  },
];

const imageOptions = [
  {
    label: `Version ${appReleases[0].tagName} (${created})`,
    value: appReleases[0].tagName,
  },
  {
    label: `Version ${appReleases[1].tagName} (${created})`,
    value: appReleases[1].tagName,
  },
];

const render = (
  props?: Partial<AppDeploymentActionsProps>,
  queries?: Partial<ServicesContextProps>,
) => {
  return renderWithMockStore(
    {},
    {
      getDeployPermissions: jest.fn().mockImplementation(() => Promise.resolve(['tt02'])),
      getAppReleases: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: appReleases,
        }),
      ),
      ...queries,
    },
  )(<AppDeploymentActions {...defaultProps} {...props} />);
};
describe('AppDeploymentActions', () => {
  it('renders a spinner while loading', () => {
    render();

    expect(screen.getByTitle(textMock('app_deployment.permission_checking'))).toBeInTheDocument();
  });

  it('should render missing rights message if deployPermission is false', async () => {
    render({ envName: 'production', envType: 'production' });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.permission_checking')),
    );
    expect(
      screen.getByText(
        textMock('app_deployment.missing_rights', {
          envTitle: textMock('general.production_environment_alt').toLowerCase(),
          orgName: defaultProps.orgName,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should render deploy dropdown if deployPermission is true', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.permission_checking')),
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.releases.loading')),
    );

    expect(screen.getByLabelText(textMock('app_deployment.choose_version'))).toBeInTheDocument();
  });

  it('should render error message if call to deployment endpoint fails', async () => {
    const user = userEvent.setup();

    const queries: Partial<ServicesContextProps> = {
      createDeployment: jest.fn().mockRejectedValue(new Error('test error')),
    };
    render({}, queries);
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.permission_checking')),
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.releases.loading')),
    );

    const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
    await act(() => user.click(select));

    const option = screen.getByRole('option', { name: imageOptions[0].label });
    await act(() => user.click(option));

    const deployButton = await screen.findByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await act(() => user.click(deployButton));

    const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
    await act(() => user.click(confirmButton));

    expect(
      await screen.findByText(textMock('app_deployment.technical_error_1')),
    ).toBeInTheDocument();
  });
});
