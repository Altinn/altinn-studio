import React from 'react';
import { screen } from '@testing-library/react';
import { AppSettings } from './AppSettings';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('AppSettings', () => {
  afterEach(jest.clearAllMocks);

  it('renders the settings heading', () => {
    renderAppSettings();
    expect(getHeading(textMock('app_settings.heading'), 2)).toBeInTheDocument();
  });
});

const getHeading = (name: string, level?: number): HTMLHeadingElement =>
  screen.getByRole('heading', {
    name,
    level,
  });

const renderAppSettings = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(queriesMock, queryClient)(<AppSettings />);
};
