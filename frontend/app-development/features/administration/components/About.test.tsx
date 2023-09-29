import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { About } from './About';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-development/test/mocks';

// Test data
const org = 'my-org';
const app = 'my-app';
const title = 'test';

describe('About', () => {
  it('shows spinner when loading required data', () => {
    renderWithProviders(<About />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    });
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: title })).not.toBeInTheDocument();
  });

  it('renders component', async () => {
    renderWithProviders(<About />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
      queries: {
        ...queriesMock,
        getAppMetadata: jest.fn().mockImplementation(() =>
          Promise.resolve({
            title: {
              nb: title,
            },
          }),
        ),
      },
    });

    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });
});
