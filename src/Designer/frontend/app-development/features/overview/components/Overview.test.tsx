import { screen } from '@testing-library/react';
import Overview from './Overview';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { applicationMetadata, repository } from 'app-shared/mocks/mocks';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

// Test data
const title = 'test';
const appNameTextResource = 'appName text resource';

const orgListQuery = () => jest.fn().mockImplementation(() => Promise.resolve({ orgs: [org] }));

const appMetadataQueryWithTitle = () =>
  jest.fn().mockImplementation(() =>
    Promise.resolve({
      ...applicationMetadata,
      title: { nb: title },
    }),
  );

const appNameTextResourceQueries = () => ({
  getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(['nb'])),
  getTextResources: jest.fn().mockImplementation(() =>
    Promise.resolve({
      language: 'nb',
      resources: [{ id: 'appName', value: appNameTextResource }],
    }),
  ),
});

describe('Overview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('renders the app title from the application metadata', async () => {
    render({
      getOrgList: orgListQuery(),
      getAppMetadata: appMetadataQueryWithTitle(),
    });

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: app })).not.toBeInTheDocument();
  });

  it('prefers the app title over the appName text resource', async () => {
    render({
      getOrgList: orgListQuery(),
      getAppMetadata: appMetadataQueryWithTitle(),
      ...appNameTextResourceQueries(),
    });

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: appNameTextResource })).not.toBeInTheDocument();
  });

  it('falls back to the appName text resource when the app title is not set', async () => {
    render({
      getOrgList: orgListQuery(),
      ...appNameTextResourceQueries(),
    });

    expect(await screen.findByRole('heading', { name: appNameTextResource })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: app })).not.toBeInTheDocument();
  });

  it('falls back to the app name when neither the app title nor the appName text resource is set', async () => {
    render({
      getOrgList: orgListQuery(),
    });

    expect(await screen.findByRole('heading', { name: app })).toBeInTheDocument();
  });

  it('should display error message if fetching goes wrong', async () => {
    render({
      getAppMetadata: () => Promise.reject(createApiErrorMock()),
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
