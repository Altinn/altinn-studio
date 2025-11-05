import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { DeployPage } from './DeployPage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

describe('DeployPage', () => {
  it('renders a spinner while loading', () => {
    render();

    expect(screen.getByLabelText(textMock('app_deployment.loading'))).toBeInTheDocument();
  });

  it('renders an error message if an error occurs while loading data', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() => Promise.reject(createApiErrorMock())),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

    expect(screen.getByText(textMock('app_deployment.error'))).toBeInTheDocument();
  });

  it('renders no environments message if no org environments', async () => {
    render({
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { name: { nb: org }, environments: [] } } }),
        ),
      getDeployPermissions: jest.fn().mockImplementation(() => Promise.resolve([])),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

    expect(screen.getByText(textMock('app_deployment.no_env_title'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.no_env_1'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.no_env_2'))).toBeInTheDocument();
  });

  it('renders no team message if no permissions', async () => {
    const envName = 'tt02';
    render({
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { name: { nb: org }, environments: [envName] } } }),
        ),
      getDeployPermissions: jest.fn().mockImplementation(() => Promise.resolve([])),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

    expect(screen.getByText(textMock('app_deployment.no_team'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.no_team_info'))).toBeInTheDocument();
  });

  it('renders deploy page', async () => {
    const envName = 'tt02';
    render({
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { name: { nb: org }, environments: [envName] } } }),
        ),
      getDeployPermissions: jest.fn().mockImplementation(() => Promise.resolve([envName])),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

    expect(screen.getByText(textMock('app_release.release_title'))).toBeInTheDocument();
  });
});

const render = (queries?: Partial<ServicesContextProps>) => {
  return renderWithProviders(queries)(<DeployPage />);
};
