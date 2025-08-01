import React from 'react';
import { screen } from '@testing-library/react';
import { Overview } from './Overview';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { repository } from 'app-shared/mocks/mocks';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

// Test data
const title = 'test';

describe('Overview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('renders component', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() => Promise.resolve({ orgs: [org] })),
      getAppConfig: jest.fn().mockImplementation(() =>
        Promise.resolve({
          serviceName: {
            nb: title,
            nn: '',
            en: '',
          },
        }),
      ),
    });

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: app })).not.toBeInTheDocument();
  });

  it('should display error message if fetching goes wrong', async () => {
    render({
      getAppConfig: () => Promise.reject(createApiErrorMock()),
      getOrgList: () => Promise.reject(createApiErrorMock()),
    });
    expect(await screen.findByText(textMock('overview.fetch_title_error_message')));
  });

  it('should display DeploymentLogList if environments exist', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() =>
        Promise.resolve({
          orgs: {
            [org]: {
              environments: ['unit', 'test'],
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
    expect(
      await screen.findByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
  });

  it('should not display DeploymentLogList if environments do not exist for repo owned by org', async () => {
    render({
      getRepoMetadata: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...repository,
          owner: {
            ...repository.owner,
            login: org,
          },
        }),
      ),
      getOrgList: jest.fn().mockImplementation(() =>
        Promise.resolve({
          orgs: {
            [org]: {
              environments: [],
            },
          },
        }),
      ),
    });
    expect(await screen.findByText(textMock('app_deployment.no_env_title'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('overview.activity') }),
    ).not.toBeInTheDocument();
  });

  it('should display RepoOwnedByPersonInfo if repo is not owned by an org', async () => {
    render();
    expect(
      await screen.findByText(textMock('app_deployment.private_app_owner')),
    ).toBeInTheDocument();
  });
});

const render = (queries = {}) => {
  return renderWithProviders(<Overview />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};
