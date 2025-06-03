import React from 'react';
import { UnsupportedVersionAlert } from './UnsupportedVersionAlert';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';

describe('UnsupportedVersionAlert', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog', async () => {
    render();
    expect(
      await screen.findByRole('heading', {
        name: textMock('version_alerts.unsupported_version_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(textMock('version_alerts.unsupported_version_content')),
    ).toBeInTheDocument();
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<UnsupportedVersionAlert />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.UIEditor}`,
    queries,
  });
};
