import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { MockServicesContextWrapper } from '../dashboardTestUtils';

import { App } from './App';
import { textMock } from '../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const renderWithMockServices = (services: Partial<ServicesContextProps> = {}) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <App />
    </MockServicesContextWrapper>,
  );
};

describe('App', () => {
  test('should display spinner while loading', () => {
    renderWithMockServices();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  test('should display error when failing to fetch current user', async () => {
    renderWithMockServices({ getUser: () => Promise.reject() });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Feil oppstod ved innlasting av brukerdata',
      }),
    ).toBeInTheDocument();
  });

  test('should display error when failing to fetch organizations', async () => {
    renderWithMockServices({ getOrganizations: () => Promise.reject() });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Feil oppstod ved innlasting av organisasjoner',
      }),
    );
  });

  test('should display dashboard page if successfully loading data', async () => {
    renderWithMockServices();
    await waitForElementToBeRemoved(screen.queryByText(textMock('general.loading')));
    expect(screen.getByRole('heading', { level: 2, name: textMock('dashboard.favourites') }));
    expect(screen.getByRole('heading', { level: 2, name: textMock('dashboard.my_apps') }));
    expect(screen.getByRole('heading', { level: 2, name: textMock('dashboard.resources') }));
  });
});
