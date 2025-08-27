import React from 'react';
import type { DeployProps } from './Deploy';
import { Deploy } from './Deploy';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { appRelease } from 'app-shared/mocks/mocks';
import { BuildResult } from 'app-shared/types/Build';
import { type ImageOption } from '../ImageOption';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

const defaultProps: DeployProps = {
  appDeployedVersion: 'test',
  isDeploymentInProgress: false,
  envName: 'tt02',
  isProduction: false,
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

const imageOptions: ImageOption[] = [
  {
    label: textMock('app_deployment.version_label', {
      tagName: appReleases[0].tagName,
      createdDateTime: created,
    }),
    value: appReleases[0].tagName,
  },
  {
    label: textMock('app_deployment.version_label', {
      tagName: appReleases[1].tagName,
      createdDateTime: created,
    }),
    value: appReleases[1].tagName,
  },
];

const render = (props?: Partial<DeployProps>, queries?: Partial<ServicesContextProps>) => {
  return renderWithProviders({
    getDeployPermissions: jest.fn().mockImplementation(() => Promise.resolve(['tt02'])),
    getAppReleases: jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: appReleases,
      }),
    ),
    ...queries,
  })(<Deploy {...defaultProps} {...props} />);
};
describe('DeploymentActions', () => {
  it('renders a spinner while loading data', () => {
    render();

    expect(screen.getByTitle(textMock('app_deployment.permission_checking'))).toBeInTheDocument();
  });

  it('renders an error message if an error occurs while loading data', async () => {
    render(
      {},
      {
        getDeployPermissions: jest
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock())),
      },
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.permission_checking')),
    );

    expect(screen.getByText(textMock('app_deployment.permission_error'))).toBeInTheDocument();
  });

  it('should render missing rights message if deployPermission is false and environment is production', async () => {
    render({ envName: 'production', isProduction: true });
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

  it('should render missing rights message if deployPermission is false and environment is not production', async () => {
    const envName = 'at22';
    render({ envName, isProduction: false });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.permission_checking')),
    );
    expect(
      screen.getByText(
        textMock('app_deployment.missing_rights', {
          envTitle: `${textMock('general.test_environment_alt').toLowerCase()} ${envName?.toUpperCase()}`,
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
      screen.queryByTitle(textMock('app_deployment.releases_loading')),
    );

    expect(screen.getByLabelText(textMock('app_deployment.choose_version'))).toBeInTheDocument();
  });

  it('should render error message if call to deployment endpoint fails', async () => {
    const user = userEvent.setup();

    const queries: Partial<ServicesContextProps> = {
      createDeployment: jest.fn().mockRejectedValue(createApiErrorMock()),
    };
    render({}, queries);
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.permission_checking')),
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('app_deployment.releases_loading')),
    );

    const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
    await user.click(select);

    const option = screen.getByRole('option', { name: imageOptions[0].label });
    await user.click(option);

    const deployButton = await screen.findByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await user.click(deployButton);

    const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
    await user.click(confirmButton);

    expect(
      await screen.findByText(textMock('app_deployment.technical_error_1')),
    ).toBeInTheDocument();
  });
});
