import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { MaskinportenTab } from './MaskinportenTab';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';

describe('MaskinportenTab', () => {
  afterEach(jest.clearAllMocks);

  it('should display heading and description', () => {
    renderMaskinportenTab();

    const title = screen.getByRole('heading', {
      name: textMock('app_settings.maskinporten_tab_heading'),
      level: 3,
    });
    expect(title).toBeInTheDocument();

    const description = screen.getByText(textMock('app_settings.maskinporten_tab_description'));
    expect(description).toBeInTheDocument();
  });

  it('should show an alert with text that no scopes are available for user', async () => {
    const getMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));
    const getSelectedMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));

    renderMaskinportenTab({
      getMaskinportenScopes,
      getSelectedMaskinportenScopes,
    });

    await waitFor(() =>
      expect(
        screen.getByText(textMock('app_settings.maskinporten_no_scopes_available_description')),
      ).toBeInTheDocument(),
    );
  });
});

const renderMaskinportenTab = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient: QueryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<MaskinportenTab />);
};
