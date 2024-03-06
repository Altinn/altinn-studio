import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { App } from './App';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { repository } from 'app-shared/mocks/mocks';

// Test data
const org = 'org';
const app = 'app';

const render = (queries = {}) => {
  return renderWithProviders(<App />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};

describe('App', () => {
  it('shows loading spinner when loading required data', () => {
    render();

    expect(screen.getByText(textMock('overview.app_loading'))).toBeInTheDocument();
  });

  it('shows an error message if an error occurs while loading data', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() => Promise.reject()),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('overview.app_loading')));

    expect(screen.getByText(textMock('overview.app_error'))).toBeInTheDocument();
  });

  it('shows private repo message', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() =>
        Promise.resolve({
          orgs: {
            [org]: {},
          },
        }),
      ),
      getRepoMetadata: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...repository,
          owner: {
            ...repository.owner,
            login: 'private',
          },
        }),
      ),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('overview.app_loading')));

    expect(screen.getByText(textMock('app_deployment.private_app_owner'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.private_app_owner_info'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.private_app_owner_help'))).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_deployment.private_app_owner_options')),
    ).toBeInTheDocument();
  });

  it('shows no environments message', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() =>
        Promise.resolve({
          orgs: {
            [org]: {
              environments: [],
            },
          },
        }),
      ),
      getRepoMetadata: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...repository,
          owner: {
            ...repository.owner,
            login: org,
          },
        }),
      ),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('overview.app_loading')));

    expect(screen.getByText(textMock('app_deployment.no_env_title'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.no_env_1'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.no_env_2'))).toBeInTheDocument();
  });

  it('renders page', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() =>
        Promise.resolve({
          orgs: {
            [org]: {
              environments: ['tt02'],
            },
          },
        }),
      ),
      getRepoMetadata: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...repository,
          owner: {
            ...repository.owner,
            login: org,
          },
        }),
      ),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('overview.app_loading')));

    expect(screen.getByText(textMock('overview.activity'))).toBeInTheDocument();
  });
});
