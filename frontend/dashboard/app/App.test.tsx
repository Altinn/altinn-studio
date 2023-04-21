import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { MockServicesContextWrapper, Services } from '../dashboardTestUtils';

import { App } from './App';
import { textMock } from '../../testing/mocks/i18nMock';

type RenderWithMockServicesProps = Services;
const renderWithMockServices = (services?: RenderWithMockServicesProps) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <App />
    </MockServicesContextWrapper>
  );
};

describe('App', () => {

  test('should display spinner while loading', () => {
    renderWithMockServices();
    expect(screen.getAllByText(/dashboard.loading/)[0]).toBeInTheDocument();
  });

  test('should display error when failing to fetch current user', async () => {
    renderWithMockServices({
      userService: {
        getCurrentUser: () => Promise.reject(),
      },
    });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Feil oppstod ved innlasting av brukerdata',
      })
    ).toBeInTheDocument();
  });

  test('should display error when failing to fetch organizations', async () => {
    renderWithMockServices({
      organizationService: {
        getOrganizations: () => Promise.reject(),
      },
    });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Feil oppstod ved innlasting av organisasjoner',
      })
    );
  });

  test('should display dashboard page if successfully loading data', async () => {
    renderWithMockServices();
    await waitForElementToBeRemoved(screen.queryAllByText(textMock('dashboard.loading'))[0]);
    expect(screen.getByRole('heading', { level: 2, name: textMock('dashboard.favourites') }));
    expect(screen.getByRole('heading', { level: 2, name: textMock('dashboard.my_apps') }));
    expect(screen.getByRole('heading', { level: 2, name: textMock('dashboard.resources') }));
  });
});
