import React from 'react';
import { screen } from '@testing-library/react';
import { Administration } from './Administration';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { queriesMock } from 'app-development/test/mocks';

// Test data
const org = 'org';
const app = 'app';
const title = 'test';

describe('Administration', () => {
  it('renders component', async () => {
    renderWithProviders(<Administration />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
      queries: {
        ...queriesMock,
        getAppConfig: jest.fn().mockImplementation(() =>
          Promise.resolve({
            serviceName: title,
          }),
        ),
      },
    });

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: app })).not.toBeInTheDocument();
  });

  it('shows repository name when loading app name', () => {
    renderWithProviders(<Administration />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    });

    expect(screen.getByRole('heading', { name: app })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: title })).not.toBeInTheDocument();
  });

  it('shows repository name if an error occured while fetching app name', () => {
    renderWithProviders(<Administration />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    });
    expect(screen.getByRole('heading', { name: app })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: title })).not.toBeInTheDocument();
  });
});
