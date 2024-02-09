import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AppLogs } from './AppLogs';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { pipelineDeployment, deployEnvironment } from 'app-shared/mocks/mocks';

// Test data
const org = 'ttd';
const app = 'test-ttd';

const render = (queries = {}) => {
  return renderWithProviders(<AppLogs />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};

describe('AppLogs', () => {
  it('shows loading spinner when loading required data', () => {
    render();

    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('shows error message if an error occured while fetching required data', async () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.reject()),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByText(textMock('overview.app_logs_error'))).toBeInTheDocument();
  });

  it('shows list of deployments', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              ...pipelineDeployment,
              tagName: '2',
              envName: 'production',
            },
            {
              ...pipelineDeployment,
              tagName: '1',
              envName: 'tt02',
            },
          ],
        }),
      ),
      getEnvironments: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            ...deployEnvironment,
            name: 'production',
            type: 'production',
          },
          {
            ...deployEnvironment,
            name: 'tt02',
            type: 'test',
          },
        ]),
      ),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('overview.app_logs_title', {
          tagName: '2',
          environment: textMock('general.production_environment'),
          envName: 'PRODUCTION',
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('overview.app_logs_title', { tagName: '1', envName: 'TT02' })),
    ).toBeInTheDocument();
  });

  it('shows no activity message when deployments are empty', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              ...pipelineDeployment,
              build: {
                result: '',
              },
            },
          ],
        }),
      ),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.no_activity'))).toBeInTheDocument();
  });
});
