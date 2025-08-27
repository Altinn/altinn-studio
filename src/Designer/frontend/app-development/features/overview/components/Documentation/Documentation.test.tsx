import React from 'react';
import { screen } from '@testing-library/react';
import { Documentation } from './Documentation';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';

describe('Documentation', () => {
  it('renders component', async () => {
    renderWithProviders(<Documentation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    });

    expect(
      screen.getByRole('heading', { name: textMock('overview.documentation.title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('overview.documentation.link') }),
    ).toBeInTheDocument();
  });
});
