import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { MockServicesContextWrapper, Services } from '../dashboardTestUtils';
import { mockUseTranslation } from '../../testing/mocks/i18nMock';

import { App } from './App';

jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation() }));

type RenderWithMockServicesProps = Services;
const renderWithMockServices = (services?: RenderWithMockServicesProps) => {
  render(
    <MockServicesContextWrapper
      customServices={{
        userService: {
          ...services?.userService,
        },
        organizationService: {
          ...services?.organizationService,
        },
      }}
    >
      <App />
    </MockServicesContextWrapper>
  );
};

test('should display spinner while loading', () => {
  renderWithMockServices();
  expect(screen.getByText(/dashboard.loading/)).toBeInTheDocument();
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
  await waitForElementToBeRemoved(screen.queryByText(/dashboard.loading/));
  expect(screen.getByRole('heading', { level: 2, name: /dashboard.favourites/i }));
  expect(screen.getByRole('heading', { level: 2, name: /dashboard.my_apps/i }));
  expect(screen.getByRole('heading', { level: 2, name: /dashboard.resources/i }));
});
