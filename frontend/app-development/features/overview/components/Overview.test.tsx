import React from 'react';
import { screen } from '@testing-library/react';
import { Overview } from './Overview';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';

// Test data
const org = 'org';
const app = 'app';
const title = 'test';

describe('Overview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('renders component', async () => {
    render({
      getAppConfig: jest.fn().mockImplementation(() =>
        Promise.resolve({
          serviceName: title,
        }),
      ),
    });

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: app })).not.toBeInTheDocument();
  });

  it('should display spinner while loading', () => {
    render();
    expect(screen.getByText(textMock('general.loading')));
  });

  it('should display error message if fetching goes wrong', async () => {
    render({
      getAppConfig: () => Promise.reject(),
      getOrgList: () => Promise.reject(),
    });
    expect(await screen.findByText(textMock('overview.fetch_title_error_message')));
  });

  it('should display AppLogs if environments exist', async () => {
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
    });
    expect(
      await screen.findByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
  });

  it('should not display AppLogs if environments do not exist', async () => {
    render();
    expect(
      screen.queryByRole('heading', { name: textMock('overview.activity') }),
    ).not.toBeInTheDocument();
  });
});

const render = (queries = {}) => {
  return renderWithProviders(<Overview />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};
