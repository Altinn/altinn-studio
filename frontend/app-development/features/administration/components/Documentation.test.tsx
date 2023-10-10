import React from 'react';
import { screen } from '@testing-library/react';
import { Documentation } from './Documentation';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-development/test/mocks';

// Test data
const org = 'my-org';
const app = 'my-app';

describe('Documentation', () => {
  it('renders component', async () => {
    renderWithProviders(<Documentation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
      queries: {
        ...queriesMock,
      },
    });

    expect(
      screen.getByRole('heading', { name: textMock('administration.documentation.title') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('administration.documentation.content'))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('administration.documentation.link') }),
    ).toBeInTheDocument();
  });
});
