import React from 'react';
import { UnsupportedVersion } from './UnsupportedVersion';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';

describe('UnsupportedVersion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog', async () => {
    render();
    expect(
      await screen.findByRole('heading', {
        name: textMock('versions.unsupported_version'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(textMock('versions.unsupported_old_version')),
    ).toBeInTheDocument();
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<UnsupportedVersion />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.UIEditor}`,
    queries,
  });
};
