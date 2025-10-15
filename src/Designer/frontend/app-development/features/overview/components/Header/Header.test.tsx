import React from 'react';
import { screen } from '@testing-library/react';
import { Header } from './Header';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { repository } from 'app-shared/mocks/mocks';

const mockServiceName = 'Test Application';

describe('Header', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the service name from appConfig', async () => {
    render({
      getAppConfig: jest.fn().mockImplementation(() =>
        Promise.resolve({
          serviceName: mockServiceName,
        }),
      ),
      getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
    });

    expect(await screen.findByRole('heading', { name: mockServiceName })).toBeInTheDocument();
  });

  it('renders the app name as fallback when serviceName is not available', async () => {
    render({
      getAppConfig: jest.fn().mockImplementation(() =>
        Promise.resolve({
          serviceName: undefined,
        }),
      ),
      getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
    });

    expect(await screen.findByRole('heading', { name: app })).toBeInTheDocument();
  });

  it('displays loading spinner while fetching app config', () => {
    render({
      getAppConfig: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
    });

    expect(screen.getByText(textMock('overview.header_loading'))).toBeInTheDocument();
  });

  it('renders the StarButton component', async () => {
    render({
      getAppConfig: jest.fn().mockImplementation(() =>
        Promise.resolve({
          serviceName: mockServiceName,
        }),
      ),
      getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(repository)),
      getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
    });

    await screen.findByRole('heading', { name: mockServiceName });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

const render = (queries = {}) => {
  return renderWithProviders(<Header />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};
